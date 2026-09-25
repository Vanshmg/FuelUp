/** Random unique ids for stored records. Works in modern browsers and Node. */
export function newId(): string {
  return crypto.randomUUID();
}
