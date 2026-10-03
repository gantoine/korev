import type { MyPr } from '../../shared/inbox';
import { formatAge } from '../format';
import { NARROW_HIDDEN } from '../layout';
import { MINUTE_MS, useNow } from '../useNow';
import { CiIcon } from './CiIcon';
import { LAYER_GRID, MINE_GRID } from './grid';
import { LayerLabel, PrRow, PrSummary, prRef, type StackPlace } from './PrRow';
import { ReasonChips } from './ReasonChips';

export interface MyPrRowProps {
  item: MyPr;
  stackPlace?: StackPlace;
}

export function MyPrRow({ item, stackPlace }: MyPrRowProps) {
  const now = useNow(MINUTE_MS);
  const { pr, reasons } = item;
  const reference = stackPlace ? `#${pr.number}` : prRef(pr);
  return (
    <PrRow url={pr.url} className={stackPlace ? LAYER_GRID : MINE_GRID}>
      {stackPlace ? <LayerLabel {...stackPlace} /> : null}
      <CiIcon state={pr.ci} checks={pr.checks} />
      <PrSummary
        title={pr.title}
        meta={
          <>
            <span className="font-mono">{reference}</span>
            <span className={NARROW_HIDDEN}>
              {' · updated '}
              {formatAge(pr.updatedAt, now)}
            </span>
          </>
        }
      />
      <ReasonChips reasons={reasons} />
    </PrRow>
  );
}
