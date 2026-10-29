import type { Metadata } from 'next'
import { InvitationsView } from '@/widgets/invitations/ui/invitations-view'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Invitations'
}

export default function InvitationsPage() {
  return <InvitationsView />
}
