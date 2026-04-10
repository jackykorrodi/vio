const submitted = new Set<string>();

export function checkDuplicate(key: string): boolean {
  if (submitted.has(key)) return true;
  submitted.add(key);
  setTimeout(() => submitted.delete(key), 300_000); // 5 Min TTL
  return false;
}
