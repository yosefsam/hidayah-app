/** Normalize `profiles.is_pro` / API `subscription.isPro` (boolean or rare string/number from drivers). */
export function coerceProfileIsPro(value: unknown): boolean {
  return value === true || value === "true" || value === "t" || value === 1;
}

export function coerceProfileIsFree(value: unknown): boolean {
  return value === false || value === "false" || value === "f" || value === 0;
}
