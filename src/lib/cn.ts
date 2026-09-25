/** Join class names, skipping empty ones: cn("a", flag && "b") */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
