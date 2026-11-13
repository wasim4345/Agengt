/** Project Pages base (e.g. `/Agengt`). Empty for local / Cursor hosting. */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

/** Prefix an app-absolute path with the deploy basePath. */
export function withBasePath(path: string): string {
  const base = getBasePath();
  if (!path.startsWith("/")) return path;
  if (!base) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path}`;
}

/** Full-page navigation that respects GitHub Pages basePath. */
export function navigate(path: string): void {
  if (typeof window === "undefined") return;
  window.location.href = withBasePath(path);
}
