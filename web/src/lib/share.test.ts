import { describe, it, expect } from 'vitest'
import { parseShare, isShareLaunch } from './share'

describe('parseShare', () => {
  it('returns the url when only a url is shared', () => {
    expect(parseShare('?url=https://tiktok.com/x')).toBe('https://tiktok.com/x')
  })

  it('merges text and url (TikTok-style share)', () => {
    expect(parseShare('?text=Check%20this&url=https://x.com/v')).toBe('Check this https://x.com/v')
  })

  it('drops a title that is a prefix of the text', () => {
    expect(parseShare('?title=Great%20pasta&text=Great%20pasta%20recipe%20here')).toBe(
      'Great pasta recipe here',
    )
  })

  it('returns undefined when nothing is shared', () => {
    expect(parseShare('')).toBeUndefined()
    expect(parseShare('?foo=bar')).toBeUndefined()
  })
})

describe('isShareLaunch', () => {
  it('detects the share route', () => {
    expect(isShareLaunch('/share')).toBe(true)
    expect(isShareLaunch('/')).toBe(false)
  })
})
