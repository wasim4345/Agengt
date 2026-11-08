export function fingerprint(value: unknown): string {
  const json = JSON.stringify(value ?? null);
  let hash = 5381;
  for (let i = 0; i < json.length; i += 1) {
    hash = ((hash << 5) + hash) ^ json.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}
