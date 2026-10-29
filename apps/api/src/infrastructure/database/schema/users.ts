import { sql } from 'drizzle-orm'
import {
  check,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    accountKind: varchar('account_kind', { length: 16 })
      .notNull()
      .default('registered'),
    guestExpiresAt: timestamp('guest_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    check(
      'users_account_kind_check',
      sql`${table.accountKind} in ('registered', 'guest', 'demo_persona')`
    ),
    index('users_guest_expires_idx')
      .on(table.guestExpiresAt)
      .where(sql`${table.accountKind} = 'guest'`)
  ]
)
