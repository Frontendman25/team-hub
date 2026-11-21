import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WorkspaceNavItem } from './workspace-nav-item'

describe('workspace navigation items', () => {
  it('keeps a locked section focusable and explains it without a navigable URL', () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceNavItem, {
        label: 'Messages',
        href: '/not-allowed',
        locked: true,
        children: 'Messages'
      })
    )
    expect(html).toContain('type="button"')
    expect(html).toContain('aria-disabled="true"')
    expect(html).not.toContain(' disabled=')
    expect(html).not.toContain('href=')
    expect(html).not.toContain('tabindex="-1"')
    const id = html.match(/aria-describedby="([^"]+)"/)?.[1]
    expect(id).toBeTruthy()
    expect(html).toContain(`id="${id}" role="tooltip"`)
    expect(html).toContain('Create or join a workspace to use Messages.')
  })
  it('uses a regular link once a workspace is selected', () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceNavItem, {
        label: 'Messages',
        href: '/w/team/messages',
        children: 'Messages'
      })
    )
    expect(html).toContain('href="/w/team/messages"')
    expect(html).not.toContain('aria-disabled')
    expect(html).not.toContain('role="tooltip"')
  })
})
