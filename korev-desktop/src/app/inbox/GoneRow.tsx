import { subjectSummary, type PanelSubject } from './list-model';
import { MINE_GRID } from './grid';
import { PrRow, PrSummary } from './PrRow';

export const GONE_LABEL = 'Merged · gone on next refresh';

export function GoneRow({ subject }: { subject: PanelSubject }) {
  const { title, url } = subjectSummary(subject);
  return (
    <PrRow optionKey={subject.key} url={url} className={MINE_GRID}>
      <span aria-hidden="true" />
      <PrSummary title={title} meta={GONE_LABEL} muted />
      <span />
    </PrRow>
  );
}
