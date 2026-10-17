import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { execFileSync } from "node:child_process";

// CI passes SITE_URL/BASE_PATH from official GitHub Pages metadata, including
// an existing inherited custom domain. Fall back to repository identity locally.
let repository = process.env.GITHUB_REPOSITORY || "";
if (!repository) {
  try {
    const origin = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    repository =
      origin.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1] || "";
  } catch {
    /* A new checkout can be previewed before connecting GitHub. */
  }
}
const [owner, repo] = repository.split("/");
const rootRepository =
  !!owner && repo?.toLowerCase() === `${owner.toLowerCase()}.github.io`;
const site =
  process.env.SITE_URL ||
  (owner ? `https://${owner}.github.io` : "http://localhost:4321");
const base =
  process.env.BASE_PATH ?? (owner && !rootRepository ? `/${repo}` : "/");

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap({ filter: (page) => !page.includes("/search/") })],
  build: { format: "directory" },
  vite: { build: { sourcemap: false } },
});
