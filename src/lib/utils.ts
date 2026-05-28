import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse JSON from localStorage or any string.
 * Returns fallback if parsing fails or value is null/undefined.
 */
export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch (e) {
    console.warn('safeJsonParse: failed to parse JSON, returning fallback', e);
    return fallback;
  }
}
