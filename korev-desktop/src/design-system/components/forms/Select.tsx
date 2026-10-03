import type { CSSProperties } from 'react';
import { cn } from '../../cn';
import { Icon, type IconName } from '../core/Icon';
import {
  FIELD_CONTROL_CLASS,
  Field,
  fieldBoxClass,
  type FieldSize,
} from './Field';

export type SelectOption = string | { value: string; label: string };

export interface SelectProps {
  label?: string;
  hint?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  size?: FieldSize;
  disabled?: boolean;
  icon?: IconName;
  className?: string;
  style?: CSSProperties;
}

function normalize(option: SelectOption) {
  return typeof option === 'string' ? { value: option, label: option } : option;
}

export function Select({
  label,
  hint,
  options,
  value,
  onChange,
  size = 'md',
  disabled,
  icon,
  className,
  style,
}: SelectProps) {
  return (
    <Field label={label} hint={hint} className={className} style={style}>
      <div className={cn(fieldBoxClass({ size, disabled }), 'relative')}>
        {icon ? <Icon name={icon} size={14} /> : null}
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
          className={cn(
            FIELD_CONTROL_CLASS,
            'cursor-pointer appearance-none pr-[18px]',
          )}
        >
          {options.map(normalize).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          size={14}
          className="pointer-events-none absolute right-2"
        />
      </div>
    </Field>
  );
}
