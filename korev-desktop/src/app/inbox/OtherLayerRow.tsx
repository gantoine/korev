import { Badge } from '../../design-system';
import type { StackLayer } from '../../shared/pull-request';
import { joinMeta } from '../format';
import { layerRef } from './entries';
import { LAYER_GRID } from './grid';
import { LayerLabel, PrRow, PrSummary, authorHandle } from './PrRow';

const FINISHED_LABELS = { MERGED: 'Merged', CLOSED: 'Closed' } as const;
const OPEN_LABEL = 'Open';

export function layerStateLabel(layer: StackLayer): string {
  if (layer.state !== 'OPEN') return FINISHED_LABELS[layer.state];
  const author = authorHandle(layer.authorLogin);
  return author ? `Waiting on ${author}` : OPEN_LABEL;
}

function LayerStateBadge({ layer }: { layer: StackLayer }) {
  return (
    <Badge outline={layer.state !== 'OPEN'}>{layerStateLabel(layer)}</Badge>
  );
}

export interface OtherLayerRowProps {
  repo: string;
  layer: StackLayer;
  stackSize: number;
}

export function OtherLayerRow({ repo, layer, stackSize }: OtherLayerRowProps) {
  return (
    <PrRow
      optionKey={layerRef(repo, layer)}
      url={layer.url}
      className={LAYER_GRID}
    >
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
