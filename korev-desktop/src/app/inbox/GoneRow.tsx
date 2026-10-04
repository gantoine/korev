import { MERGED_GONE_LABEL } from './action-state';
import { subjectSummary, type PanelSubject } from './list-model';
import { MINE_GRID } from './grid';
import { PrRow, PrSummary } from './PrRow';

export interface GoneRowProps {
  subject: PanelSubject;
  label?: string;
}

export function GoneRow({ subject, label = MERGED_GONE_LABEL }: GoneRowProps) {
  const { title, url } = subjectSummary(subject);
  return (
    <PrRow optionKey={subject.key} url={url} className={MINE_GRID}>
      <span aria-hidden="true" />
      <PrSummary title={title} meta={label} muted />
      <span />
    </PrRow>
  );
}
