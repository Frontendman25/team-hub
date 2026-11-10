import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ProfileUnavailable } from './profile-unavailable'

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }))

describe('unavailable profile', () => {
  it('renders an explanation, back button and a fallback home link', () => {
    const html = renderToStaticMarkup(createElement(ProfileUnavailable))
    expect(html).toContain('Profile unavailable')
    expect(html).toContain('not available to you')
    expect(html).toContain('Go back')
    expect(html).toContain('href="/"')
  })
})
