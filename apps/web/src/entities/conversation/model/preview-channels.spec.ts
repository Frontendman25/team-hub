import { describe, expect, it } from 'vitest'
import { previewChannels } from './preview-channels'

const channels = [
  { id: '1', name: 'random' },
  { id: '2', name: 'general' },
  { id: '3', name: 'design' },
  { id: '4', name: 'engineering' },
  { id: '5', name: 'marketing' },
  { id: '6', name: 'product' },
  { id: '7', name: 'sales' }
]

describe('previewChannels', () => {
  it('sorts alphabetically and keeps five until expanded', () => {
    const collapsed = previewChannels(channels, false)
    expect(collapsed.hiddenCount).toBe(2)
    expect(collapsed.visible.map((row) => row.name)).toEqual([
      'design',
      'engineering',
      'general',
      'marketing',
      'product'
    ])

    const expanded = previewChannels(channels, true)
    expect(expanded.visible).toHaveLength(7)
    expect(expanded.visible.at(-1)?.name).toBe('sales')
  })

  it('keeps the active channel visible when it sits below the fold', () => {
    const result = previewChannels(channels, false, '1')
    expect(result.visible.map((row) => row.name)).toEqual([
      'design',
      'engineering',
      'general',
      'marketing',
      'product',
      'random'
    ])
  })
})
