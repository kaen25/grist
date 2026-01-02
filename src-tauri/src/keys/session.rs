use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::RwLock;

use secrecy::{ExposeSecret, SecretString};

use super::converter::{is_key_encrypted, KeyError};

/// Session-based cache for unlocked SSH keys
/// Stores passphrases in memory (protected by secrecy crate) for the session
static KEY_CACHE: RwLock<Option<KeyCache>> = RwLock::new(None);

struct KeyCache {
    /// Map from key path to protected passphrase
    /// SecretString ensures:
    /// - Memory is zeroized on drop
    /// - No accidental logging (Debug/Display don't show value)
    passphrases: HashMap<PathBuf, SecretString>,
}

impl KeyCache {
    fn new() -> Self {
        Self {
            passphrases: HashMap::new(),
        }
    }
}

/// Initialize the key cache (called on app startup)
pub fn init_cache() {
    let mut cache = KEY_CACHE.write().unwrap();
    *cache = Some(KeyCache::new());
}

/// Check if a key is unlocked (passphrase is cached)
pub fn is_key_unlocked(key_path: &Path) -> bool {
    let cache = KEY_CACHE.read().unwrap();
    if let Some(ref c) = *cache {
        c.passphrases.contains_key(key_path)
    } else {
        false
    }
}

/// Check if a key needs to be unlocked (is encrypted and not in cache)
pub fn needs_unlock(key_path: &Path) -> Result<bool, KeyError> {
    // If key doesn't exist, no unlock needed (will fail later with better error)
    if !key_path.exists() {
        return Ok(false);
    }

    // Check if encrypted
    let encrypted = is_key_encrypted(key_path)?;
    if !encrypted {
        return Ok(false);
    }

    // Check if already unlocked
    Ok(!is_key_unlocked(key_path))
}

/// Unlock a key by caching its passphrase (protected in memory)
pub fn unlock_key(key_path: &Path, passphrase: &str) -> Result<(), KeyError> {
    // Verify the passphrase is correct by trying to decrypt the key
    verify_passphrase(key_path, passphrase)?;

    // Cache the passphrase (wrapped in SecretString for protection)
    let mut cache = KEY_CACHE.write().unwrap();
    if let Some(ref mut c) = *cache {
        c.passphrases.insert(
            key_path.to_path_buf(),
            SecretString::new(passphrase.to_string()),
        );
    }

    Ok(())
}

/// Get the cached passphrase for a key (for internal use only)
fn get_cached_passphrase(key_path: &Path) -> Option<SecretString> {
    let cache = KEY_CACHE.read().unwrap();
    if let Some(ref c) = *cache {
        c.passphrases.get(key_path).map(|s| SecretString::new(s.expose_secret().clone()))
    } else {
        None
    }
}

/// Lock a specific key (remove from cache - memory is zeroized)
pub fn lock_key(key_path: &Path) {
    let mut cache = KEY_CACHE.write().unwrap();
    if let Some(ref mut c) = *cache {
        c.passphrases.remove(key_path);
    }
}

/// Lock all keys (clear the cache - all memory is zeroized)
pub fn lock_all_keys() {
    let mut cache = KEY_CACHE.write().unwrap();
    if let Some(ref mut c) = *cache {
        c.passphrases.clear();
    }
}

/// Verify a passphrase is correct for an encrypted OpenSSH key
fn verify_passphrase(key_path: &Path, passphrase: &str) -> Result<(), KeyError> {
    use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
    use std::fs;

    let content = fs::read_to_string(key_path)
        .map_err(|e| KeyError::IoError(e.to_string()))?;

    if !content.contains("-----BEGIN OPENSSH PRIVATE KEY-----") {
        return Err(KeyError::ParseError("Not an OpenSSH key".to_string()));
    }

    // Extract and decode base64
    let b64_content: String = content
        .lines()
        .filter(|line| !line.starts_with("-----"))
        .collect();

    let decoded = BASE64.decode(&b64_content)
        .map_err(|e| KeyError::ParseError(format!("Invalid base64: {}", e)))?;

    // Parse OpenSSH key structure
    if !decoded.starts_with(b"openssh-key-v1\0") {
        return Err(KeyError::ParseError("Invalid OpenSSH key magic".to_string()));
    }

    let mut offset = 15; // Skip magic

    // Read cipher name
    let cipher = read_string(&decoded, &mut offset)?;
    if cipher == "none" {
        // Key is not encrypted, passphrase not needed
        return Ok(());
    }

    // Read KDF name
    let kdf = read_string(&decoded, &mut offset)?;
    if kdf != "bcrypt" {
        return Err(KeyError::ParseError(format!("Unsupported KDF: {}", kdf)));
    }

    // Read KDF options
    let kdf_options = read_bytes(&decoded, &mut offset)?;
    let mut kdf_offset = 0;
    let salt = read_bytes(&kdf_options, &mut kdf_offset)?;
    if kdf_offset + 4 > kdf_options.len() {
        return Err(KeyError::ParseError("Truncated KDF options".to_string()));
    }
    let rounds = u32::from_be_bytes([
        kdf_options[kdf_offset],
        kdf_options[kdf_offset + 1],
        kdf_options[kdf_offset + 2],
        kdf_options[kdf_offset + 3],
    ]);

    // Read number of keys
    if offset + 4 > decoded.len() {
        return Err(KeyError::ParseError("Truncated key data".to_string()));
    }
    offset += 4; // Skip number of keys

    // Skip public key
    let _public_key = read_bytes(&decoded, &mut offset)?;

    // Read encrypted private key
    let encrypted_private = read_bytes(&decoded, &mut offset)?;

    // Derive key using bcrypt-pbkdf
    let mut key_iv = [0u8; 48];
    bcrypt_pbkdf::bcrypt_pbkdf(passphrase.as_bytes(), &salt, rounds, &mut key_iv)
        .map_err(|e| KeyError::DecryptionFailed(format!("bcrypt_pbkdf failed: {}", e)))?;

    let key = &key_iv[0..32];
    let iv = &key_iv[32..48];

    // Decrypt with AES-256-CTR
    use aes::cipher::{KeyIvInit, StreamCipher};
    type Aes256Ctr = ctr::Ctr128BE<aes::Aes256>;

    let mut decrypted = encrypted_private.to_vec();
    let mut cipher = Aes256Ctr::new_from_slices(key, iv)
        .map_err(|e| KeyError::DecryptionFailed(format!("Cipher init failed: {}", e)))?;
    cipher.apply_keystream(&mut decrypted);

    // Verify checkints match (first 8 bytes should be two identical u32s)
    if decrypted.len() < 8 {
        return Err(KeyError::InvalidPassphrase);
    }

    let check1 = u32::from_be_bytes([decrypted[0], decrypted[1], decrypted[2], decrypted[3]]);
    let check2 = u32::from_be_bytes([decrypted[4], decrypted[5], decrypted[6], decrypted[7]]);

    if check1 != check2 {
        return Err(KeyError::InvalidPassphrase);
    }

    Ok(())
}

fn read_string(data: &[u8], offset: &mut usize) -> Result<String, KeyError> {
    let bytes = read_bytes(data, offset)?;
    String::from_utf8(bytes)
        .map_err(|e| KeyError::ParseError(format!("Invalid UTF-8: {}", e)))
}

fn read_bytes(data: &[u8], offset: &mut usize) -> Result<Vec<u8>, KeyError> {
    if *offset + 4 > data.len() {
        return Err(KeyError::ParseError("Truncated data".to_string()));
    }
    let len = u32::from_be_bytes([
        data[*offset],
        data[*offset + 1],
        data[*offset + 2],
        data[*offset + 3],
    ]) as usize;
    *offset += 4;

    if *offset + len > data.len() {
        return Err(KeyError::ParseError("Truncated data".to_string()));
    }
    let result = data[*offset..*offset + len].to_vec();
    *offset += len;
    Ok(result)
}

/// Decrypt an OpenSSH key and return the decrypted content as a temporary file path
/// The temporary file is created with restricted permissions
pub fn get_decrypted_key_path(key_path: &Path) -> Result<Option<PathBuf>, KeyError> {
    use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
    use std::fs;

    // Check if key is encrypted
    if !is_key_encrypted(key_path)? {
        return Ok(None); // No decryption needed, use original path
    }

    // Get cached passphrase
    let passphrase = get_cached_passphrase(key_path)
        .ok_or_else(|| KeyError::DecryptionFailed("Key is locked".to_string()))?;

    let content = fs::read_to_string(key_path)
        .map_err(|e| KeyError::IoError(e.to_string()))?;

    // Extract and decode base64
    let b64_content: String = content
        .lines()
        .filter(|line| !line.starts_with("-----"))
        .collect();

    let decoded = BASE64.decode(&b64_content)
        .map_err(|e| KeyError::ParseError(format!("Invalid base64: {}", e)))?;

    let mut offset = 15; // Skip magic

    // Read cipher and KDF info
    let _cipher = read_string(&decoded, &mut offset)?;
    let _kdf = read_string(&decoded, &mut offset)?;
    let kdf_options = read_bytes(&decoded, &mut offset)?;

    let mut kdf_offset = 0;
    let salt = read_bytes(&kdf_options, &mut kdf_offset)?;
    let rounds = u32::from_be_bytes([
        kdf_options[kdf_offset],
        kdf_options[kdf_offset + 1],
        kdf_options[kdf_offset + 2],
        kdf_options[kdf_offset + 3],
    ]);

    // Read number of keys and public key
    offset += 4;
    let public_key = read_bytes(&decoded, &mut offset)?;
    let encrypted_private = read_bytes(&decoded, &mut offset)?;

    // Decrypt using the protected passphrase
    let mut key_iv = [0u8; 48];
    bcrypt_pbkdf::bcrypt_pbkdf(passphrase.expose_secret().as_bytes(), &salt, rounds, &mut key_iv)
        .map_err(|e| KeyError::DecryptionFailed(format!("bcrypt_pbkdf failed: {}", e)))?;

    use aes::cipher::{KeyIvInit, StreamCipher};
    type Aes256Ctr = ctr::Ctr128BE<aes::Aes256>;

    let mut decrypted_private = encrypted_private.to_vec();
    let mut cipher = Aes256Ctr::new_from_slices(&key_iv[0..32], &key_iv[32..48])
        .map_err(|e| KeyError::DecryptionFailed(format!("Cipher init failed: {}", e)))?;
    cipher.apply_keystream(&mut decrypted_private);

    // Build unencrypted OpenSSH key
    let mut output = Vec::new();
    output.extend_from_slice(b"openssh-key-v1\0");
    write_string(&mut output, "none");
    write_string(&mut output, "none");
    write_bytes(&mut output, &[]);
    output.extend_from_slice(&1u32.to_be_bytes());
    write_bytes(&mut output, &public_key);
    write_bytes(&mut output, &decrypted_private);

    let encoded = BASE64.encode(&output);
    let mut key_content = String::from("-----BEGIN OPENSSH PRIVATE KEY-----\n");
    for chunk in encoded.as_bytes().chunks(70) {
        key_content.push_str(std::str::from_utf8(chunk).unwrap());
        key_content.push('\n');
    }
    key_content.push_str("-----END OPENSSH PRIVATE KEY-----\n");

    // Write to temp file with unique name
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(format!("grist_key_{}", std::process::id()));

    fs::write(&temp_path, &key_content)
        .map_err(|e| KeyError::IoError(e.to_string()))?;

    // Set permissions on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&temp_path)
            .map_err(|e| KeyError::IoError(e.to_string()))?
            .permissions();
        perms.set_mode(0o600);
        fs::set_permissions(&temp_path, perms)
            .map_err(|e| KeyError::IoError(e.to_string()))?;
    }

    Ok(Some(temp_path))
}

/// Clean up temporary decrypted key files
pub fn cleanup_temp_keys() {
    let temp_dir = std::env::temp_dir();
    let prefix = format!("grist_key_{}", std::process::id());
    if let Ok(entries) = std::fs::read_dir(&temp_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.starts_with(&prefix) {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }
    }
}

fn write_string(output: &mut Vec<u8>, s: &str) {
    write_bytes(output, s.as_bytes());
}

fn write_bytes(output: &mut Vec<u8>, data: &[u8]) {
    output.extend_from_slice(&(data.len() as u32).to_be_bytes());
    output.extend_from_slice(data);
}
