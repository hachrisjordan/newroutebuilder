import React, { useState, useRef, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipTouchProps {
  content: React.ReactNode;
  children: React.ReactNode;
  /** Optional: ms to auto-hide on mobile */
  mobileHideDelay?: number;
}

function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const check = () => {
      setIsTouch(
        typeof window !== "undefined" &&
          ("ontouchstart" in window || navigator.maxTouchPoints > 0)
      );
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isTouch;
}

export const TooltipTouch: React.FC<TooltipTouchProps> = ({
  content,
  children,
  mobileHideDelay = 2500,
}) => {
  const isTouch = useIsTouchDevice();
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  // Hide tooltip on tap outside (mobile)
  useEffect(() => {
    if (!isTouch || !open) return;
    function handle(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isTouch, open]);

  // Auto-hide after delay (mobile)
  useEffect(() => {
    if (!isTouch || !open) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), mobileHideDelay);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isTouch, open, mobileHideDelay]);

  if (isTouch) {
    // Mobile: tap to show/hide
    return (
      <span ref={triggerRef} style={{ display: "inline-block" }}>
        <span
          onClick={() => setOpen((v) => !v)}
          tabIndex={0}
          style={{ 
            cursor: "pointer",
            padding: "8px",
            margin: "-8px",
            display: "inline-block"
          }}
        >
          {children}
        </span>
        {open && (
          <div
            style={{
              position: "absolute",
              zIndex: 50,
              background: "rgba(17,17,17,0.95)",
              color: "white",
              borderRadius: 6,
              padding: "0.5em 0.75em",
              fontSize: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              marginTop: 8,
              left: 0,
              minWidth: 120,
              maxWidth: 320,
              pointerEvents: "auto",
              wordWrap: "break-word",
            }}
            role="tooltip"
          >
            {content}
          </div>
        )}
      </span>
    );
  }

  // Desktop: use Radix/Shadcn Tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}; 