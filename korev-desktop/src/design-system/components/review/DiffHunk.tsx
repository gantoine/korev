import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../cn';

export type DiffLineType = 'add' | 'del' | 'ctx' | 'hunk';

export interface DiffLine {
  type: DiffLineType;
  code?: string;
  flag?: boolean;
}

export type DiffLang = 'ts' | 'js' | 'py' | 'go';

export interface DiffHunkProps {
  lines: DiffLine[];
  notes?: Record<number, ReactNode>;
  lang?: DiffLang;
  oldStart?: number;
  newStart?: number;
  highlight?: boolean;
  className?: string;
  style?: CSSProperties;
}

const KEYWORDS = new Set(
  'const let var function return if else for while await async import export from new class extends try catch finally throw type interface of in null undefined true false this default switch case break continue def self None True False elif lambda pass raise with as yield public private readonly enum'.split(
    ' ',
  ),
);

const TOKEN =
  /(\/\/.*$|#(?!\w*\().*$)|('(?:\\.|[^'])*'|"(?:\\.|[^"])*"|`(?:\\.|[^`])*`)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)(\s*\()?|([^\sA-Za-z_$\d'"`]+)|(\s+)/g;

const HUNK_HEADER = /-(\d+)(?:,\d+)? \+(\d+)/;

const SIGNS: Record<Exclude<DiffLineType, 'hunk'>, string> = {
  add: '+',
  del: '−',
  ctx: ' ',
};

const ROW_CLASS: Record<Exclude<DiffLineType, 'hunk'>, string> = {
  add: 'kv-diff__row--add',
  del: 'kv-diff__row--del',
  ctx: '',
};

function identifierClass(word: string, isCall: boolean): string | undefined {
  if (KEYWORDS.has(word)) return 'kv-syn-k';
  if (isCall) return 'kv-syn-f';
  if (/^[A-Z]/.test(word)) return 'kv-syn-t';
  return undefined;
}

function highlightCode(source: string, lang: DiffLang): ReactNode[] {
  const tokens: ReactNode[] = [];
  let key = 0;
  const pattern = new RegExp(TOKEN.source, TOKEN.flags);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const [whole, comment, string, number, identifier, callParen, punctuation] =
      match;
    if (comment && comment.startsWith('#') && lang !== 'py') {
      tokens.push(
        <span key={key++} className="kv-syn-p">
          #
        </span>,
      );
      pattern.lastIndex = match.index + 1;
      continue;
    }
    if (comment) {
      tokens.push(
        <span key={key++} className="kv-syn-c">
          {comment}
        </span>,
      );
    } else if (string) {
      tokens.push(
        <span key={key++} className="kv-syn-s">
          {string}
        </span>,
      );
    } else if (number) {
      tokens.push(
        <span key={key++} className="kv-syn-n">
          {number}
        </span>,
      );
    } else if (identifier) {
      tokens.push(
        <span
          key={key++}
          className={identifierClass(identifier, Boolean(callParen))}
        >
          {identifier}
        </span>,
      );
      if (callParen) tokens.push(callParen);
    } else if (punctuation) {
      tokens.push(
        <span key={key++} className="kv-syn-p">
          {punctuation}
        </span>,
      );
    } else {
      tokens.push(whole);
    }
    if (whole === '') pattern.lastIndex++;
  }
  return tokens;
}

export function DiffHunk({
  lines,
  notes = {},
  lang = 'ts',
  oldStart = 1,
  newStart = 1,
  highlight = true,
  className,
  style,
}: DiffHunkProps) {
  let oldLine = oldStart;
  let newLine = newStart;
  const rows: ReactNode[] = [];

  lines.forEach((line, index) => {
    if (line.type === 'hunk') {
      const header = HUNK_HEADER.exec(line.code ?? '');
      if (header) {
        oldLine = Number(header[1]);
        newLine = Number(header[2]);
      }
      rows.push(
        <tr key={index} className="kv-diff__row--hunk">
          <td className="kv-diff__num" />
          <td className="kv-diff__num" />
          <td colSpan={2} className="pl-2">
            {line.code}
          </td>
        </tr>,
      );
    } else {
      const oldNumber = line.type === 'add' ? '' : oldLine++;
      const newNumber = line.type === 'del' ? '' : newLine++;
      const code = line.code ?? '';
      rows.push(
        <tr
          key={index}
          className={cn(
            ROW_CLASS[line.type],
            line.flag && 'kv-diff__row--flag',
          )}
        >
          <td className="kv-diff__num">{oldNumber}</td>
          <td className="kv-diff__num">{newNumber}</td>
          <td className="kv-diff__sign">{SIGNS[line.type]}</td>
          <td className="kv-diff__code">
            {highlight ? highlightCode(code, lang) : code}
          </td>
        </tr>,
      );
    }
    if (notes[index]) {
      rows.push(
        <tr key={`note-${index}`} className="kv-diff__note">
          <td colSpan={4}>{notes[index]}</td>
        </tr>,
      );
    }
  });

  return (
    <div className={cn('kv-diff', className)} style={style}>
      <table>
        <colgroup>
          <col className="w-11" />
          <col className="w-11" />
          <col className="w-4.5" />
          <col />
        </colgroup>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
