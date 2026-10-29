'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { userQueries } from '@/entities/user/api/queries'
import { workspaceKeys, workspaceQueries } from '@/entities/workspace/api/queries'
import { InviteMembersForm } from '@/features/workspaces/ui/invite-members-form'
import { api } from '@/shared/api/client'
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/shared/types/api'
import { Button } from '@/shared/ui/button'

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500)
})

export function WorkspaceSettings({ workspace }: { workspace: Workspace }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const me = useQuery(userQueries.me())
  const members = useQuery(workspaceQueries.members(workspace.id))
  const invitations = useQuery({
    ...workspaceQueries.invitations(workspace.id),
    enabled: workspace.role === 'owner' || workspace.role === 'admin'
  })
  const frozenDemo = workspace.kind === 'demo'
  const canAdmin =
    !frozenDemo && (workspace.role === 'owner' || workspace.role === 'admin')
  const isOwner = workspace.role === 'owner'
  const ownerCount = (members.data ?? []).filter(
    (member) => member.role === 'owner'
  ).length
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: workspace.name,
      description: workspace.description
    }
  })
  const deleteForm = useForm({
    resolver: zodResolver(
      z.object({
        confirmName: z
          .string()
          .trim()
          .refine((value) => value === workspace.name, {
            message: `Type ${workspace.name} to confirm`
          })
      })
    ),
    defaultValues: { confirmName: '' }
  })

  const invalidateWorkspace = async () => {
    await queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
  }

  const save = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      api.workspaces.update(workspace.id, values),
    onSuccess: async (updated) => {
      await invalidateWorkspace()
      if (updated.slug !== workspace.slug) {
        document.cookie = `th.ws=${updated.slug}; path=/; max-age=31536000; samesite=lax`
        router.replace(`/w/${updated.slug}/settings`)
      }
    }
  })

  const leave = useMutation({
    mutationFn: () =>
      api.workspaces.removeMember(workspace.id, me.data?.id ?? ''),
    onSuccess: () => {
      router.push('/')
      router.refresh()
    }
  })

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      api.workspaces.removeMember(workspace.id, userId),
    onSuccess: invalidateWorkspace
  })

  const changeRole = useMutation({
    mutationFn: (input: { userId: string; role: 'admin' | 'member' }) =>
      api.workspaces.changeRole(workspace.id, input.userId, input.role),
    onSuccess: invalidateWorkspace
  })

  const transfer = useMutation({
    mutationFn: (userId: string) =>
      api.workspaces.transfer(workspace.id, userId),
    onSuccess: async () => {
      await invalidateWorkspace()
      router.refresh()
    }
  })

  const destroy = useMutation({
    mutationFn: () => api.workspaces.remove(workspace.id),
    onSuccess: () => {
      router.push('/')
      router.refresh()
    }
  })

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-5">
        <h1 className="text-lg font-semibold">{workspace.name}</h1>
        <p className="text-sm text-muted-foreground">
          Your role: {workspace.role}
        </p>
        {frozenDemo ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This is the public demo workspace. Name, members, and invitations
            cannot be changed. Register to create a private workspace.
          </p>
        ) : null}
        {canAdmin ? (
          <form
            className="mt-4 space-y-3"
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
          >
            <input
              className="h-10 w-full rounded-lg border border-border px-3"
              {...form.register('name')}
            />
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2"
              {...form.register('description')}
            />
            <Button type="submit" disabled={save.isPending}>
              Save settings
            </Button>
          </form>
        ) : (
          <p className="mt-3 text-sm">{workspace.description || 'No description.'}</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="mb-3 font-semibold">Members</h2>
        <ul className="space-y-2">
          {(members.data ?? []).map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              actorId={me.data?.id}
              actorRole={workspace.role}
              onRemove={() => removeMember.mutate(member.userId)}
              onRole={(role) =>
                changeRole.mutate({ userId: member.userId, role })
              }
            />
          ))}
        </ul>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => leave.mutate()}
          disabled={leave.isPending || (isOwner && ownerCount <= 1)}
        >
          Leave workspace
        </Button>
        {isOwner && ownerCount <= 1 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Transfer ownership before leaving as the last owner.
          </p>
        ) : null}
      </section>

      {isOwner ? (
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="mb-2 font-semibold">Transfer ownership</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            You become an admin. The selected member becomes the only owner.
          </p>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault()
              const formData = new FormData(event.currentTarget)
              const userId = String(formData.get('userId') ?? '')
              if (userId) {
                transfer.mutate(userId)
              }
            }}
          >
            <select
              name="userId"
              className="h-10 flex-1 rounded-lg border border-border px-2"
              defaultValue=""
            >
              <option value="" disabled>
                Select a member
              </option>
              {(members.data ?? [])
                .filter((member) => member.userId !== me.data?.id)
                .map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName} ({member.role})
                  </option>
                ))}
            </select>
            <Button type="submit" disabled={transfer.isPending}>
              Transfer
            </Button>
          </form>
        </section>
      ) : null}

      {canAdmin ? (
        <section className="rounded-2xl border border-border bg-white p-5">
          <InviteMembersForm workspaceId={workspace.id} />
          <ul className="mt-4 space-y-2 text-sm">
            {(invitations.data ?? [])
              .filter((row) => row.status === 'pending')
              .map((row) => (
                <li key={row.id} className="flex justify-between gap-2">
                  <span>
                    {row.email} · {row.role}
                  </span>
                  <button
                    type="button"
                    className="text-xs"
                    onClick={() =>
                      api.workspaces
                        .revokeInvitation(workspace.id, row.id)
                        .then(() =>
                          queryClient.invalidateQueries({
                            queryKey: workspaceKeys.invitations(workspace.id)
                          })
                        )
                    }
                  >
                    Revoke
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {isOwner ? (
        <section className="rounded-2xl border border-red-200 bg-white p-5">
          <h2 className="mb-2 font-semibold text-red-700">Delete workspace</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            This removes posts, members, and invitations in this workspace.
          </p>
          <form
            className="space-y-3"
            onSubmit={deleteForm.handleSubmit(() => destroy.mutate())}
          >
            <label className="block text-sm">
              Type <span className="font-medium">{workspace.name}</span> to
              confirm
              <input
                className="mt-1 h-10 w-full rounded-lg border border-border px-3"
                {...deleteForm.register('confirmName')}
              />
            </label>
            {deleteForm.formState.errors.confirmName ? (
              <p className="text-sm text-red-600">
                {deleteForm.formState.errors.confirmName.message}
              </p>
            ) : null}
            <Button
              type="submit"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={destroy.isPending}
            >
              Delete workspace
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  )
}

function MemberRow({
  member,
  actorId,
  actorRole,
  onRemove,
  onRole
}: {
  member: WorkspaceMember
  actorId?: string
  actorRole?: WorkspaceRole
  onRemove: () => void
  onRole: (role: 'admin' | 'member') => void
}) {
  const isSelf = member.userId === actorId
  const canChangeRole =
    actorRole === 'owner' && member.role !== 'owner' && !isSelf
  const canRemove =
    !isSelf &&
    member.role !== 'owner' &&
    (actorRole === 'owner' ||
      (actorRole === 'admin' && member.role === 'member'))

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span>
        {member.displayName}{' '}
        <span className="text-muted-foreground">({member.role})</span>
      </span>
      <span className="flex items-center gap-2">
        {canChangeRole ? (
          <select
            aria-label={`Role for ${member.displayName}`}
            className="h-8 rounded-lg border border-border px-2"
            value={member.role}
            onChange={(event) =>
              onRole(event.target.value as 'admin' | 'member')
            }
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        ) : null}
        {canRemove ? (
          <button type="button" className="text-xs text-red-600" onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </span>
    </li>
  )
}
