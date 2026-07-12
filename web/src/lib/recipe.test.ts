import { describe, it, expect } from 'vitest'
import { isRecipe, parseRecipeMarkdown } from './recipe'
import { formatRecipe } from './gemini-shapes'

describe('isRecipe', () => {
  it('is true only for url entries tagged recipe', () => {
    expect(isRecipe({ type: 'url', tags: ['recipe', 'dinner'] })).toBe(true)
    expect(isRecipe({ type: 'url', tags: ['article'] })).toBe(false)
    expect(isRecipe({ type: 'text', tags: ['recipe'] })).toBe(false)
  })
})

describe('parseRecipeMarkdown', () => {
  it('round-trips the markdown produced by formatRecipe', () => {
    const md = formatRecipe('Pesto Pasta', {
      ingredients: ['200g pasta', '50g basil'],
      steps: ['Boil pasta', 'Blend basil', 'Toss together'],
    })
    const r = parseRecipeMarkdown(md)
    expect(r.title).toBe('Pesto Pasta')
    expect(r.ingredients).toEqual(['200g pasta', '50g basil'])
    expect(r.steps).toEqual(['Boil pasta', 'Blend basil', 'Toss together'])
  })

  it('tolerates a missing section', () => {
    const r = parseRecipeMarkdown('# Toast\n\n**Steps**\n1. Toast bread')
    expect(r.title).toBe('Toast')
    expect(r.ingredients).toEqual([])
    expect(r.steps).toEqual(['Toast bread'])
  })
})
