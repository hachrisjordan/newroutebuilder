import * as React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

// TooltipProvider for context
export const TooltipProvider = RadixTooltip.Provider;

// Tooltip root
export const Tooltip = RadixTooltip.Root;

// TooltipTrigger
export const TooltipTrigger = RadixTooltip.Trigger;

// TooltipContent with Shadcn-like styling
export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof RadixTooltip.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTooltip.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <RadixTooltip.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md animate-in fade-in-0 zoom-in-95',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = RadixTooltip.Content.displayName; 