import { describe, it, expect, vi, beforeEach } from 'vitest'
import { describeImage, answerQuestion } from './api'
import type { SupabaseClient } from '@supabase/supabase-js'

const sb = {
  auth: { getSession: async () => ({ data: { session: { access_token: 'tok123' } } }) },
} as unknown as SupabaseClient

describe('api client', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('posts to /api/gemini with the bearer token and returns text', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ text: 'a cafe' }), { status: 200 }))

    const out = await describeImage(sb, 'BASE64')
    expect(out).toBe('a cafe')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/gemini')
    expect((init!.headers as Record<string, string>).authorization).toBe('Bearer tok123')
    expect(JSON.parse(init!.body as string)).toEqual({ action: 'describe', imageBase64: 'BASE64' })
  })

  it('answerQuestion sends question + notes', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ text: 'go here\nSOURCES: 0' }), { status: 200 }))

    const out = await answerQuestion(sb, 'where?', [{ index: 0, text: 'cafe' }])
    expect(out).toContain('SOURCES: 0')
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string)
    expect(body.action).toBe('answer')
    expect(body.notes).toEqual([{ index: 0, text: 'cafe' }])
  })

  it('throws with the server error message on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'quota' }), { status: 502 }),
    )
    await expect(answerQuestion(sb, 'x', [])).rejects.toThrow('quota')
  })
})
