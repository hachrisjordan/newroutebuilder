import React, { useRef, useEffect, useState } from 'react';

interface ExpandFadeProps {
  show: boolean;
  children: React.ReactNode;
  durationMs?: number;
  className?: string;
}

/**
 * ExpandFade animates its children with a smooth expand/collapse effect.
 * It uses max-height, opacity, and translateY for a natural feel.
 *
 * @param show - Whether the content is expanded
 * @param children - Content to animate
 * @param durationMs - Animation duration in ms (default: 300)
 * @param className - Additional classes for the container
 */
const ExpandFade: React.FC<ExpandFadeProps> = ({ show, children, durationMs = 300, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState(show ? '1000px' : '0px');
  const [render, setRender] = useState(show);

  useEffect(() => {
    if (show) setRender(true);
    if (ref.current) {
      setMaxHeight(show ? `${ref.current.scrollHeight}px` : '0px');
    }
    if (!show) {
      // Wait for animation to finish before removing from DOM
      const timeout = setTimeout(() => setRender(false), durationMs);
      return () => clearTimeout(timeout);
    }
  }, [show, durationMs]);

  // Update maxHeight on content change
  useEffect(() => {
    if (show && ref.current) {
      setMaxHeight(`${ref.current.scrollHeight}px`);
    }
  }, [children, show]);

  if (!render && !show) return null;

  return (
    <div
      ref={ref}
      style={{
        maxHeight,
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(-8px)',
        transition: `max-height ${durationMs}ms cubic-bezier(0.4,0,0.2,1), opacity ${durationMs}ms, transform ${durationMs}ms`,
        overflow: 'hidden',
        willChange: 'max-height, opacity, transform',
      }}
      aria-hidden={!show}
      className={className}
    >
      {children}
    </div>
  );
};

export default ExpandFade; 