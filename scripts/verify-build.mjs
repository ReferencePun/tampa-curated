import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import config from "../astro.config.mjs";
const root = path.resolve("dist");
const base = (config.base || "/").replace(/\/$/, "");
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : path.join(dir, e.name),
      ),
    )
  ).flat();
}
const files = await walk(root);
const htmls = files.filter((f) => f.endsWith(".html"));
const failures = [];
const titles = new Set();
let checked = 0;
async function check(raw, from) {
  const value = raw.replaceAll("&amp;", "&");
  if (/^(https?:|mailto:|tel:|data:|#)/.test(value)) return;
  if (!value || value.startsWith("javascript:")) {
    failures.push(`${from}: placeholder ${value}`);
    return;
  }
  const clean = decodeURIComponent(value.split(/[?#]/)[0]);
  if (
    clean.startsWith("/") &&
    base &&
    !(clean === base || clean.startsWith(base + "/"))
  ) {
    failures.push(`${from}: missing base ${clean}`);
    return;
  }
  const target = clean.startsWith("/")
    ? path.join(root, base ? clean.slice(base.length) : clean)
    : path.resolve(path.dirname(from), clean);
  try {
    const s = await stat(target);
    if (s.isDirectory()) await stat(path.join(target, "index.html"));
    checked++;
  } catch {
    failures.push(`${path.relative(root, from)}: missing ${clean}`);
  }
}
for (const file of htmls) {
  const html = await readFile(file, "utf8");
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  if (!title || titles.has(title))
    failures.push(`Missing or duplicate title: ${file}`);
  titles.add(title);
  if ((html.match(/<h1(?:\s|>)/g) || []).length !== 1)
    failures.push(`Expected one h1: ${file}`);
  if (!html.includes('name="description"'))
    failures.push(`Missing description: ${file}`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]*)"/g))
    await check(match[1], file);
  for (const match of html.matchAll(/\bsrcset="([^"]*)"/g))
    for (const item of match[1].split(","))
      await check(item.trim().split(/\s+/)[0], file);
  for (const match of html.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))
    await check(match[1], file);
}
for (const file of files.filter((f) => f.endsWith(".css"))) {
  const css = await readFile(file, "utf8");
  for (const match of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))
    await check(match[1], file);
}
for (const route of [
  "index.html",
  "places/index.html",
  "people/index.html",
  "stories/index.html",
  "neighborhoods/index.html",
  "issues/index.html",
  "issues/001/index.html",
  "guides/index.html",
  "guides/a-first-look/index.html",
  "guides/after-dark/index.html",
  "guides/creative-tampa/index.html",
  "photo-journal/index.html",
  "the-list/index.html",
  "about/index.html",
  "search/index.html",
  "credits/index.html",
  "404.html",
  "robots.txt",
  "sitemap-index.xml",
])
  if (!files.includes(path.join(root, route)))
    failures.push(`Missing required route: ${route}`);
assert.equal(failures.length, 0, failures.join("\n"));
console.log(
  `Verified ${htmls.length} HTML pages and ${checked} internal links/assets at base "${base || "/"}". Unique titles, descriptions, and single h1: passed.`,
);
