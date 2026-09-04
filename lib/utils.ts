import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names and resolves Tailwind CSS class conflicts safely.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
