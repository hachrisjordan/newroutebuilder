import * as React from 'react';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  className?: string;
  barClassName?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, className = '', barClassName = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative bg-muted rounded-full overflow-hidden ${className}`}
        {...props}
      >
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-200 ${barClassName}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
        <div className="invisible">{value}%</div>
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress }; 