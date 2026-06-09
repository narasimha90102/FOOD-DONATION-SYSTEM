import React from 'react';

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export default function UserAvatar({
  src,
  name,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const getInitials = (fullName: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-24 w-24 text-3xl',
    '2xl': 'h-32 w-32 text-4xl',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  const initials = getInitials(name);

  return (
    <div
      className={`relative rounded-full flex items-center justify-center overflow-hidden border-2 border-brand-500/80 shadow-md shadow-brand-500/10 transition-all duration-300 group-hover:border-brand-500 ${currentSizeClass} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover rounded-full"
          onError={(e) => {
            // If image fails to load, fallback to showing initials by resetting src
            (e.target as HTMLImageElement).style.display = 'none';
            // Show parent's background color and text
            const parent = (e.target as HTMLImageElement).parentElement;
            if (parent) {
              parent.classList.add('bg-gradient-to-br', 'from-brand-500/20', 'to-brand-600/30');
              const span = document.createElement('span');
              span.className = 'font-bold text-brand-400 select-none';
              span.innerText = initials;
              parent.appendChild(span);
            }
          }}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-brand-500/10 to-brand-600/25 text-brand-400 font-bold select-none">
          {initials}
        </div>
      )}
    </div>
  );
}
