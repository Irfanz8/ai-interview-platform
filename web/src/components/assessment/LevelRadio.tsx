import { useId } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { LEVEL_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";

interface LevelRadioProps {
  value: number;
  onChange: (level: number) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export default function LevelRadio({
  value,
  onChange,
  disabled,
  className,
  ariaLabel = "Skill proficiency level",
}: LevelRadioProps) {
  const instanceId = useId();

  return (
    <RadioGroup
      aria-label={ariaLabel}
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
      disabled={disabled}
      className={cn("flex flex-wrap items-center gap-3", className)}
    >
      {[1, 2, 3, 4, 5].map((level) => {
        const itemId = `${instanceId}-level-${level}`;
        return (
          <div key={level} className="flex items-center gap-1.5">
            <RadioGroupItem value={String(level)} id={itemId} />
            <Label htmlFor={itemId} className="cursor-pointer font-normal">
              {LEVEL_LABELS[level]}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}
