import { cn } from '../../cn';

export type SizeLevel = 'S' | 'M' | 'L';

export interface SizeBadgeProps {
  size: SizeLevel;
  lines: number;
  files: number;
  filesTruncated?: boolean;
  className?: string;
}

const FILLED_BARS: Record<SizeLevel, number> = { S: 1, M: 2, L: 3 };
const BAR_HEIGHTS = ['h-[5px]', 'h-2', 'h-[11px]'];
const EXCLUSION_NOTE = 'lockfiles excluded';

function countOf(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function describeSize({
  lines,
  files,
  filesTruncated = false,
}: Pick<SizeBadgeProps, 'lines' | 'files' | 'filesTruncated'>): string {
  if (filesTruncated) return `${files}+ files`;
  return `${countOf(lines, 'line')} in ${countOf(files, 'file')} · ${EXCLUSION_NOTE}`;
}

export function SizeBadge({
  size,
  lines,
  files,
  filesTruncated,
  className,
}: SizeBadgeProps) {
  const description = describeSize({ lines, files, filesTruncated });
  const filled = FILLED_BARS[size];
  return (
    <span
      role="img"
      aria-label={`Size ${size}, ${description}`}
      title={description}
      className={cn(
        'inline-flex items-end gap-[3px] font-mono text-2xs leading-none font-medium text-fg-2',
        className,
      )}
    >
      {BAR_HEIGHTS.map((height, index) => (
        <i
          key={height}
          className={cn(
            'inline-block w-[3px] rounded-[1px]',
            height,
            index < filled ? 'bg-fg-1' : 'bg-border-strong',
          )}
        />
      ))}
      <span className="ml-0.5">{size}</span>
    </span>
  );
}
