/**
 * Public files (engine, data) under the site's base path, so the app works both at
 * the root (npm run dev) and under a GitHub Pages subpath (usuario.github.io/GodChess/).
 */
export const siteBase = () => new URL(import.meta.env.BASE_URL, document.baseURI).href;
export const asset = (path: string) => new URL(path.replace(/^\//, ''), siteBase()).href;
