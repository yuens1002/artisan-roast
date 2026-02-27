"use client";

import { useState, useTransition, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BREW_METHOD_LABELS } from "@/lib/types/roaster-brew-guide";
import { calculateCompletenessScore } from "@/lib/reviews/completeness-score";
import { submitReview } from "@/app/(site)/products/[slug]/review-actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star } from "lucide-react";

export function CompletenessBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-text-muted mb-1">
        <span>Completeness</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface BrewReportFormProps {
  productId: string;
  productName: string;
  productTastingNotes: string[];
  onSuccess?: () => void;
  onScoreChange?: (score: number) => void;
  stickySubmit?: boolean;
  isCoffee?: boolean;
}

export function BrewReportForm({
  productId,
  productName,
  productTastingNotes,
  onSuccess,
  onScoreChange,
  stickySubmit,
  isCoffee = true,
}: BrewReportFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [brewMethod, setBrewMethod] = useState<string>("");
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState("");
  const [grindSize, setGrindSize] = useState("");
  const [waterTempF, setWaterTempF] = useState("");
  const [ratio, setRatio] = useState("");
  const [error, setError] = useState<string | null>(null);

  const completenessScore = useMemo(
    () =>
      calculateCompletenessScore({
        content,
        title: title || undefined,
        rating,
        brewMethod: brewMethod || undefined,
        tastingNotes: selectedNotes.length > 0 ? selectedNotes : undefined,
        grindSize: grindSize || undefined,
        waterTempF: waterTempF ? parseInt(waterTempF, 10) : undefined,
        ratio: ratio || undefined,
      }),
    [rating, title, content, brewMethod, selectedNotes, grindSize, waterTempF, ratio]
  );

  useEffect(() => {
    onScoreChange?.(completenessScore);
  }, [completenessScore, onScoreChange]);

  const toggleNote = useCallback((note: string) => {
    setSelectedNotes((prev) =>
      prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]
    );
  }, []);

  const addCustomNote = useCallback(() => {
    const trimmed = customNote.trim();
    if (trimmed && !selectedNotes.includes(trimmed) && selectedNotes.length < 10) {
      setSelectedNotes((prev) => [...prev, trimmed]);
      setCustomNote("");
    }
  }, [customNote, selectedNotes]);

  const handleSubmit = () => {
    setError(null);
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    if (content.trim().length < 10) {
      setError("Review must be at least 10 characters");
      return;
    }

    startTransition(async () => {
      const result = await submitReview({
        productId,
        rating,
        title: title.trim() || undefined,
        content: content.trim(),
        brewMethod: brewMethod || undefined,
        tastingNotes: selectedNotes.length > 0 ? selectedNotes : undefined,
        grindSize: grindSize.trim() || undefined,
        waterTempF: waterTempF ? parseInt(waterTempF, 10) : undefined,
        ratio: ratio.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: isCoffee ? "Brew Report submitted!" : "Review submitted!",
          description: `Your review for ${productName} has been published.`,
        });
        onSuccess?.();
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="space-y-5">
      {/* Star picker */}
      <div>
        <label className="text-sm font-medium text-text-base block mb-1.5">
          Rating <span className="text-destructive">*</span>
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 transition-transform hover:scale-110"
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "h-7 w-7 transition-colors",
                  star <= displayRating
                    ? "fill-star text-star"
                    : "fill-none text-star-muted"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="review-title" className="text-sm font-medium text-text-base block mb-1.5">
          Title        </label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Sum up your experience"
        />
      </div>

      {/* Content */}
      <div>
        <label htmlFor="review-content" className="text-sm font-medium text-text-base block mb-1.5">
          Your Review <span className="text-destructive">*</span>
        </label>
        <Textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          minLength={10}
          maxLength={5000}
          rows={4}
          placeholder="Tell us about your brew..."
        />
        <p className="text-xs text-text-muted mt-1">
          {content.length}/5000
        </p>
      </div>

      {/* Brew method (coffee only) */}
      {isCoffee && (
        <div>
          <label className="text-sm font-medium text-text-base block mb-1.5">
            Brew Method          </label>
          <Select value={brewMethod} onValueChange={setBrewMethod}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select brew method" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BREW_METHOD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tasting notes (coffee only) */}
      {isCoffee && (
        <div>
          <label className="text-sm font-medium text-text-base block mb-1.5">
            Tasting Notes          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {productTastingNotes.map((note) => (
              <button
                key={note}
                type="button"
                onClick={() => toggleNote(note)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  selectedNotes.includes(note)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-text-muted hover:bg-muted/80"
                )}
              >
                {note}
              </button>
            ))}
            {selectedNotes
              .filter((n) => !productTastingNotes.includes(n))
              .map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => toggleNote(note)}
                  className="rounded-full px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground"
                >
                  {note} &times;
                </button>
              ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g., Caramel, Nutty"
              className="flex-1"
              maxLength={50}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomNote();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomNote}
              disabled={!customNote.trim() || selectedNotes.length >= 10}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Recipe details (coffee only) */}
      {isCoffee && (
        <div>
          <label className="text-sm font-medium text-text-base block mb-1.5">
            Recipe Details          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="grind-size" className="text-xs text-text-muted block mb-1">
                Grind Size
              </label>
              <Input
                id="grind-size"
                value={grindSize}
                onChange={(e) => setGrindSize(e.target.value)}
                placeholder="e.g., Medium-fine"
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="water-temp" className="text-xs text-text-muted block mb-1">
                Water Temp (°F)
              </label>
              <Input
                id="water-temp"
                type="number"
                value={waterTempF}
                onChange={(e) => setWaterTempF(e.target.value)}
                placeholder="e.g., 200"
                min={100}
                max={300}
              />
            </div>
            <div>
              <label htmlFor="ratio" className="text-xs text-text-muted block mb-1">
                Ratio
              </label>
              <Input
                id="ratio"
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                placeholder="e.g., 1:16"
                maxLength={50}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Submit */}
      <div className={cn(stickySubmit && "sticky bottom-0 bg-background pt-3 pb-1 -mb-1 border-t border-border")}>
        <Button
          onClick={handleSubmit}
          disabled={isPending || rating === 0}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            isCoffee ? "Submit Brew Report" : "Submit Review"
          )}
        </Button>
      </div>
    </div>
  );
}
