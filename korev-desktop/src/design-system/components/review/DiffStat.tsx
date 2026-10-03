import { cn } from '../../cn';

export interface DiffStatProps {
  additions?: number;
  deletions?: number;
  blocks?: number;
  showBar?: boolean;
}

type Block = 'add' | 'del' | 'empty';

const BLOCK_CLASS: Record<Block, string> = {
  add: 'bg-diff-add-fg',
  del: 'bg-diff-del-fg',
  empty: 'bg-active',
};

function splitBlocks(
  additions: number,
  deletions: number,
  blocks: number,
): Block[] {
  const total = additions + deletions;
  const added = total ? Math.round((additions / total) * blocks) : 0;
  const deleted = total
    ? Math.min(Math.round((deletions / total) * blocks), blocks - added)
    : 0;
  return Array.from({ length: blocks }, (_, index) => {
    if (index < added) return 'add';
    if (index < added + deleted) return 'del';
    return 'empty';
  });
}

export function DiffStat({
  additions = 0,
  deletions = 0,
  blocks = 5,
  showBar = true,
}: DiffStatProps) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-2xs leading-none whitespace-nowrap">
      <span className="text-diff-add-fg">+{additions}</span>
      <span className="text-diff-del-fg">−{deletions}</span>
      {showBar ? (
        <span className="inline-flex gap-[1.5px]">
          {splitBlocks(additions, deletions, blocks).map((block, index) => (
            <i
              key={index}
              className={cn('size-1.5 rounded-[1px]', BLOCK_CLASS[block])}
            />
          ))}
        </span>
      ) : null}
    </span>
  );
}
