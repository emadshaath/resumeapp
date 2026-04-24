"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

/**
 * Minimal native-range slider styled to match the app. Gives us real drag UX
 * without pulling in a new radix dependency.
 */
export function Slider({ value, onChange, min, max, step, className, disabled, ...aria }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("relative flex h-6 items-center", className)}>
      {/* Track */}
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      {/* Fill */}
      <div
        className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-brand transition-[width]"
        style={{ width: `${pct}%` }}
      />
      {/* Thumb (purely decorative; real thumb is the native input) */}
      <div
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full border-2 border-brand bg-white shadow-sm transition-[left] dark:bg-zinc-950"
        style={{ left: `${pct}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-transparent active:[&::-webkit-slider-thumb]:cursor-grabbing [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
        {...aria}
      />
    </div>
  );
}
