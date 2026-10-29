'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { workspaceKeys, workspaceQueries } from '@/entities/workspace/api/queries'
import { api } from '@/shared/api/client'
import { Button } from '@/shared/ui/button'
import { userQueries } from '@/entities/user/api/queries'
import { CreateWorkspaceForm } from '@/features/workspaces/ui/create-workspace-form'

export function InvitationsView() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const invites = useQuery(workspaceQueries.mine())
  const me = useQuery(userQueries.me())

  const accept = useMutation({
    mutationFn: (id: string) => api.invitations.accept(id),
    onSuccess: async (workspace) => {
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
      document.cookie = `th.ws=${workspace.slug}; path=/; max-age=31536000; samesite=lax`
      router.push(`/w/${workspace.slug}`)
    }
  })

  const decline = useMutation({
    mutationFn: (id: string) => api.invitations.decline(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workspaceKeys.mine })
  })

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-5">
        <h1 className="text-lg font-semibold">Pending invitations</h1>
        {invites.isPending ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : (invites.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No invitations right now.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {invites.data?.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
              >
                <div>
                  <p className="font-medium">{invite.workspaceName}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited by {invite.invitedByName} as {invite.role}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="h-8"
                    onClick={() => accept.mutate(invite.id)}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8"
                    onClick={() => decline.mutate(invite.id)}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="mb-3 font-semibold">Create a workspace</h2>
        {me.data?.accountKind === 'guest' ? (
          <p className="text-sm text-muted-foreground">
            Demo visitors cannot create private workspaces.{' '}
            <a href="/register" className="font-medium underline">
              Create an account
            </a>
            .
          </p>
        ) : (
          <CreateWorkspaceForm />
        )}
      </section>
    </div>
  )
}
