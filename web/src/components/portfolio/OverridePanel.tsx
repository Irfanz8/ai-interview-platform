import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import LevelRadio from "@/components/assessment/LevelRadio";
import LevelBadge from "./LevelBadge";
import { portfoliosApi } from "@/services/portfolios";
import { Loader2, Pencil } from "lucide-react";
import { parseLevel } from "@/utils/constants";
import { toast } from "@/components/ui/toast";
import type { PortfolioSkill, AssessorOverride } from "@/types";

interface OverridePanelProps {
  skill: PortfolioSkill;
  existingOverride?: AssessorOverride;
  onSaved: (override: AssessorOverride) => void;
}

const MIN_NOTES_LENGTH = 5;

export default function OverridePanel({
  skill,
  existingOverride,
  onSaved,
}: OverridePanelProps) {
  const aiNumericLevel = parseLevel(skill.ai_level);
  const [open, setOpen] = useState(false);
  const [overrideLevel, setOverrideLevel] = useState(
    existingOverride?.override_level ?? aiNumericLevel
  );
  const [notes, setNotes] = useState(existingOverride?.assessor_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);

  const hasOverride = !!existingOverride;
  const notesInputId = `override-notes-${skill.id}`;
  const errorMessageId = `override-error-${skill.id}`;

  useEffect(() => {
    if (!open && !saveError) {
      setOverrideLevel(existingOverride?.override_level ?? aiNumericLevel);
      setNotes(existingOverride?.assessor_notes ?? "");
    }
  }, [existingOverride, aiNumericLevel, open, saveError]);

  useEffect(() => {
    if (open) {
      notesTextareaRef.current?.focus();
    } else if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      triggerButtonRef.current?.focus();
    }
  }, [open]);

  const handleOpen = () => {
    setValidationError(null);
    setSaveError(null);
    setOverrideLevel(existingOverride?.override_level ?? aiNumericLevel);
    setNotes(existingOverride?.assessor_notes ?? "");
    setOpen(true);
  };

  const handleClose = () => {
    if (saving) return;
    shouldRestoreFocusRef.current = true;
    setValidationError(null);
    setSaveError(null);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !saving) {
      e.stopPropagation();
      handleClose();
    }
  };

  const handleSave = async () => {
    if (saving) return;

    const trimmed = notes.trim();
    if (trimmed.length < MIN_NOTES_LENGTH) {
      setValidationError(
        `Please provide a brief rationale (at least ${MIN_NOTES_LENGTH} characters) explaining this override.`
      );
      notesTextareaRef.current?.focus();
      return;
    }

    setValidationError(null);
    setSaveError(null);
    setSaving(true);

    try {
      const res = await portfoliosApi.getOverride(skill.id, {
        override_level: overrideLevel,
        assessor_notes: trimmed,
      });
      onSaved(res.data.override);
      shouldRestoreFocusRef.current = true;
      setOpen(false);
      toast.success(
        `Rating updated to L${overrideLevel} for ${skill.skill_label || "skill"}.`,
        "Override Saved"
      );
    } catch (err: unknown) {
      const errData = (
        err as {
          response?: {
            data?: {
              error?: string;
              errors?: Array<string | { message?: string }>;
            };
          };
        }
      )?.response?.data;
      const firstErr = errData?.errors?.[0];
      const serverMsg =
        errData?.error ??
        (typeof firstErr === "string" ? firstErr : firstErr?.message);
      const displayMsg = serverMsg
        ? `${serverMsg} (Your changes have been preserved.)`
        : "Failed to save override. Your changes have been preserved—please try again.";
      setSaveError(displayMsg);
      toast.error(serverMsg || "Failed to save override.", "Override Error");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {hasOverride ? (
          <>
            <div
              className="flex items-center gap-1.5 text-sm"
              aria-label={`AI rating L${aiNumericLevel} overridden to L${existingOverride.override_level}`}
            >
              <LevelBadge level={aiNumericLevel} size="sm" />
              <span className="text-muted-foreground text-xs">AI</span>
              <span className="text-muted-foreground" aria-hidden="true">
                →
              </span>
              <LevelBadge level={existingOverride.override_level} size="sm" />
              <span className="text-xs text-green-700 font-medium">
                Overridden ✓
              </span>
            </div>
            <Button
              ref={triggerButtonRef}
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpen}
              aria-expanded={open}
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit override
            </Button>
          </>
        ) : (
          <Button
            ref={triggerButtonRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpen}
            aria-expanded={open}
          >
            Override rating ▼
          </Button>
        )}
      </div>
    );
  }

  const activeError = validationError || saveError;

  return (
    <div
      role="region"
      aria-label={`Assessor override for ${skill.skill_label}`}
      onKeyDown={handleKeyDown}
      className="border rounded-lg p-4 space-y-3 bg-muted/30 w-full sm:w-auto sm:min-w-[300px]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Assessor Override ({skill.skill_label})
        </span>
        <span className="text-xs text-muted-foreground">
          AI rating: L{aiNumericLevel}
        </span>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Your rating:</Label>
        <LevelRadio
          value={overrideLevel}
          onChange={setOverrideLevel}
          disabled={saving}
          ariaLabel={`Override proficiency level for ${skill.skill_label}`}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={notesInputId} className="text-sm">
          Override rationale <span className="text-destructive">*</span>
        </Label>
        <Textarea
          ref={notesTextareaRef}
          id={notesInputId}
          value={notes}
          disabled={saving}
          aria-required="true"
          aria-invalid={!!activeError}
          aria-describedby={activeError ? errorMessageId : undefined}
          onChange={(e) => {
            setNotes(e.target.value);
            if (validationError && e.target.value.trim().length >= MIN_NOTES_LENGTH) {
              setValidationError(null);
            }
          }}
          rows={3}
          placeholder="Explain the behavioral evidence supporting this rating (min. 5 characters)..."
        />
      </div>

      {activeError && (
        <p
          id={errorMessageId}
          role="alert"
          className="text-xs text-destructive font-medium"
        >
          {activeError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClose}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Save override
        </Button>
      </div>
    </div>
  );
}
