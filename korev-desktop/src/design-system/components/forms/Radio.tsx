import { cn } from '../../cn';
import {
  CHOICE_BOX_CLASS,
  CHOICE_BOX_IDLE_CLASS,
  ChoiceLabel,
  HIDDEN_INPUT_CLASS,
} from './Choice';

export interface RadioProps {
  label?: string;
  checked?: boolean;
  onChange?: (value: string | undefined) => void;
  name?: string;
  value?: string;
  disabled?: boolean;
  className?: string;
}

export function Radio({
  label,
  checked = false,
  onChange,
  name,
  value,
  disabled,
  className,
}: RadioProps) {
  return (
    <ChoiceLabel label={label} disabled={disabled} className={className}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.(value)}
        className={HIDDEN_INPUT_CLASS}
      />
      <span
        className={cn(
          CHOICE_BOX_CLASS,
          'rounded-full',
          checked ? 'border-[4.5px] border-accent' : CHOICE_BOX_IDLE_CLASS,
        )}
      />
    </ChoiceLabel>
  );
}
