import { relations } from 'drizzle-orm'
import { comments } from './comments'
import { tasks } from './tasks'
import { files } from './files'
import { conversationMembers, conversations, messages } from './messaging'
import { notifications } from './notifications'
import { posts } from './posts'
import { profiles } from './profiles'
import { reactions } from './reactions'
import { sessions } from './sessions'
import { users } from './users'
import {
  workspaceInvitations,
  workspaceMembers,
  workspaces
} from './workspaces'

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId]
  }),
  posts: many(posts),
  comments: many(comments),
  reactions: many(reactions),
  sessions: many(sessions),
  memberships: many(workspaceMembers),
  conversationMemberships: many(conversationMembers),
  authoredMessages: many(messages),
  uploadedFiles: many(files),
  createdTasks: many(tasks, { relationName: 'taskCreator' }),
  assignedTasks: many(tasks, { relationName: 'taskAssignee' }),
  notificationsReceived: many(notifications, {
    relationName: 'notificationRecipient'
  }),
  notificationsSent: many(notifications, {
    relationName: 'notificationActor'
  })
}))

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id]
  })
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [posts.workspaceId],
    references: [workspaces.id]
  }),
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id]
  }),
  comments: many(comments),
  reactions: many(reactions),
  notifications: many(notifications),
  files: many(files)
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id]
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id]
  })
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
    relationName: 'notificationRecipient'
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
    relationName: 'notificationActor'
  }),
  post: one(posts, {
    fields: [notifications.postId],
    references: [posts.id]
  }),
  comment: one(comments, {
    fields: [notifications.commentId],
    references: [comments.id]
  }),
  workspace: one(workspaces, {
    fields: [notifications.workspaceId],
    references: [workspaces.id]
  }),
  invitation: one(workspaceInvitations, {
    fields: [notifications.invitationId],
    references: [workspaceInvitations.id]
  })
}))

export const reactionsRelations = relations(reactions, ({ one }) => ({
  post: one(posts, {
    fields: [reactions.postId],
    references: [posts.id]
  }),
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id]
  })
}))

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [workspaces.createdById],
    references: [users.id]
  }),
  members: many(workspaceMembers),
  invitations: many(workspaceInvitations),
  posts: many(posts),
  conversations: many(conversations),
  files: many(files),
  tasks: many(tasks)
}))

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id]
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id]
    })
  })
)

export const workspaceInvitationsRelations = relations(
  workspaceInvitations,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceInvitations.workspaceId],
      references: [workspaces.id]
    }),
    invitedBy: one(users, {
      fields: [workspaceInvitations.invitedById],
      references: [users.id]
    })
  })
)

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [conversations.workspaceId],
      references: [workspaces.id]
    }),
    createdBy: one(users, {
      fields: [conversations.createdById],
      references: [users.id]
    }),
    members: many(conversationMembers),
    messages: many(messages)
  })
)

export const conversationMembersRelations = relations(
  conversationMembers,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationMembers.conversationId],
      references: [conversations.id]
    }),
    user: one(users, {
      fields: [conversationMembers.userId],
      references: [users.id]
    })
  })
)

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id]
  }),
  author: one(users, {
    fields: [messages.authorId],
    references: [users.id]
  }),
  files: many(files)
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [tasks.workspaceId],
    references: [workspaces.id]
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: 'taskCreator'
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: 'taskAssignee'
  })
}))

export const filesRelations = relations(files, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [files.workspaceId],
    references: [workspaces.id]
  }),
  uploader: one(users, {
    fields: [files.uploadedBy],
    references: [users.id]
  }),
  message: one(messages, {
    fields: [files.messageId],
    references: [messages.id]
  }),
  post: one(posts, {
    fields: [files.postId],
    references: [posts.id]
  })
}))
