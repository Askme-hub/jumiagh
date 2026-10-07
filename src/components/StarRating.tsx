import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = 14,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-warning", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= Math.round(value) ? "currentColor" : "none"}
          strokeWidth={1.5}
          className={i <= Math.round(value) ? "" : "text-muted-foreground/40"}
        />
      ))}
    </span>
  );
}

export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          aria-label={`${i} star${i === 1 ? "" : "s"}`}
          className="p-1 transition active:scale-90"
        >
          <Star
            size={26}
            fill={i <= value ? "currentColor" : "none"}
            strokeWidth={1.5}
            className={i <= value ? "text-warning" : "text-muted-foreground/40"}
          />
        </button>
      ))}
    </div>
  );
}
