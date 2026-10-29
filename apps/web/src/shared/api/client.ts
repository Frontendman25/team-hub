import type {
  ChatMessage,
  Comment,
  Conversation,
  FeedStats,
  MessagePage,
  NotificationList,
  FileAttachment,
  PaginatedFiles,
  PaginatedPosts,
  Post,
  PublicUser,
  SearchKind,
  SearchPage,
  Task,
  TaskPriority,
  TaskStatus,
  UnreadCount,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember
} from '../types/api'
import { apiFetch } from '@/shared/lib/api'

export const api = {
  auth: {
    login: (body: { email: string; password: string }) =>
      apiFetch<PublicUser>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    register: (body: {
      email: string
      password: string
      displayName: string
      jobTitle?: string
    }) =>
      apiFetch<PublicUser>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    demo: () => apiFetch<PublicUser>('/auth/demo', { method: 'POST' }),
    logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    logoutAll: () => apiFetch<void>('/auth/logout-all', { method: 'POST' })
  },
  posts: {
    list: (params: {
      workspaceId: string
      limit?: number
      offset?: number
      authorId?: string
    }) => {
      const search = new URLSearchParams()
      search.set('workspaceId', params.workspaceId)
      search.set('limit', String(params.limit ?? 20))
      search.set('offset', String(params.offset ?? 0))
      if (params.authorId) {
        search.set('authorId', params.authorId)
      }
      return apiFetch<PaginatedPosts>(`/posts?${search.toString()}`, {
        tags: ['posts']
      })
    },
    get: (id: string) =>
      apiFetch<Post>(`/posts/${id}`, { tags: ['posts', `post:${id}`] }),
    create: (body: {
      workspaceId: string
      content: string
      imageUrl?: string | null
      attachmentIds?: string[]
    }) =>
      apiFetch<Post>('/posts', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { content: string }) =>
      apiFetch<Post>(`/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      }),
    remove: (id: string) =>
      apiFetch<void>(`/posts/${id}`, { method: 'DELETE' })
  },
  comments: {
    list: (postId: string) =>
      apiFetch<Comment[]>(`/posts/${postId}/comments`, {
        tags: ['comments', `post:${postId}`]
      }),
    create: (postId: string, content: string) =>
      apiFetch<Comment>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      }),
    remove: (id: string) =>
      apiFetch<void>(`/comments/${id}`, { method: 'DELETE' })
  },
  reactions: {
    add: (postId: string) =>
      apiFetch<Post>(`/posts/${postId}/reactions`, { method: 'POST' }),
    remove: (postId: string) =>
      apiFetch<Post>(`/posts/${postId}/reactions`, { method: 'DELETE' })
  },
  users: {
    me: () => apiFetch<PublicUser>('/users/me', { tags: ['users', 'me'] }),
    list: () => apiFetch<PublicUser[]>('/users?limit=8', { tags: ['users'] }),
    get: (id: string) =>
      apiFetch<PublicUser>(`/users/${id}`, { tags: ['users', `user:${id}`] }),
    posts: (id: string, workspaceId: string) =>
      apiFetch<PaginatedPosts>(
        `/users/${id}/posts?limit=20&workspaceId=${workspaceId}`
      )
  },
  stats: (workspaceId: string) =>
    apiFetch<FeedStats>(`/stats?workspaceId=${workspaceId}`),
  workspaces: {
    list: () => apiFetch<{ data: Workspace[] }>('/workspaces'),
    get: (ref: string) => apiFetch<Workspace>(`/workspaces/${ref}`),
    create: (body: { name: string; description?: string }) =>
      apiFetch<Workspace>('/workspaces', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    update: (id: string, body: { name?: string; description?: string }) =>
      apiFetch<Workspace>(`/workspaces/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      }),
    remove: (id: string) =>
      apiFetch<void>(`/workspaces/${id}`, { method: 'DELETE' }),
    members: (id: string) =>
      apiFetch<{ data: WorkspaceMember[] }>(`/workspaces/${id}/members`),
    changeRole: (id: string, userId: string, role: 'admin' | 'member') =>
      apiFetch<void>(`/workspaces/${id}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      }),
    removeMember: (id: string, userId: string) =>
      apiFetch<void>(`/workspaces/${id}/members/${userId}`, {
        method: 'DELETE'
      }),
    transfer: (id: string, userId: string) =>
      apiFetch<void>(`/workspaces/${id}/transfer`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      }),
    invitations: (id: string) =>
      apiFetch<{ data: WorkspaceInvitation[] }>(
        `/workspaces/${id}/invitations`
      ),
    invite: (
      id: string,
      invites: { email: string; role: 'admin' | 'member' }[]
    ) =>
      apiFetch<{ data: WorkspaceInvitation[]; errors: { index: number; email: string; message: string }[] }>(
        `/workspaces/${id}/invitations`,
        { method: 'POST', body: JSON.stringify({ invites }) }
      ),
    revokeInvitation: (id: string, invitationId: string) =>
      apiFetch<void>(`/workspaces/${id}/invitations/${invitationId}`, {
        method: 'DELETE'
      })
  },
  invitations: {
    list: () => apiFetch<{ data: WorkspaceInvitation[] }>('/invitations'),
    accept: (id: string) =>
      apiFetch<Workspace>(`/invitations/${id}/accept`, { method: 'POST' }),
    decline: (id: string) =>
      apiFetch<void>(`/invitations/${id}/decline`, { method: 'POST' })
  },
  notifications: {
    list: (limit = 20) =>
      apiFetch<NotificationList>(`/notifications?limit=${limit}`),
    unreadCount: () =>
      apiFetch<UnreadCount>('/notifications/unread-count'),
    markRead: (id: string) =>
      apiFetch<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () =>
      apiFetch<void>('/notifications/read-all', { method: 'POST' })
  },
  messaging: {
    conversations: (workspaceId: string) =>
      apiFetch<{ data: Conversation[] }>(
        `/workspaces/${workspaceId}/conversations`
      ),
    createChannel: (
      workspaceId: string,
      body: { name: string; topic?: string }
    ) =>
      apiFetch<Conversation>(`/workspaces/${workspaceId}/channels`, {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    updateChannel: (
      id: string,
      body: { name?: string; topic?: string }
    ) =>
      apiFetch<Conversation>(`/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      }),
    openDm: (workspaceId: string, userId: string) =>
      apiFetch<Conversation>(`/workspaces/${workspaceId}/dms`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      }),
    presence: (workspaceId: string) =>
      apiFetch<{ userIds: string[] }>(
        `/workspaces/${workspaceId}/presence`
      ),
    search: (workspaceId: string, q: string) =>
      apiFetch<{ data: ChatMessage[] }>(
        `/workspaces/${workspaceId}/messages/search?q=${encodeURIComponent(q)}`
      ),
    messages: (conversationId: string, cursor?: string) => {
      const search = new URLSearchParams({ limit: '50' })
      if (cursor) {
        search.set('cursor', cursor)
      }
      return apiFetch<MessagePage>(
        `/conversations/${conversationId}/messages?${search.toString()}`
      )
    },
    send: (
      conversationId: string,
      body: { content: string; clientId: string; attachmentIds?: string[] }
    ) =>
      apiFetch<ChatMessage>(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    edit: (id: string, content: string) =>
      apiFetch<ChatMessage>(`/messages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content })
      }),
    remove: (id: string) =>
      apiFetch<ChatMessage>(`/messages/${id}`, { method: 'DELETE' }),
    markRead: (conversationId: string) =>
      apiFetch<Conversation>(`/conversations/${conversationId}/read`, {
        method: 'POST'
      })
  },
  files: {
    list: (workspaceId: string, offset = 0) =>
      apiFetch<PaginatedFiles>(
        `/workspaces/${workspaceId}/files?limit=30&offset=${offset}`
      ),
    initiate: (
      workspaceId: string,
      body: { originalName: string; contentType: string; byteSize: number }
    ) =>
      apiFetch<{
        file: FileAttachment
        uploadUrl: string
        uploadHeaders: Record<string, string>
        expiresAt: string
      }>(`/workspaces/${workspaceId}/files`, {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    complete: (id: string) =>
      apiFetch<FileAttachment>(`/files/${id}/complete`, { method: 'POST' }),
    contentUrl: (id: string) =>
      apiFetch<{
        strategy: 'proxy' | 'presigned'
        url: string
        expiresAt: string
        file: FileAttachment
      }>(`/files/${id}/content-url`),
    remove: (id: string) =>
      apiFetch<void>(`/files/${id}`, { method: 'DELETE' })
  },
  tasks: {
    list: (
      workspaceId: string,
      filters: {
        status?: TaskStatus
        priority?: TaskPriority
        assigneeId?: string
      } = {}
    ) => {
      const search = new URLSearchParams()
      if (filters.status) {
        search.set('status', filters.status)
      }
      if (filters.priority) {
        search.set('priority', filters.priority)
      }
      if (filters.assigneeId) {
        search.set('assigneeId', filters.assigneeId)
      }
      const suffix = search.size > 0 ? `?${search.toString()}` : ''
      return apiFetch<{ data: Task[] }>(
        `/workspaces/${workspaceId}/tasks${suffix}`
      )
    },
    get: (id: string) => apiFetch<Task>(`/tasks/${id}`),
    create: (
      workspaceId: string,
      body: {
        title: string
        description?: string
        status?: TaskStatus
        priority?: TaskPriority
        assigneeId?: string | null
        dueDate?: string | null
      }
    ) =>
      apiFetch<Task>(`/workspaces/${workspaceId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    update: (
      id: string,
      body: {
        version: number
        title?: string
        description?: string
        priority?: TaskPriority
        assigneeId?: string | null
        dueDate?: string | null
      }
    ) =>
      apiFetch<Task>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      }),
    move: (
      id: string,
      body: { status: TaskStatus; position: number; version: number }
    ) =>
      apiFetch<{ task: Task; data: Task[] }>(`/tasks/${id}/move`, {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    remove: (id: string) =>
      apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' })
  },
  search: {
    workspace: (
      workspaceId: string,
      q: string,
      options: { limit?: number; kinds?: SearchKind[] } = {}
    ) => {
      const params = new URLSearchParams({ q })
      if (options.limit) {
        params.set('limit', String(options.limit))
      }
      if (options.kinds && options.kinds.length > 0) {
        params.set('kinds', options.kinds.join(','))
      }
      return apiFetch<SearchPage>(
        `/workspaces/${workspaceId}/search?${params.toString()}`
      )
    }
  }
}
