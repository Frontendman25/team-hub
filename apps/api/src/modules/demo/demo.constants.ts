export const ACCOUNT_KINDS = ['registered', 'guest', 'demo_persona'] as const
export type AccountKind = (typeof ACCOUNT_KINDS)[number]

export const WORKSPACE_KINDS = ['private', 'demo'] as const
export type WorkspaceKind = (typeof WORKSPACE_KINDS)[number]

export const GUEST_FILE_MAX_BYTES = 5 * 1024 * 1024
export const GUEST_FILE_MAX_COUNT = 3
export const GUEST_WRITE_WINDOW_SECONDS = 60
export const GUEST_WRITE_LIMIT = 20

export const DEMO_FROZEN_MESSAGE =
  'The public demo workspace cannot be changed. Register to create your own.'
export const DEMO_OWN_CONTENT_MESSAGE =
  'You can only change content you created in the public demo.'
export const DEMO_DM_MESSAGE =
  'Direct messages stay private. Use a public channel in the demo.'
export const GUEST_REGISTER_MESSAGE = 'Register to create a private workspace.'
