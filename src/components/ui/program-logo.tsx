import Image from 'next/image';
import { useState, useEffect } from 'react';

interface ProgramLogoProps {
  program: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Dynamically renders a program logo from /public/{program}_P.png if it exists, otherwise falls back to /default-logo.png.
 * No hardcoded program list. Uses a HEAD request to check existence at runtime.
 */
const ProgramLogo = ({
  program,
  width = 75,
  height = 30,
  className = '',
}: ProgramLogoProps) => {
  const [src, setSrc] = useState<string>(`/${program}_P.png`);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkImage = async () => {
      try {
        const res = await fetch(`/${program}_P.png`, { method: 'HEAD' });
        if (isMounted) {
          setSrc(res.ok ? `/${program}_P.png` : '/default-logo.png');
          setHasChecked(true);
        }
      } catch {
        if (isMounted) {
          setSrc('/default-logo.png');
          setHasChecked(true);
        }
      }
    };
    checkImage();
    return () => {
      isMounted = false;
    };
  }, [program]);

  // Optionally, show nothing or a placeholder until checked
  if (!hasChecked) return null;

  return (
    <Image
      src={src}
      alt={`${program} logo`}
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'contain' }}
      loading="lazy"
    />
  );
};

export default ProgramLogo; 