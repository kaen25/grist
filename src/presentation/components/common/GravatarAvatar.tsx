import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import md5 from 'blueimp-md5';
import { cn } from '@/lib/utils';

export type GravatarFallback = 'identicon' | 'retro' | 'robohash' | 'wavatar' | 'monsterid' | 'mp';

interface GravatarAvatarProps {
  email: string;
  name: string;
  size?: number;
  fallback?: GravatarFallback;
  className?: string;
}

/**
 * Generate Gravatar URL from email
 * @param email - User email
 * @param size - Image size in pixels
 * @param fallback - Gravatar fallback style
 */
function getGravatarUrl(email: string, size: number, fallback: GravatarFallback): string {
  const hash = md5(email.toLowerCase().trim());
  return `https://www.gravatar.com/avatar/${hash}?d=${fallback}&s=${size}`;
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Avatar component with Gravatar support and nice fallbacks.
 *
 * Uses Gravatar's generated fallback images (identicon, retro, etc.)
 * which create unique patterns based on the email hash.
 *
 * @example
 * <GravatarAvatar
 *   email="user@example.com"
 *   name="John Doe"
 *   size={32}
 *   fallback="identicon"
 * />
 */
export function GravatarAvatar({
  email,
  name,
  size = 32,
  fallback = 'identicon',
  className,
}: GravatarAvatarProps) {
  const gravatarUrl = getGravatarUrl(email, size * 2, fallback); // 2x for retina
  const initials = getInitials(name);

  return (
    <Avatar
      className={cn(className)}
      style={{ width: size, height: size }}
    >
      <AvatarImage src={gravatarUrl} alt={name} />
      <AvatarFallback className="text-xs font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
