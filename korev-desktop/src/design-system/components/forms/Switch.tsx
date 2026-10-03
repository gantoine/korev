import { cn } from '../../cn';
import { ChoiceLabel, HIDDEN_INPUT_CLASS } from './Choice';

export interface SwitchProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const TRACK =
  'relative h-4 w-7 flex-none rounded-full bg-gray-400 transition-colors duration-(--dur-base) ease-out peer-focus-visible:shadow-focus after:absolute after:top-0.5 after:left-0.5 after:size-3 after:rounded-full after:bg-white after:transition-transform after:duration-(--dur-base) after:ease-out';

export function Switch({
  label,
  checked = false,
  onChange,
  disabled,
  className,
}: SwitchProps) {
  return (
    <ChoiceLabel label={label} disabled={disabled} className={className}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className={HIDDEN_INPUT_CLASS}
      />
      <span className={cn(TRACK, checked && 'bg-accent after:translate-x-3')} />
    </ChoiceLabel>
  );
}
