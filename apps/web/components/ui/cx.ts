/** Joins class names, skipping falsy values. */
export function cx(...classes: Array<string | number | bigint | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
