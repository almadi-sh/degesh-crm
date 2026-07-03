import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Consolidate crop-protection subcategories into a single "СЗР" label for display.
const SZR_KEYWORDS = [
  "гербицид",
  "фунгицид",
  "инсектицид",
  "пестицид",
  "протравител",
  "средства защиты",
  "сзр",
];

export function displayCategory(category?: string | null): string {
  if (!category) return "—";
  const lower = category.toLowerCase();
  if (SZR_KEYWORDS.some((k) => lower.includes(k))) return "СЗР";
  return category;
}
