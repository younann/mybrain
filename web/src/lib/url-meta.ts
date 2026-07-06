export interface UrlMeta {
  title: string
  description: string
}

function firstMatch(html: string, pattern: RegExp): string {
  const m = html.match(pattern)
  return m?.[1]?.trim() ?? ''
}

/** Extracts title + description from raw HTML (pure; used by the server-side fetch). */
export function parseUrlMeta(html: string): UrlMeta {
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
  let description =
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    firstMatch(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
  if (!description) {
    description =
      firstMatch(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) ||
      firstMatch(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i)
  }
  return { title: decode(title), description: decode(description) }
}

/** Combined, human-readable summary of a page. */
export function urlMetaText(m: UrlMeta): string {
  if (m.title && m.description) return `${m.title}. ${m.description}`
  return m.title || m.description
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}
