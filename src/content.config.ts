import { defineCollection, reference } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { categories } from "./config/site";
const common = {
  title: z.string(),
  deck: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  treatment: z
    .enum(["natural", "mono", "blue", "red", "ochre"])
    .default("natural"),
  demo: z.boolean().default(true),
  order: z.number().default(99),
};
const neighborhoods = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/neighborhoods" }),
  schema: z.object({ ...common, character: z.string() }),
});
const stories = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/stories" }),
  schema: z.object({
    ...common,
    category: z.string(),
    neighborhood: reference("neighborhoods"),
    author: z.string().default("The editors"),
    date: z.coerce.date(),
    readTime: z.string(),
    featured: z.boolean().default(false),
  }),
});
const people = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/people" }),
  schema: z.object({
    ...common,
    profession: z.string(),
    neighborhood: reference("neighborhoods"),
    instagram: z.url().optional(),
    website: z.url().optional(),
  }),
});
const businesses = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/businesses" }),
  schema: z.object({
    ...common,
    categories: z.array(z.enum(categories)).min(1),
    neighborhood: reference("neighborhoods"),
    address: z.string().nullable().default(null),
    website: z.url().optional(),
    instagram: z.url().optional(),
  }),
});
export const collections = { stories, people, businesses, neighborhoods };
