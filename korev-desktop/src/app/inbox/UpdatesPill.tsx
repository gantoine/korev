import { Kbd } from '../../design-system';
import { pluralize } from '../format';

export const APPLY_UPDATES_KEY = '.';

export interface UpdatesPillProps {
  count: number;
  onShow: () => void;
}

export function UpdatesPill({ count, onShow }: UpdatesPillProps) {
  return (
    <div className="pointer-events-none sticky top-2 z-10 flex h-0 justify-center overflow-visible">
      <button
        type="button"
        onClick={onShow}
        className="pointer-events-auto inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full border border-accent-border bg-raised px-2.5 font-sans text-xs text-accent-text shadow-pop focus-visible:shadow-focus"
      >
        {pluralize(count, 'update')} · Show
        <Kbd>{APPLY_UPDATES_KEY}</Kbd>
      </button>
    </div>
  );
}
