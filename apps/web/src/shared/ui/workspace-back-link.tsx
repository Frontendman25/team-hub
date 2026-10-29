'use client'

import { useCurrentWorkspace } from '@/entities/workspace/model/use-current-workspace'
import { PageBackLink } from '@/shared/ui/page-back-link'

export function WorkspaceBackLink({ children }: { children: string }) {
  const { current } = useCurrentWorkspace()
  const href = current ? `/w/${current.slug}` : '/'
  return <PageBackLink href={href}>{children}</PageBackLink>
}
