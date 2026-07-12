import type { Entry } from './types'

export interface ParsedRecipe {
  title: string
  ingredients: string[]
  steps: string[]
}

/** A captured recipe: a URL entry tagged `recipe` (see gemini captureUrl flow). */
export function isRecipe(e: Pick<Entry, 'type' | 'tags'>): boolean {
  return e.type === 'url' && (e.tags ?? []).includes('recipe')
}

/**
 * Reconstructs a recipe from the markdown produced by `formatRecipe`
 * (# title / **Ingredients** with `- ` bullets / **Steps** with `N.` numbers).
 * Pure; tolerant of missing sections.
 */
export function parseRecipeMarkdown(md: string): ParsedRecipe {
  const lines = md.split('\n').map((l) => l.trim())
  let section: 'ingredients' | 'steps' | null = null
  const title = lines.find((l) => l.startsWith('# '))?.slice(2).trim() ?? ''
  const ingredients: string[] = []
  const steps: string[] = []
  for (const line of lines) {
    const heading = line.replace(/\*/g, '').toLowerCase()
    if (heading === 'ingredients') {
      section = 'ingredients'
      continue
    }
    if (heading === 'steps') {
      section = 'steps'
      continue
    }
    if (section === 'ingredients' && line.startsWith('- ')) {
      ingredients.push(line.slice(2).trim())
    } else if (section === 'steps') {
      const m = line.match(/^\d+\.\s+(.*)$/)
      if (m) steps.push(m[1].trim())
    }
  }
  return { title, ingredients, steps }
}
