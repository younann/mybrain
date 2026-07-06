import { describe, it, expect } from 'vitest'
import { parseUrlMeta, urlMetaText } from './url-meta'

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
