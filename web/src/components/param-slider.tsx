"use client";

type Props = {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
};

export function ParamSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: Props) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-sm text-white/90">{label}</div>
          <div className="text-[11px] leading-snug text-white/40">{hint}</div>
        </div>
        <div className="shrink-0 font-mono text-xs text-violet-300">
          {value.toFixed(step < 1 ? 2 : 1)}
          {unit}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-violet-400"
      />
    </label>
  );
}
