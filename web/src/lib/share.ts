/**
 * Builds the chat message from PWA share-target query params. The OS spreads a
 * shared item across title/text/url inconsistently (e.g. TikTok puts the link
 * in `text`), so we merge them and let the capture flow find the URL.
 * Returns undefined when nothing was shared.
 */
export function parseShare(search: string): string | undefined {
  const p = new URLSearchParams(search)
  const merged = [p.get('title'), p.get('text'), p.get('url')]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
  // De-dupe: a title that's a prefix of the text (common) adds no signal.
  const parts = merged.filter((s, i) => !merged.some((o, j) => j !== i && o.includes(s) && o !== s))
  const msg = parts.join(' ').trim()
  return msg || undefined
}

/** True when the app was opened via the share target route. */
export function isShareLaunch(pathname: string): boolean {
  return pathname === '/share'
}
