import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a numeric string/number with a fixed number of decimals, or "---" if not a number. */
export function formatNumber(value: string | number | null | undefined, decimals = 2) {
  const number = Number(value);
  return value === null || value === undefined || value === "" || Number.isNaN(number)
    ? "---"
    : number.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
