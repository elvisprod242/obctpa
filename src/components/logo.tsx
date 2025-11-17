import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps extends Omit<React.ComponentProps<typeof Image>, 'src' | 'alt' | 'width' | 'height'> {
  variant?: 'auth' | 'sidebar';
}

export function Logo({ variant = 'sidebar', ...props }: LogoProps) {
  const sizes = {
    auth: { width: 100, height: 30 },
    sidebar: { width: 80, height: 30 },
  };

  const { width, height } = sizes[variant];

  return (
    <Image
      src="/logo.png"
      alt="Logo TPA"
      width={width}
      height={height}
      {...props}
    />
  );
}
