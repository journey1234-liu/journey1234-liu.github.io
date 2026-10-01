// Base-path resolution for assets and public data.
//
// GitHub Pages hosts the site either at the repository root (custom domain,
// user/org site) or under a project subpath. Every asset and data URL must be
// resolved against the configured base so nothing breaks after a migration.

/** Join a base path and a relative path, normalising slashes. Pure/testable. */
export function joinBase(base: string, relativePath: string): string {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedRelative = relativePath.replace(/^\/+/, "");
  return `${normalizedBase}${normalizedRelative}`;
}

/** The build-time base path (Vite exposes it via `import.meta.env.BASE_URL`). */
export function currentBase(): string {
  const base = import.meta.env.BASE_URL;
  return base && base !== "/" ? base : "/";
}

/** Resolve a public asset/data path against the current base. */
export function resolveAsset(relativePath: string): string {
  return joinBase(currentBase(), relativePath);
}
