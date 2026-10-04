import { cn } from '../../cn';

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block h-3 animate-pulse rounded-xs bg-active motion-reduce:animate-none',
        className,
      )}
    />
  );
}
