/** All internal URLs must pass through this helper for GitHub project sites. */
export function url(path = ""): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
