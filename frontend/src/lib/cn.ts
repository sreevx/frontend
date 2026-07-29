import clsx from "clsx";

/**
 * Compact cn() helper — used everywhere classNames are composed conditionally.
 */
export function cn(...inputs: Parameters<typeof clsx>): string {
  return clsx(...inputs);
}