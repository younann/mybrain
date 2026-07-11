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

export interface JsonLdRecipe {
  name: string
  ingredients: string[]
  steps: string[]
}

/**
 * Extracts a schema.org/Recipe from JSON-LD `<script>` blocks (pure).
 * Recipe blogs embed full ingredients + instructions here — the best source
 * when present. Returns null if no Recipe node is found.
 */
export function parseJsonLdRecipe(html: string): JsonLdRecipe | null {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )
  for (const b of blocks) {
    const node = findRecipeNode(safeJson(b[1]))
    if (node) {
      const name = decode(String(node.name ?? '').trim())
      const ingredients = toStringList(node.recipeIngredient).map(decode)
      const steps = parseInstructions(node.recipeInstructions).map(decode)
      if (ingredients.length || steps.length) return { name, ingredients, steps }
    }
  }
  return null
}

type JsonNode = Record<string, unknown>

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw.trim())
  } catch {
    return null
  }
}

/** Walks a JSON-LD value (object, array, or @graph) for a node typed Recipe. */
function findRecipeNode(value: unknown): JsonNode | null {
  if (Array.isArray(value)) {
    for (const v of value) {
      const found = findRecipeNode(v)
      if (found) return found
    }
    return null
  }
  if (value && typeof value === 'object') {
    const obj = value as JsonNode
    const type = obj['@type']
    const types = Array.isArray(type) ? type : [type]
    if (types.some((t) => String(t).toLowerCase() === 'recipe')) return obj
    if ('@graph' in obj) return findRecipeNode(obj['@graph'])
  }
  return null
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return typeof value === 'string' ? [value.trim()] : []
  return value.map((v) => String(v).trim()).filter(Boolean)
}

/** recipeInstructions may be strings, HowToStep objects, or HowToSection groups. */
function parseInstructions(value: unknown): string[] {
  if (typeof value === 'string') return value.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    if (typeof item === 'string') {
      if (item.trim()) out.push(item.trim())
    } else if (item && typeof item === 'object') {
      const obj = item as JsonNode
      if (Array.isArray(obj.itemListElement)) out.push(...parseInstructions(obj.itemListElement))
      else if (typeof obj.text === 'string' && obj.text.trim()) out.push(obj.text.trim())
    }
  }
  return out
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
