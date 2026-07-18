import { XIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { EDUCATION_LETTERS } from '~/lib/education-letters';
import { cn } from '~/lib/utils';

type EducationLetterSelectorProps = {
  value: string[];
  onChange: (value: string[]) => void;
  letters?: readonly string[];
};

type LetterButtonProps = {
  letter: string;
  selected: boolean;
  showRemoveOnHover: boolean;
  variant: 'outline' | 'default' | 'secondary';
  ariaLabel: string;
  onClick: () => void;
};

function LetterButton({
  letter,
  selected,
  showRemoveOnHover,
  variant,
  ariaLabel,
  onClick,
}: LetterButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size="icon-lg"
      lang="ug"
      className={cn(showRemoveOnHover && 'relative')}
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <span
        className={cn(
          showRemoveOnHover && 'group-hover/button:invisible group-focus-visible/button:invisible',
        )}
      >
        {letter}
      </span>
      {showRemoveOnHover && (
        <XIcon
          aria-hidden
          className="absolute opacity-0 group-hover/button:opacity-100 group-focus-visible/button:opacity-100"
        />
      )}
    </Button>
  );
}

export function EducationLetterSelector({
  value,
  onChange,
  letters = EDUCATION_LETTERS,
}: EducationLetterSelectorProps) {
  const selectedSet = new Set(value);
  const allSelected = letters.every((letter) => selectedSet.has(letter));

  const addLetter = (letter: string) => {
    if (selectedSet.has(letter)) return;
    onChange([...value, letter]);
  };

  const removeLetter = (index: number) => {
    onChange(value.filter((_, letterIndex) => letterIndex !== index));
  };

  const selectAll = () => {
    onChange([...letters]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {value.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No letters selected yet, click on letters below to select them
          </span>
        )}
        {value.map((letter, index) => (
          <LetterButton
            key={`${letter}-${index}`}
            letter={letter}
            selected
            showRemoveOnHover
            variant="outline"
            ariaLabel={`Remove letter ${letter}`}
            onClick={() => removeLetter(index)}
          />
        ))}
      </div>

      <Card size="sm">
        <CardContent className="flex flex-wrap gap-1">
          {letters.map((letter) => {
            const isSelected = selectedSet.has(letter);

            return (
              <LetterButton
                key={letter}
                letter={letter}
                selected={isSelected}
                showRemoveOnHover={isSelected}
                variant={isSelected ? 'default' : 'secondary'}
                ariaLabel={isSelected ? `Deselect letter ${letter}` : `Select letter ${letter}`}
                onClick={() => {
                  if (isSelected) {
                    removeLetter(value.indexOf(letter));
                  } else {
                    addLetter(letter);
                  }
                }}
              />
            );
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (allSelected) {
                onChange([]);
              } else {
                selectAll();
              }
            }}
            size="icon-lg"
          >
            All
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
