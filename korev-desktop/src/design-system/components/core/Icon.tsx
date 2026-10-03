import * as lucide from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { IconName } from 'lucide-react/dynamic';
import type { SVGProps } from 'react';
import { cn } from '../../cn';

export type { IconName };

const glyphs = lucide as unknown as Record<string, LucideIcon | undefined>;

function toComponentName(name: IconName): string {
  return name.replace(/(^|-)([a-z0-9])/g, (_match, _dash, char: string) =>
    char.toUpperCase(),
  );
}

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.75,
  color = 'currentColor',
  className,
  ...rest
}: IconProps) {
  const Glyph = glyphs[toComponentName(name)];
  if (!Glyph) return null;
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      aria-hidden="true"
      className={cn('block flex-none', className)}
      {...rest}
    />
  );
}
