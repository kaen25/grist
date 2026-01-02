use aes::cipher::{BlockDecryptMut, KeyIvInit, StreamCipher};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use hmac::{Hmac, Mac};
use rand::RngCore;
use sha1::{Digest, Sha1};
use sha2::Sha256;
use std::fs;
use std::path::{Path, PathBuf};

type Aes256CbcDec = cbc::Decryptor<aes::Aes256>;
type Aes256Ctr = ctr::Ctr128BE<aes::Aes256>;
type HmacSha1 = Hmac<Sha1>;
type HmacSha256 = Hmac<Sha256>;

const OPENSSH_BCRYPT_ROUNDS: u32 = 16;

#[derive(Debug)]
pub enum KeyError {
    IoError(String),
    ParseError(String),
    DecryptionFailed(String),
    InvalidPassphrase,
}

impl std::fmt::Display for KeyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            KeyError::IoError(msg) => write!(f, "IO error: {}", msg),
            KeyError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            KeyError::DecryptionFailed(msg) => write!(f, "Decryption failed: {}", msg),
            KeyError::InvalidPassphrase => write!(f, "Invalid passphrase"),
        }
    }
}

/// Parsed PPK file structure
#[derive(Debug)]
struct PpkFile {
    version: u8,
    algorithm: String,
    encryption: String,
    comment: String,
    public_blob: Vec<u8>,
    private_blob: Vec<u8>,
    mac: Vec<u8>,
    // V3 specific fields
    key_derivation: Option<String>,
    argon2_memory: Option<u32>,
    argon2_passes: Option<u32>,
    argon2_parallelism: Option<u32>,
    argon2_salt: Option<Vec<u8>>,
}

/// Detect if a file is a PuTTY PPK file
pub fn is_ppk_file(path: &Path) -> bool {
    if let Some(ext) = path.extension() {
        if ext.to_string_lossy().to_lowercase() == "ppk" {
            return true;
        }
    }

    if let Ok(content) = fs::read_to_string(path) {
        return content.starts_with("PuTTY-User-Key-File-");
    }

    false
}

/// Detect if a key file is encrypted
pub fn is_key_encrypted(path: &Path) -> Result<bool, KeyError> {
    let content = fs::read_to_string(path)
        .map_err(|e| KeyError::IoError(e.to_string()))?;

    if content.starts_with("PuTTY-User-Key-File-") {
        return Ok(content.contains("Encryption: aes256-cbc") ||
                  content.contains("Encryption: aes256-ctr"));
    }

    // OpenSSH new format: decode base64 and check cipher field
    if content.contains("-----BEGIN OPENSSH PRIVATE KEY-----") {
        // Extract base64 content
        let b64_content: String = content
            .lines()
            .filter(|line| !line.starts_with("-----"))
            .collect();

        if let Ok(decoded) = BASE64.decode(&b64_content) {
            // Check for openssh-key-v1 magic
            if decoded.starts_with(b"openssh-key-v1\0") {
                // Skip magic (15 bytes), then read cipher string
                let mut offset = 15;
                if let Ok(cipher) = read_ssh_string(&decoded, &mut offset) {
                    // If cipher is not "none", key is encrypted
                    return Ok(cipher != b"none");
                }
            }
        }
        return Ok(false);
    }

    // Legacy PEM format
    if content.contains("ENCRYPTED") {
        return Ok(true);
    }

    Ok(false)
}

/// Get key type information
pub fn get_key_info(path: &Path) -> Result<KeyInfo, KeyError> {
    let content = fs::read_to_string(path)
        .map_err(|e| KeyError::IoError(e.to_string()))?;

    let format = if content.starts_with("PuTTY-User-Key-File-") {
        KeyFormat::Ppk
    } else if content.contains("-----BEGIN OPENSSH PRIVATE KEY-----") {
        KeyFormat::OpenSsh
    } else if content.contains("-----BEGIN RSA PRIVATE KEY-----")
        || content.contains("-----BEGIN EC PRIVATE KEY-----")
        || content.contains("-----BEGIN DSA PRIVATE KEY-----")
    {
        KeyFormat::Pem
    } else {
        KeyFormat::Unknown
    };

    let encrypted = is_key_encrypted(path)?;

    Ok(KeyInfo {
        path: path.to_path_buf(),
        format,
        encrypted,
    })
}

#[derive(Debug, Clone, serde::Serialize)]
pub enum KeyFormat {
    Ppk,
    OpenSsh,
    Pem,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PpkVersion {
    V2,
    V3,
    Unknown,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct KeyInfo {
    pub path: PathBuf,
    pub format: KeyFormat,
    pub encrypted: bool,
}

/// Detect PPK version
pub fn get_ppk_version(path: &Path) -> PpkVersion {
    if let Ok(content) = fs::read_to_string(path) {
        if content.starts_with("PuTTY-User-Key-File-3:") {
            return PpkVersion::V3;
        } else if content.starts_with("PuTTY-User-Key-File-2:") {
            return PpkVersion::V2;
        }
    }
    PpkVersion::Unknown
}

/// Parse a PPK file (supports v2 and v3)
fn parse_ppk(content: &str) -> Result<PpkFile, KeyError> {
    let mut lines = content.lines().peekable();

    // Parse header: PuTTY-User-Key-File-N: algorithm
    let header = lines.next().ok_or_else(|| KeyError::ParseError("Empty file".to_string()))?;
    let (version, algorithm) = if let Some(rest) = header.strip_prefix("PuTTY-User-Key-File-") {
        let parts: Vec<&str> = rest.splitn(2, ": ").collect();
        if parts.len() != 2 {
            return Err(KeyError::ParseError("Invalid header format".to_string()));
        }
        let ver = parts[0].parse::<u8>()
            .map_err(|_| KeyError::ParseError("Invalid version".to_string()))?;
        (ver, parts[1].to_string())
    } else {
        return Err(KeyError::ParseError("Not a PPK file".to_string()));
    };

    if version != 2 && version != 3 {
        return Err(KeyError::ParseError(format!("Unsupported PPK version: {}", version)));
    }

    // Parse remaining lines as key-value pairs
    let mut encryption = String::new();
    let mut comment = String::new();
    let mut public_lines = 0usize;
    let mut private_lines = 0usize;
    let mut key_derivation = None;
    let mut argon2_memory = None;
    let mut argon2_passes = None;
    let mut argon2_parallelism = None;
    let mut argon2_salt = None;

    // Read headers until Public-Lines
    while let Some(line) = lines.next() {
        if let Some(enc) = line.strip_prefix("Encryption: ") {
            encryption = enc.to_string();
        } else if let Some(c) = line.strip_prefix("Comment: ") {
            comment = c.to_string();
        } else if let Some(kd) = line.strip_prefix("Key-Derivation: ") {
            key_derivation = Some(kd.to_string());
        } else if let Some(m) = line.strip_prefix("Argon2-Memory: ") {
            argon2_memory = Some(m.parse().map_err(|_| KeyError::ParseError("Invalid Argon2-Memory".to_string()))?);
        } else if let Some(p) = line.strip_prefix("Argon2-Passes: ") {
            argon2_passes = Some(p.parse().map_err(|_| KeyError::ParseError("Invalid Argon2-Passes".to_string()))?);
        } else if let Some(p) = line.strip_prefix("Argon2-Parallelism: ") {
            argon2_parallelism = Some(p.parse().map_err(|_| KeyError::ParseError("Invalid Argon2-Parallelism".to_string()))?);
        } else if let Some(s) = line.strip_prefix("Argon2-Salt: ") {
            argon2_salt = Some(hex_decode(s)?);
        } else if let Some(n) = line.strip_prefix("Public-Lines: ") {
            public_lines = n.parse().map_err(|_| KeyError::ParseError("Invalid Public-Lines".to_string()))?;
            break;
        }
    }

    // Read public key data
    let mut public_b64 = String::new();
    for _ in 0..public_lines {
        if let Some(line) = lines.next() {
            public_b64.push_str(line);
        }
    }
    let public_blob = BASE64.decode(&public_b64)
        .map_err(|e| KeyError::ParseError(format!("Invalid public key base64: {}", e)))?;

    // Read Private-Lines count
    let priv_lines_str = lines.next().ok_or_else(|| KeyError::ParseError("Missing Private-Lines".to_string()))?;
    if let Some(n) = priv_lines_str.strip_prefix("Private-Lines: ") {
        private_lines = n.parse().map_err(|_| KeyError::ParseError("Invalid Private-Lines".to_string()))?;
    }

    // Read private key data
    let mut private_b64 = String::new();
    for _ in 0..private_lines {
        if let Some(line) = lines.next() {
            private_b64.push_str(line);
        }
    }
    let private_blob = BASE64.decode(&private_b64)
        .map_err(|e| KeyError::ParseError(format!("Invalid private key base64: {}", e)))?;

    // Read MAC
    let mac_line = lines.next().ok_or_else(|| KeyError::ParseError("Missing Private-MAC".to_string()))?;
    let mac = if let Some(mac_hex) = mac_line.strip_prefix("Private-MAC: ") {
        hex_decode(mac_hex)?
    } else {
        return Err(KeyError::ParseError("Invalid MAC line".to_string()));
    };

    Ok(PpkFile {
        version,
        algorithm,
        encryption,
        comment,
        public_blob,
        private_blob,
        mac,
        key_derivation,
        argon2_memory,
        argon2_passes,
        argon2_parallelism,
        argon2_salt,
    })
}

fn hex_decode(s: &str) -> Result<Vec<u8>, KeyError> {
    let mut result = Vec::new();
    let chars: Vec<char> = s.chars().collect();
    for i in (0..chars.len()).step_by(2) {
        if i + 1 >= chars.len() {
            return Err(KeyError::ParseError("Invalid hex string".to_string()));
        }
        let byte = u8::from_str_radix(&format!("{}{}", chars[i], chars[i+1]), 16)
            .map_err(|_| KeyError::ParseError("Invalid hex".to_string()))?;
        result.push(byte);
    }
    Ok(result)
}

/// Derive encryption key from passphrase (PPK v2)
fn derive_key_v2(passphrase: &str) -> (Vec<u8>, Vec<u8>) {
    // PPK v2 key derivation:
    // key = SHA1(0x00000000 || passphrase) || SHA1(0x00000001 || passphrase)
    // First 32 bytes = AES key, no separate IV (uses zero IV)

    let mut key_material = Vec::new();

    for seq in 0u32..2 {
        let mut hasher = Sha1::new();
        hasher.update(seq.to_be_bytes());
        hasher.update(passphrase.as_bytes());
        key_material.extend_from_slice(&hasher.finalize());
    }

    let aes_key = key_material[..32].to_vec();
    let iv = vec![0u8; 16]; // Zero IV for PPK v2

    (aes_key, iv)
}

/// Derive encryption key from passphrase (PPK v3 with Argon2)
fn derive_key_v3(
    passphrase: &str,
    salt: &[u8],
    memory: u32,
    passes: u32,
    parallelism: u32,
    key_derivation: &str,
) -> Result<(Vec<u8>, Vec<u8>, Vec<u8>), KeyError> {
    // PPK v3 uses Argon2 to derive:
    // - 32 bytes for AES key
    // - 16 bytes for IV
    // - 32 bytes for MAC key
    // Total: 80 bytes

    let algorithm = match key_derivation {
        "Argon2id" => argon2::Algorithm::Argon2id,
        "Argon2i" => argon2::Algorithm::Argon2i,
        "Argon2d" => argon2::Algorithm::Argon2d,
        _ => return Err(KeyError::ParseError(format!("Unknown key derivation: {}", key_derivation))),
    };

    let params = argon2::Params::new(memory, passes, parallelism, Some(80))
        .map_err(|e| KeyError::DecryptionFailed(format!("Invalid Argon2 params: {}", e)))?;

    let argon2 = Argon2::new(algorithm, argon2::Version::V0x13, params);

    let mut output = vec![0u8; 80];
    argon2.hash_password_into(passphrase.as_bytes(), salt, &mut output)
        .map_err(|e| KeyError::DecryptionFailed(format!("Argon2 failed: {}", e)))?;

    let aes_key = output[0..32].to_vec();
    let iv = output[32..48].to_vec();
    let mac_key = output[48..80].to_vec();

    Ok((aes_key, iv, mac_key))
}

/// Decrypt private blob using AES-256-CBC (V2)
fn decrypt_private_blob_v2(encrypted: &[u8], passphrase: &str) -> Result<Vec<u8>, KeyError> {
    let (key, iv) = derive_key_v2(passphrase);
    decrypt_aes256_cbc(encrypted, &key, &iv)
}

/// Decrypt private blob using AES-256-CBC (V3)
fn decrypt_private_blob_v3(
    encrypted: &[u8],
    passphrase: &str,
    ppk: &PpkFile,
) -> Result<(Vec<u8>, Vec<u8>), KeyError> {
    let salt = ppk.argon2_salt.as_ref()
        .ok_or_else(|| KeyError::ParseError("Missing Argon2 salt".to_string()))?;
    let memory = ppk.argon2_memory
        .ok_or_else(|| KeyError::ParseError("Missing Argon2 memory".to_string()))?;
    let passes = ppk.argon2_passes
        .ok_or_else(|| KeyError::ParseError("Missing Argon2 passes".to_string()))?;
    let parallelism = ppk.argon2_parallelism
        .ok_or_else(|| KeyError::ParseError("Missing Argon2 parallelism".to_string()))?;
    let key_derivation = ppk.key_derivation.as_ref()
        .ok_or_else(|| KeyError::ParseError("Missing key derivation".to_string()))?;

    let (aes_key, iv, mac_key) = derive_key_v3(passphrase, salt, memory, passes, parallelism, key_derivation)?;
    let decrypted = decrypt_aes256_cbc(encrypted, &aes_key, &iv)?;

    Ok((decrypted, mac_key))
}

/// Common AES-256-CBC decryption
fn decrypt_aes256_cbc(encrypted: &[u8], key: &[u8], iv: &[u8]) -> Result<Vec<u8>, KeyError> {
    let mut buffer = encrypted.to_vec();

    // Ensure buffer length is multiple of block size
    if buffer.len() % 16 != 0 {
        return Err(KeyError::DecryptionFailed("Invalid ciphertext length".to_string()));
    }

    let decryptor = Aes256CbcDec::new_from_slices(key, iv)
        .map_err(|e| KeyError::DecryptionFailed(format!("Cipher init failed: {}", e)))?;

    decryptor.decrypt_padded_mut::<aes::cipher::block_padding::NoPadding>(&mut buffer)
        .map_err(|e| KeyError::DecryptionFailed(format!("Decryption failed: {}", e)))?;

    Ok(buffer)
}

/// Compute MAC for verification (PPK v2)
fn compute_mac_v2(ppk: &PpkFile, private_decrypted: &[u8], passphrase: &str) -> Vec<u8> {
    // MAC key derivation: SHA1("putty-private-key-file-mac-key" || passphrase)
    let mut mac_key_hasher = Sha1::new();
    mac_key_hasher.update(b"putty-private-key-file-mac-key");
    if !passphrase.is_empty() {
        mac_key_hasher.update(passphrase.as_bytes());
    }
    let mac_key = mac_key_hasher.finalize();

    // Data to MAC: algorithm || encryption || comment || public_blob || private_blob
    let mut data = Vec::new();

    // String format: length (4 bytes BE) + content
    fn add_string(data: &mut Vec<u8>, s: &str) {
        data.extend_from_slice(&(s.len() as u32).to_be_bytes());
        data.extend_from_slice(s.as_bytes());
    }

    fn add_blob(data: &mut Vec<u8>, blob: &[u8]) {
        data.extend_from_slice(&(blob.len() as u32).to_be_bytes());
        data.extend_from_slice(blob);
    }

    add_string(&mut data, &ppk.algorithm);
    add_string(&mut data, &ppk.encryption);
    add_string(&mut data, &ppk.comment);
    add_blob(&mut data, &ppk.public_blob);
    add_blob(&mut data, private_decrypted);

    let mut mac = HmacSha1::new_from_slice(&mac_key).expect("HMAC can take key of any size");
    mac.update(&data);
    mac.finalize().into_bytes().to_vec()
}

/// Compute MAC for verification (PPK v3) - uses HMAC-SHA256
fn compute_mac_v3(ppk: &PpkFile, private_decrypted: &[u8], mac_key: &[u8]) -> Vec<u8> {
    // Data to MAC: algorithm || encryption || comment || public_blob || private_blob
    let mut data = Vec::new();

    fn add_string(data: &mut Vec<u8>, s: &str) {
        data.extend_from_slice(&(s.len() as u32).to_be_bytes());
        data.extend_from_slice(s.as_bytes());
    }

    fn add_blob(data: &mut Vec<u8>, blob: &[u8]) {
        data.extend_from_slice(&(blob.len() as u32).to_be_bytes());
        data.extend_from_slice(blob);
    }

    add_string(&mut data, &ppk.algorithm);
    add_string(&mut data, &ppk.encryption);
    add_string(&mut data, &ppk.comment);
    add_blob(&mut data, &ppk.public_blob);
    add_blob(&mut data, private_decrypted);

    let mut mac = HmacSha256::new_from_slice(mac_key).expect("HMAC can take key of any size");
    mac.update(&data);
    mac.finalize().into_bytes().to_vec()
}

/// Convert PPK private key to OpenSSH format
fn to_openssh_format(ppk: &PpkFile, private_decrypted: &[u8], passphrase: Option<&str>) -> Result<String, KeyError> {
    // Build the private section based on key type
    let (public_section, private_section_unpadded) = if ppk.algorithm == "ssh-rsa" {
        build_rsa_sections(&ppk.public_blob, private_decrypted, &ppk.comment)?
    } else if ppk.algorithm == "ssh-ed25519" {
        build_ed25519_sections(&ppk.public_blob, private_decrypted, &ppk.comment)?
    } else if ppk.algorithm.starts_with("ecdsa-") {
        build_ecdsa_sections(&ppk.algorithm, &ppk.public_blob, private_decrypted, &ppk.comment)?
    } else {
        return Err(KeyError::ParseError(format!("Unsupported algorithm: {}", ppk.algorithm)));
    };

    // Build final OpenSSH key structure
    build_openssh_key(&public_section, &private_section_unpadded, passphrase)
}

/// Build the final OpenSSH key with optional encryption
fn build_openssh_key(public_section: &[u8], private_section_unpadded: &[u8], passphrase: Option<&str>) -> Result<String, KeyError> {
    let mut output = Vec::new();
    output.extend_from_slice(b"openssh-key-v1\0");

    // Determine block size based on encryption
    let block_size = if passphrase.is_some() { 16 } else { 8 };

    // Add padding to private section
    let mut private_section = private_section_unpadded.to_vec();
    let padding_len = (block_size - (private_section.len() % block_size)) % block_size;
    for i in 1..=padding_len {
        private_section.push(i as u8);
    }

    if let Some(pass) = passphrase {
        if !pass.is_empty() {
            // Encrypted key
            let mut salt = [0u8; 16];
            rand::thread_rng().fill_bytes(&mut salt);

            // Derive key and IV using bcrypt-pbkdf
            let mut key_iv = [0u8; 48]; // 32 bytes key + 16 bytes IV
            bcrypt_pbkdf::bcrypt_pbkdf(pass.as_bytes(), &salt, OPENSSH_BCRYPT_ROUNDS, &mut key_iv)
                .map_err(|e| KeyError::DecryptionFailed(format!("bcrypt_pbkdf failed: {}", e)))?;

            let key = &key_iv[0..32];
            let iv = &key_iv[32..48];

            // Encrypt private section with AES-256-CTR
            let mut cipher = Aes256Ctr::new_from_slices(key, iv)
                .map_err(|e| KeyError::DecryptionFailed(format!("Cipher init failed: {}", e)))?;
            cipher.apply_keystream(&mut private_section);

            // Write cipher info
            write_ssh_string(&mut output, b"aes256-ctr");
            write_ssh_string(&mut output, b"bcrypt");

            // KDF options: salt + rounds
            let mut kdf_options = Vec::new();
            write_ssh_string(&mut kdf_options, &salt);
            kdf_options.extend_from_slice(&OPENSSH_BCRYPT_ROUNDS.to_be_bytes());
            write_ssh_string(&mut output, &kdf_options);
        } else {
            // Empty passphrase = no encryption
            write_ssh_string(&mut output, b"none");
            write_ssh_string(&mut output, b"none");
            write_ssh_string(&mut output, b"");
        }
    } else {
        // No encryption
        write_ssh_string(&mut output, b"none");
        write_ssh_string(&mut output, b"none");
        write_ssh_string(&mut output, b"");
    }

    // Number of keys
    output.extend_from_slice(&1u32.to_be_bytes());

    // Public key
    write_ssh_string(&mut output, public_section);

    // Private key (possibly encrypted)
    write_ssh_string(&mut output, &private_section);

    // Encode and format
    let encoded = BASE64.encode(&output);
    let mut result = String::from("-----BEGIN OPENSSH PRIVATE KEY-----\n");
    for chunk in encoded.as_bytes().chunks(70) {
        result.push_str(std::str::from_utf8(chunk).unwrap());
        result.push('\n');
    }
    result.push_str("-----END OPENSSH PRIVATE KEY-----\n");

    Ok(result)
}

fn read_ssh_string(data: &[u8], offset: &mut usize) -> Result<Vec<u8>, KeyError> {
    if *offset + 4 > data.len() {
        return Err(KeyError::ParseError("Truncated SSH string".to_string()));
    }
    let len = u32::from_be_bytes([data[*offset], data[*offset+1], data[*offset+2], data[*offset+3]]) as usize;
    *offset += 4;
    if *offset + len > data.len() {
        return Err(KeyError::ParseError("Truncated SSH string data".to_string()));
    }
    let result = data[*offset..*offset+len].to_vec();
    *offset += len;
    Ok(result)
}

fn write_ssh_string(output: &mut Vec<u8>, data: &[u8]) {
    output.extend_from_slice(&(data.len() as u32).to_be_bytes());
    output.extend_from_slice(data);
}

fn build_rsa_sections(public_blob: &[u8], private_blob: &[u8], comment: &str) -> Result<(Vec<u8>, Vec<u8>), KeyError> {
    // Parse public blob: type, e, n
    let mut offset = 0;
    let _key_type = read_ssh_string(public_blob, &mut offset)?;
    let e = read_ssh_string(public_blob, &mut offset)?;
    let n = read_ssh_string(public_blob, &mut offset)?;

    // Parse private blob: d, p, q, iqmp
    let mut poffset = 0;
    let d = read_ssh_string(private_blob, &mut poffset)?;
    let p = read_ssh_string(private_blob, &mut poffset)?;
    let q = read_ssh_string(private_blob, &mut poffset)?;
    let iqmp = read_ssh_string(private_blob, &mut poffset)?;

    // Build private section (without padding - padding done later)
    let mut private_section = Vec::new();

    // Checkint (random, same value twice)
    let mut checkint = [0u8; 4];
    rand::thread_rng().fill_bytes(&mut checkint);
    private_section.extend_from_slice(&checkint);
    private_section.extend_from_slice(&checkint);

    // Key type
    write_ssh_string(&mut private_section, b"ssh-rsa");

    // RSA parameters in OpenSSH order: n, e, d, iqmp, p, q
    write_ssh_string(&mut private_section, &n);
    write_ssh_string(&mut private_section, &e);
    write_ssh_string(&mut private_section, &d);
    write_ssh_string(&mut private_section, &iqmp);
    write_ssh_string(&mut private_section, &p);
    write_ssh_string(&mut private_section, &q);

    // Comment
    write_ssh_string(&mut private_section, comment.as_bytes());

    // Build public section
    let mut public_section = Vec::new();
    write_ssh_string(&mut public_section, b"ssh-rsa");
    write_ssh_string(&mut public_section, &e);
    write_ssh_string(&mut public_section, &n);

    Ok((public_section, private_section))
}

fn build_ed25519_sections(public_blob: &[u8], private_blob: &[u8], comment: &str) -> Result<(Vec<u8>, Vec<u8>), KeyError> {
    // Parse public blob: type, public_key (32 bytes)
    let mut offset = 0;
    let _key_type = read_ssh_string(public_blob, &mut offset)?;
    let pub_key = read_ssh_string(public_blob, &mut offset)?;

    // Private blob contains: private_key (32 bytes)
    let priv_key = &private_blob[..32.min(private_blob.len())];

    // Build private section (without padding - padding done later)
    let mut private_section = Vec::new();

    // Checkint (random, same value twice)
    let mut checkint = [0u8; 4];
    rand::thread_rng().fill_bytes(&mut checkint);
    private_section.extend_from_slice(&checkint);
    private_section.extend_from_slice(&checkint);

    write_ssh_string(&mut private_section, b"ssh-ed25519");
    write_ssh_string(&mut private_section, &pub_key);

    // ed25519 private key: 64 bytes (private || public)
    let mut full_private = priv_key.to_vec();
    full_private.extend_from_slice(&pub_key);
    write_ssh_string(&mut private_section, &full_private);

    write_ssh_string(&mut private_section, comment.as_bytes());

    // Build public section
    let mut public_section = Vec::new();
    write_ssh_string(&mut public_section, b"ssh-ed25519");
    write_ssh_string(&mut public_section, &pub_key);

    Ok((public_section, private_section))
}

fn build_ecdsa_sections(algorithm: &str, public_blob: &[u8], private_blob: &[u8], comment: &str) -> Result<(Vec<u8>, Vec<u8>), KeyError> {
    // Parse public blob: type, curve_name, public_point
    let mut offset = 0;
    let _key_type = read_ssh_string(public_blob, &mut offset)?;
    let curve_name = read_ssh_string(public_blob, &mut offset)?;
    let pub_point = read_ssh_string(public_blob, &mut offset)?;

    // Private blob: private_exponent
    let mut poffset = 0;
    let priv_exp = read_ssh_string(private_blob, &mut poffset)?;

    // Build private section (without padding - padding done later)
    let mut private_section = Vec::new();

    // Checkint (random, same value twice)
    let mut checkint = [0u8; 4];
    rand::thread_rng().fill_bytes(&mut checkint);
    private_section.extend_from_slice(&checkint);
    private_section.extend_from_slice(&checkint);

    write_ssh_string(&mut private_section, algorithm.as_bytes());
    write_ssh_string(&mut private_section, &curve_name);
    write_ssh_string(&mut private_section, &pub_point);
    write_ssh_string(&mut private_section, &priv_exp);
    write_ssh_string(&mut private_section, comment.as_bytes());

    // Build public section
    let mut public_section = Vec::new();
    write_ssh_string(&mut public_section, algorithm.as_bytes());
    write_ssh_string(&mut public_section, &curve_name);
    write_ssh_string(&mut public_section, &pub_point);

    Ok((public_section, private_section))
}

/// Convert a PPK file to OpenSSH format (supports V2 and V3)
pub fn convert_ppk_to_openssh(
    ppk_path: &Path,
    output_path: &Path,
    passphrase: Option<&str>,
) -> Result<(), KeyError> {
    let content = fs::read_to_string(ppk_path)
        .map_err(|e| KeyError::IoError(e.to_string()))?;

    let ppk = parse_ppk(&content)?;
    let pass = passphrase.unwrap_or("");

    let private_decrypted = if ppk.encryption == "none" {
        // Unencrypted key
        let decrypted = ppk.private_blob.clone();

        // Verify MAC (different for V2 vs V3)
        if ppk.version == 3 {
            // For unencrypted V3, MAC key is all zeros
            let mac_key = vec![0u8; 32];
            let computed_mac = compute_mac_v3(&ppk, &decrypted, &mac_key);
            if computed_mac != ppk.mac {
                return Err(KeyError::InvalidPassphrase);
            }
        } else {
            let computed_mac = compute_mac_v2(&ppk, &decrypted, "");
            if computed_mac != ppk.mac {
                return Err(KeyError::InvalidPassphrase);
            }
        }
        decrypted
    } else if ppk.encryption == "aes256-cbc" {
        if pass.is_empty() {
            return Err(KeyError::DecryptionFailed("Passphrase required for encrypted key".to_string()));
        }

        if ppk.version == 3 {
            // V3: Use Argon2 for key derivation
            let (decrypted, mac_key) = decrypt_private_blob_v3(&ppk.private_blob, pass, &ppk)?;

            // Verify MAC with HMAC-SHA256
            let computed_mac = compute_mac_v3(&ppk, &decrypted, &mac_key);
            if computed_mac != ppk.mac {
                return Err(KeyError::InvalidPassphrase);
            }
            decrypted
        } else {
            // V2: Use SHA1 for key derivation
            let decrypted = decrypt_private_blob_v2(&ppk.private_blob, pass)?;

            // Verify MAC with HMAC-SHA1
            let computed_mac = compute_mac_v2(&ppk, &decrypted, pass);
            if computed_mac != ppk.mac {
                return Err(KeyError::InvalidPassphrase);
            }
            decrypted
        }
    } else {
        return Err(KeyError::ParseError(format!("Unsupported encryption: {}", ppk.encryption)));
    };

    // Convert to OpenSSH format, encrypted with the same passphrase
    let openssh_key = to_openssh_format(&ppk, &private_decrypted, passphrase)?;

    // Create parent directory if needed
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| KeyError::IoError(e.to_string()))?;
    }

    fs::write(output_path, openssh_key)
        .map_err(|e| KeyError::IoError(e.to_string()))?;

    // Set permissions on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(output_path)
            .map_err(|e| KeyError::IoError(e.to_string()))?
            .permissions();
        perms.set_mode(0o600);
        fs::set_permissions(output_path, perms)
            .map_err(|e| KeyError::IoError(e.to_string()))?;
    }

    Ok(())
}

/// Get the default output path for a converted key
pub fn get_converted_key_path(app_data_dir: &Path, original_path: &Path) -> PathBuf {
    let file_stem = original_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("key");

    let path_hash = format!("{:x}", md5::compute(original_path.to_string_lossy().as_bytes()));
    let short_hash = &path_hash[..8];

    app_data_dir
        .join("keys")
        .join(format!("{}_{}", file_stem, short_hash))
}
