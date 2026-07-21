import * as React from 'react';

import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { cn } from '~/lib/utils';

const HEX_COLOR_RE = /^#?([0-9a-fA-F]{6})$/;

function colorIntToHex(value: number): string {
  const rgb = value & 0xffffff;
  return `#${rgb.toString(16).padStart(6, '0')}`;
}

function hexToColorInt(hex: string): number | null {
  const match = HEX_COLOR_RE.exec(hex.trim());
  if (!match) return null;
  return Number.parseInt(match[1], 16);
}

function isColorInt(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

type ColorInputProps = Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'onChange'> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  /** When true, clearing the hex field emits `null`. Required fields should leave this false. */
  nullable?: boolean;
};

function ColorInput({
  className,
  value,
  onChange,
  onBlur,
  nullable = false,
  disabled,
  id,
  name,
  'aria-invalid': ariaInvalid,
  ...props
}: ColorInputProps) {
  const hasValue = isColorInt(value);
  const hexValue = hasValue ? colorIntToHex(value) : '';
  const [text, setText] = React.useState(hexValue);

  React.useEffect(() => {
    setText(hasValue ? colorIntToHex(value) : '');
  }, [hasValue, value]);

  const pickerValue = hasValue ? colorIntToHex(value) : '#000000';

  function commitText(next: string) {
    const trimmed = next.trim();
    if (trimmed === '') {
      setText('');
      onChange(nullable ? null : Number.NaN);
      return;
    }

    const parsed = hexToColorInt(trimmed);
    if (parsed == null) {
      setText(next);
      return;
    }

    const normalized = colorIntToHex(parsed);
    setText(normalized);
    onChange(parsed);
  }

  return (
    <InputGroup
      className={cn(disabled && 'opacity-50', className)}
      data-disabled={disabled || undefined}
    >
      <InputGroupInput
        id={id}
        name={name}
        value={text}
        placeholder="#000000"
        spellCheck={false}
        autoComplete="off"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        onBlur={(event) => {
          commitText(event.target.value);
          onBlur?.(event);
        }}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);

          if (next.trim() === '') {
            onChange(nullable ? null : Number.NaN);
            return;
          }

          const parsed = hexToColorInt(next);
          if (parsed != null) {
            onChange(parsed);
          }
        }}
        {...props}
      />
      <InputGroupAddon>
        <label
          className={cn(
            'relative size-5 shrink-0 overflow-hidden rounded-md border border-input shadow-xs',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          )}
        >
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundColor: hasValue ? pickerValue : 'transparent' }}
          />
          {!hasValue && (
            <span
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%),linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%)] bg-size-[6px_6px] bg-position-[0_0,3px_3px] opacity-60"
            />
          )}
          <input
            type="color"
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            value={pickerValue}
            disabled={disabled}
            tabIndex={-1}
            aria-label="Pick color"
            onChange={(event) => {
              const parsed = hexToColorInt(event.target.value);
              if (parsed == null) return;
              const normalized = colorIntToHex(parsed);
              setText(normalized);
              onChange(parsed);
            }}
          />
        </label>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { ColorInput, colorIntToHex, hexToColorInt };
