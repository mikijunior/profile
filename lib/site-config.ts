const DEFAULT_SITE_URL = "http://127.0.0.1:3000";

export const siteTitle = "Serhii Drachuk | Senior PHP Laravel Developer";
export const siteDescription =
  "Senior PHP/Laravel developer building scalable SaaS platforms, analytics systems, e-commerce integrations, and real-time applications.";

export function getSiteOrigin() {
  const rawUrl =
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_SITE_URL);
  const urlWithScheme = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  try {
    return new URL(urlWithScheme).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function getSiteUrl() {
  return getSiteOrigin();
}
