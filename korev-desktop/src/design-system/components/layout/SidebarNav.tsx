import { cn } from '../../cn';
import { Icon, type IconName } from '../core/Icon';
import { Badge, type BadgeTone } from '../display/Badge';

export interface SidebarNavBadge {
  count: number;
  tone: BadgeTone;
  label: string;
}

export interface SidebarNavItem<Id extends string> {
  id: Id;
  label: string;
  icon: IconName;
  badge?: SidebarNavBadge;
}

export interface SidebarNavProps<Id extends string> {
  label: string;
  items: SidebarNavItem<Id>[];
  value: string;
  onChange: (id: Id) => void;
  compact?: boolean;
  className?: string;
}

const ITEM =
  'relative flex h-control-md w-full cursor-pointer items-center gap-2.5 rounded-sm border-0 bg-transparent px-2.5 text-left font-sans text-sm text-fg-2 transition-colors duration-(--dur-fast) ease-out hover:bg-hover hover:text-fg-1 focus-visible:shadow-focus aria-[current=page]:bg-active aria-[current=page]:text-fg-1';

const COMPACT_ITEM = 'h-9 justify-center px-0';

const COMPACT_BADGE =
  'absolute top-0 right-0 h-3.5 min-w-3.5 px-1 text-[9.5px]';

function NavBadge({
  badge,
  compact,
}: {
  badge: SidebarNavBadge;
  compact: boolean;
}) {
  return (
    <span
      role="img"
      aria-label={badge.label}
      className={cn(!compact && 'ml-auto')}
    >
      <Badge count tone={badge.tone} className={cn(compact && COMPACT_BADGE)}>
        {badge.count}
      </Badge>
    </span>
  );
}

export function SidebarNav<Id extends string>({
  label,
  items,
  value,
  onChange,
  compact = false,
  className,
}: SidebarNavProps<Id>) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              aria-current={item.id === value ? 'page' : undefined}
              title={compact ? item.label : undefined}
              onClick={() => onChange(item.id)}
              className={cn(ITEM, compact && COMPACT_ITEM)}
            >
              <Icon name={item.icon} size={16} />
              <span className={cn('truncate', compact && 'sr-only')}>
                {item.label}
              </span>
              {item.badge ? (
                <NavBadge badge={item.badge} compact={compact} />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
