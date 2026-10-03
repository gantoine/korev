import { Badge } from '../../design-system';
import type { StackLayer } from '../../shared/pull-request';
import { joinMeta } from '../format';
import { LAYER_GRID } from './grid';
import { LayerLabel, PrRow, PrSummary, authorHandle } from './PrRow';

const FINISHED_LABELS = { MERGED: 'Merged', CLOSED: 'Closed' } as const;

function LayerStateBadge({ layer }: { layer: StackLayer }) {
  if (layer.state !== 'OPEN') {
    return <Badge outline>{FINISHED_LABELS[layer.state]}</Badge>;
  }
  const author = authorHandle(layer.authorLogin);
  return <Badge>{author ? `Waiting on ${author}` : 'Open'}</Badge>;
}

export interface OtherLayerRowProps {
  layer: StackLayer;
  stackSize: number;
}

export function OtherLayerRow({ layer, stackSize }: OtherLayerRowProps) {
  return (
    <PrRow url={layer.url} className={LAYER_GRID}>
      <LayerLabel position={layer.position} size={stackSize} />
      <span aria-hidden="true" />
      <PrSummary
        title={layer.title}
        meta={joinMeta([`#${layer.number}`, authorHandle(layer.authorLogin)])}
        muted={layer.state !== 'OPEN'}
      />
      <span className="flex justify-end">
        <LayerStateBadge layer={layer} />
      </span>
    </PrRow>
  );
}
