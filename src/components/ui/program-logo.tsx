import Image from 'next/image';
import { useState } from 'react';

interface ProgramLogoProps {
  program: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Renders a program logo from /public/{program}_P.png if it exists, otherwise falls back to /default-logo.png.
 * Always uses local paths for Next.js image optimization.
 */
const ProgramLogo = ({
  program,
  width = 75,
  height = 30,
  className = '',
}: ProgramLogoProps) => {
  const [src, setSrc] = useState(`/${program}_P.png`);

  return (
    <Image
      src={src}
      alt={`${program} logo`}
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'contain' }}
      loading="lazy"
      onError={() => setSrc('/default-logo.png')}
    />
  );
};

export default ProgramLogo; 