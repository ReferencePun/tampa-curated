import type { APIRoute } from 'astro';
import { url } from '../lib/urls';
export const GET: APIRoute = ({ site }) => new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL(url('sitemap-index.xml'), site).href}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
