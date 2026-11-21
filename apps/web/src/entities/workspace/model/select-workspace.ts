import type { Workspace } from '@/shared/types/api'

// Only choose from memberships returned by the API. Never add the public demo.
export function selectWorkspace(
  workspaces: Workspace[],
  pathSlug?: string | null,
  preferredSlug?: string | null
): Workspace | null {
  return (
    workspaces.find((item) => item.slug === pathSlug) ??
    workspaces.find((item) => item.slug === preferredSlug) ??
    workspaces[0] ??
    null
  )
}
