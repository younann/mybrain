import { describe, it, expect } from 'vitest'
import { parseUrlMeta, urlMetaText, parseJsonLdRecipe } from './url-meta'

describe('parseUrlMeta', () => {
  it('extracts title and meta description', () => {
    const html = `<html><head><title>Best Perfumes</title>
      <meta name="description" content="Buy niche perfume online"></head></html>`
    const m = parseUrlMeta(html)
    expect(m.title).toBe('Best Perfumes')
    expect(m.description).toBe('Buy niche perfume online')
  })

  it('falls back to og:description and decodes entities', () => {
    const html = `<title>Shop &amp; Co</title>
      <meta property="og:description" content="Oud &amp; musk">`
    const m = parseUrlMeta(html)
    expect(m.title).toBe('Shop & Co')
    expect(m.description).toBe('Oud & musk')
  })

  it('urlMetaText combines title and description', () => {
    expect(urlMetaText({ title: 'A', description: 'B' })).toBe('A. B')
    expect(urlMetaText({ title: 'A', description: '' })).toBe('A')
  })
})

describe('parseJsonLdRecipe', () => {
  it('extracts a Recipe with HowToStep instructions', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'Pesto Pasta',
      recipeIngredient: ['200g pasta', '50g basil'],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Boil pasta' },
        { '@type': 'HowToStep', text: 'Blend basil' },
      ],
    })}</script>`
    const r = parseJsonLdRecipe(html)
    expect(r?.name).toBe('Pesto Pasta')
    expect(r?.ingredients).toEqual(['200g pasta', '50g basil'])
    expect(r?.steps).toEqual(['Boil pasta', 'Blend basil'])
  })

  it('finds a Recipe nested in an @graph and decodes entities', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@graph': [
        { '@type': 'WebPage' },
        {
          '@type': ['Recipe', 'Thing'],
          name: 'Mac &amp; Cheese',
          recipeIngredient: ['cheese'],
          recipeInstructions: 'Melt cheese\nStir',
        },
      ],
    })}</script>`
    const r = parseJsonLdRecipe(html)
    expect(r?.name).toBe('Mac & Cheese')
    expect(r?.steps).toEqual(['Melt cheese', 'Stir'])
  })

  it('returns null when no Recipe node is present', () => {
    expect(parseJsonLdRecipe('<script type="application/ld+json">{"@type":"Article"}</script>')).toBeNull()
    expect(parseJsonLdRecipe('<html>no json-ld here</html>')).toBeNull()
  })
})
