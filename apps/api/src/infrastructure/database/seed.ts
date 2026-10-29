import { config } from 'dotenv'
import { resolve } from 'node:path'
import { hash } from '@node-rs/argon2'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { DEMO_PASSWORD, DEMO_WORKSPACE_ID, demoUsers } from './demo-users'
import { comments } from './schema/comments'
import { files } from './schema/files'
import { notifications } from './schema/notifications'
import { posts } from './schema/posts'
import { tasks } from './schema/tasks'
import { profiles } from './schema/profiles'
import { reactions } from './schema/reactions'
import { users } from './schema/users'
import { objectKeyFor } from '../../modules/files/application/sanitize-filename'
import { writeLocalObject } from '../../modules/files/infrastructure/local-object-store'
import {
  conversationMembers,
  conversations,
  messages
} from './schema/messaging'
import {
  workspaceInvitations,
  workspaceMembers,
  workspaces
} from './schema/workspaces'
import { dmKeyFor } from '../../modules/messaging/domain/types'

config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '../../.env') })

const sarah = demoUsers[0]
const james = demoUsers[1]
const emily = demoUsers[2]
const daniel = demoUsers[3]
const priya = demoUsers[4]
const alex = demoUsers[5]
const maria = demoUsers[6]

const extraUsers = [
  {
    id: '10101010-1010-4101-8101-101010101010',
    email: 'noah.patel@teamhub.local',
    displayName: 'Noah Patel',
    jobTitle: 'Design',
    bio: 'Making TeamHub feel calm, clear, and a little bit delightful.',
    avatarUrl: 'https://i.pravatar.cc/128?u=noah.patel'
  },
  {
    id: '12121212-1212-4121-8121-121212121212',
    email: 'lena.ortiz@teamhub.local',
    displayName: 'Lena Ortiz',
    jobTitle: 'Sales',
    bio: 'Customer conversations, pipeline notes, and Friday wins.',
    avatarUrl: 'https://i.pravatar.cc/128?u=lena.ortiz'
  },
  {
    id: '13131313-1313-4131-8131-131313131313',
    email: 'chris.wright@teamhub.local',
    displayName: 'Chris Wright',
    jobTitle: 'Customer Support',
    bio: 'If it is broken, I want the transcript.',
    avatarUrl: 'https://i.pravatar.cc/128?u=chris.wright'
  }
] as const

const allUsers = [...demoUsers, ...extraUsers]
const noah = extraUsers[0]
const lena = extraUsers[1]
const chris = extraUsers[2]

const PRODUCT_LAB_ID = '88888888-8888-4888-8888-888888888881'

const channels = {
  general: '99999999-9999-4999-8999-999999999991',
  engineering: '99999999-9999-4999-8999-999999999992',
  marketing: '99999999-9999-4999-8999-999999999993',
  design: '99999999-9999-4999-8999-999999999996',
  lab: '99999999-9999-4999-8999-999999999997',
  product: '99999999-9999-4999-8999-9999999999b1',
  sales: '99999999-9999-4999-8999-9999999999b2',
  support: '99999999-9999-4999-8999-9999999999b3',
  people: '99999999-9999-4999-8999-9999999999b4',
  announcements: '99999999-9999-4999-8999-9999999999b5',
  random: '99999999-9999-4999-8999-9999999999b6',
  standup: '99999999-9999-4999-8999-9999999999b7',
  watercooler: '99999999-9999-4999-8999-9999999999b8'
} as const

const dms = {
  sarahJames: '99999999-9999-4999-8999-aaaaaaaad001',
  sarahDaniel: '99999999-9999-4999-8999-aaaaaaaad002',
  emilyLena: '99999999-9999-4999-8999-aaaaaaaad003'
} as const

const demoPosts = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    authorId: james.id,
    content:
      'We are excited to share our plans for 2025 — a bigger impact, more opportunities, and a continued focus on our people. Thank you for making TeamHub an amazing place to work!',
    createdAt: hoursAgo(72)
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    authorId: emily.id,
    content:
      'Had an amazing time at our offsite this week! Great discussions, fresh ideas, and an incredible team. Here are a few highlights 🎉',
    createdAt: hoursAgo(48)
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    authorId: daniel.id,
    content:
      'Sharing a useful resource for anyone working on product specs. This template has helped our team stay aligned and move faster.',
    createdAt: hoursAgo(36)
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    authorId: sarah.id,
    content:
      'Shipping Files & Attachments this week. You can drop images and docs into chat or a post, then browse them from the Files tab. Try it and tell me what feels rough.',
    createdAt: hoursAgo(8)
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
    authorId: priya.id,
    content:
      'Reminder: API on-call rotation starts Monday. Handoff notes live in #engineering. Ping me if your week does not work.',
    createdAt: hoursAgo(20)
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03',
    authorId: noah.id,
    content:
      'Posted an updated empty-state illustration for Messages. If the empty room still feels too quiet, that is the point — we can add a prompt later.',
    createdAt: hoursAgo(14)
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04',
    authorId: maria.id,
    content:
      'Benefits enrollment closes Friday. If you have questions about coverage, grab time on my calendar or drop a note in #general.',
    createdAt: hoursAgo(10)
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa05',
    authorId: alex.id,
    content:
      'Redis unread cache is behaving after last night’s deploy. If you still see a stale badge, hard-refresh once — do not wipe local storage.',
    createdAt: hoursAgo(6)
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa06',
    authorId: lena.id,
    content:
      'Closed the Northwind renewal. Huge thanks to Support for the timeline and to Product for the demo environment.',
    createdAt: hoursAgo(5)
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa07',
    authorId: chris.id,
    content:
      'We had three “can’t upload” tickets this morning. Two were SVG files (blocked on purpose). One was over 10 MB. I added a canned reply.',
    createdAt: hoursAgo(3)
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa08',
    authorId: emily.id,
    workspaceId: PRODUCT_LAB_ID,
    content:
      'Product Lab only: moodboard for the Q4 launch page. Comments welcome, especially on the hero copy.',
    createdAt: hoursAgo(4)
  }
] as const

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

async function seed(): Promise<void> {
  const url = process.env.POSTGRESQL_URL

  if (!url) {
    throw new Error('POSTGRESQL_URL is required to seed the database')
  }

  const client = postgres(url)
  const db = drizzle(client)
  const passwordHash = await hash(DEMO_PASSWORD)

  await db
    .insert(users)
    .values(
      allUsers.map(({ id, email }) => ({
        id,
        email,
        passwordHash,
        accountKind: 'demo_persona' as const
      }))
    )
    .onConflictDoUpdate({
      target: users.id,
      set: { passwordHash, accountKind: 'demo_persona' }
    })

  await db
    .insert(profiles)
    .values(
      allUsers.map((user) => ({
        userId: user.id,
        displayName: user.displayName,
        jobTitle: user.jobTitle,
        bio: user.bio,
        avatarUrl: user.avatarUrl
      }))
    )
    .onConflictDoNothing()

  await db
    .insert(workspaces)
    .values([
      {
        id: DEMO_WORKSPACE_ID,
        name: 'TeamHub',
        slug: 'teamhub',
        description: 'Company-wide workspace for the whole team.',
        createdById: sarah.id,
        kind: 'demo'
      },
      {
        id: PRODUCT_LAB_ID,
        name: 'Product Lab',
        slug: 'product-lab',
        description: 'Smaller workspace for experiments and launch work.',
        createdById: daniel.id
      }
    ])
    .onConflictDoNothing()

  await db
    .update(workspaces)
    .set({ kind: 'demo' })
    .where(eq(workspaces.id, DEMO_WORKSPACE_ID))

  await db
    .insert(workspaceMembers)
    .values([
      ...allUsers.map((user) => ({
        workspaceId: DEMO_WORKSPACE_ID,
        userId: user.id,
        role:
          user.id === sarah.id
            ? 'owner'
            : user.id === james.id
              ? 'admin'
              : 'member'
      })),
      {
        workspaceId: PRODUCT_LAB_ID,
        userId: daniel.id,
        role: 'owner'
      },
      {
        workspaceId: PRODUCT_LAB_ID,
        userId: sarah.id,
        role: 'admin'
      },
      {
        workspaceId: PRODUCT_LAB_ID,
        userId: priya.id,
        role: 'member'
      },
      {
        workspaceId: PRODUCT_LAB_ID,
        userId: emily.id,
        role: 'member'
      },
      {
        workspaceId: PRODUCT_LAB_ID,
        userId: noah.id,
        role: 'member'
      }
    ])
    .onConflictDoNothing()

  await db
    .update(workspaceMembers)
    .set({ role: 'admin' })
    .where(
      and(
        eq(workspaceMembers.workspaceId, DEMO_WORKSPACE_ID),
        eq(workspaceMembers.userId, james.id)
      )
    )

  await db
    .insert(conversations)
    .values([
      {
        id: channels.general,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'channel',
        name: 'general',
        slug: 'general',
        topic: 'Company-wide conversation',
        createdById: sarah.id,
        lastMessageAt: hoursAgo(1)
      },
      {
        id: channels.engineering,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'channel',
        name: 'engineering',
        slug: 'engineering',
        topic: 'Build, ship, and review together',
        createdById: sarah.id,
        lastMessageAt: hoursAgo(2)
      },
      {
        id: channels.marketing,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'channel',
        name: 'marketing',
        slug: 'marketing',
        topic: 'Campaigns, brand, and launches',
        createdById: sarah.id,
        lastMessageAt: hoursAgo(9)
      },
      {
        id: channels.design,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'channel',
        name: 'design',
        slug: 'design',
        topic: 'Critique, tokens, and illustrations',
        createdById: noah.id,
        lastMessageAt: hoursAgo(7)
      },
      {
        id: channels.product,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'channel',
        name: 'product',
        slug: 'product',
        topic: 'Roadmap, specs, and discovery',
        createdById: sarah.id,
        lastMessageAt: hoursAgo(5)
      },
      {
        id: channels.sales,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'channel',
        name: 'sales',
        slug: 'sales',
        topic: 'Pipeline, renewals, and win notes',
        createdById: lena.id,
        lastMessageAt: hoursAgo(6)
      },
      {
        id: channels.support,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'channel',
        name: 'support',
        slug: 'support',
        topic: 'Tickets, canned replies, and incidents',
        createdById: chris.id,
        lastMessageAt: hoursAgo(3)
      },
      {
        id: channels.people,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'channel',
        name: 'people',
        slug: 'people',
        topic: 'Hiring, benefits, and team rituals',
        createdById: maria.id,
        lastMessageAt: hoursAgo(14)
      },
      {
        id: channels.announcements,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'channel',
        name: 'announcements',
        slug: 'announcements',
        topic: 'Company-wide notices. Keep chatter in #general.',
        createdById: james.id,
        lastMessageAt: hoursAgo(20)
      },
      {
        id: channels.random,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'channel',
        name: 'random',
        slug: 'random',
        topic: 'Off-topic, memes, and weekend plans',
        createdById: alex.id,
        lastMessageAt: hoursAgo(8)
      },
      {
        id: channels.standup,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'channel',
        name: 'standup',
        slug: 'standup',
        topic: 'Yesterday / today / blockers',
        createdById: priya.id,
        lastMessageAt: hoursAgo(2)
      },
      {
        id: channels.watercooler,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'channel',
        name: 'watercooler',
        slug: 'watercooler',
        topic: 'Coffee chat. No standups here.',
        createdById: emily.id,
        lastMessageAt: hoursAgo(10)
      },
      {
        id: channels.lab,
        workspaceId: PRODUCT_LAB_ID,
        type: 'channel',
        name: 'lab',
        slug: 'lab',
        topic: 'Experiments that might ship',
        createdById: daniel.id,
        lastMessageAt: hoursAgo(4)
      },
      {
        id: dms.sarahJames,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'dm',
        dmKey: dmKeyFor(sarah.id, james.id),
        createdById: sarah.id,
        lastMessageAt: hoursAgo(1)
      },
      {
        id: dms.sarahDaniel,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'dm',
        dmKey: dmKeyFor(sarah.id, daniel.id),
        createdById: sarah.id,
        lastMessageAt: hoursAgo(2)
      },
      {
        id: dms.emilyLena,
        workspaceId: DEMO_WORKSPACE_ID,
        type: 'dm',
        dmKey: dmKeyFor(emily.id, lena.id),
        createdById: emily.id,
        lastMessageAt: hoursAgo(6)
      }
    ])
    .onConflictDoNothing()

  await db
    .insert(conversationMembers)
    .values([
      {
        conversationId: dms.sarahJames,
        userId: sarah.id,
        lastReadAt: hoursAgo(24)
      },
      {
        conversationId: dms.sarahJames,
        userId: james.id,
        lastReadAt: hoursAgo(1)
      },
      {
        conversationId: dms.sarahDaniel,
        userId: sarah.id,
        lastReadAt: hoursAgo(2)
      },
      {
        conversationId: dms.sarahDaniel,
        userId: daniel.id,
        lastReadAt: hoursAgo(3)
      },
      {
        conversationId: dms.emilyLena,
        userId: emily.id,
        lastReadAt: hoursAgo(6)
      },
      {
        conversationId: dms.emilyLena,
        userId: lena.id,
        lastReadAt: hoursAgo(12)
      }
    ])
    .onConflictDoNothing()

  const chat = (
    id: string,
    conversationId: string,
    authorId: string,
    content: string,
    hours: number
  ) => ({
    id,
    conversationId,
    authorId,
    content,
    clientId: id,
    createdAt: hoursAgo(hours)
  })

  await db
    .insert(messages)
    .values([
      chat(
        '99999999-9999-4999-8999-999999999994',
        channels.general,
        sarah.id,
        'Welcome to TeamHub Messages. This channel is for everyone.',
        80
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0001',
        channels.general,
        james.id,
        'All-hands is Thursday 10:00. Agenda is in the calendar invite.',
        30
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0002',
        channels.general,
        maria.id,
        'Kitchen is closed Friday afternoon for the photo shoot. Snacks will be in the lounge.',
        12
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0003',
        channels.general,
        chris.id,
        'If a customer asks about SVG uploads: we block them on purpose. Point them at PNG or PDF.',
        4
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0004',
        channels.general,
        lena.id,
        'Northwind is live. 🎉 Celebrating at 16:00 if anyone wants coffee.',
        1
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0005',
        channels.engineering,
        daniel.id,
        'Migration 0007 is on staging. Please do not point local MinIO at prod credentials.',
        18
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0006',
        channels.engineering,
        priya.id,
        'I will take Monday on-call. Alex has Tuesday–Wednesday.',
        16
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0007',
        channels.engineering,
        alex.id,
        'Socket ack timeout is 4s now. If send fails, the HTTP fallback should keep clientId.',
        8
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0008',
        channels.engineering,
        sarah.id,
        'Nice. I will write the Files learning notes after lunch.',
        2
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0009',
        channels.marketing,
        emily.id,
        'Launch page copy v2 is in the shared doc. Need a legal pass by Wednesday.',
        22
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0010',
        channels.marketing,
        lena.id,
        'Customer quote from Northwind is approved. I dropped it in the deck.',
        9
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0011',
        channels.design,
        noah.id,
        'Empty states use muted type, not illustrations, except Files. Critique welcome.',
        11
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0012',
        channels.design,
        sarah.id,
        'Attachment cards feel a bit tall on mobile. I will screenshot after I post a PDF.',
        7
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0030',
        channels.product,
        sarah.id,
        'Kanban Lite is in the public demo now. Keep the board small on purpose.',
        5
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0031',
        channels.product,
        priya.id,
        'I filed the empty-state copy as a follow-up. Not blocking the release.',
        3
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0032',
        channels.sales,
        lena.id,
        'Northwind renewal is signed. Thanks Support for the timeline screenshot.',
        6
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0033',
        channels.sales,
        james.id,
        'Nice. Put the quote in the all-hands deck, not here.',
        5
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0034',
        channels.support,
        chris.id,
        'Canned reply for SVG uploads is live. Point people at PNG or PDF.',
        3
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0035',
        channels.support,
        maria.id,
        'Got three “can’t upload” tickets this morning. Two were SVG. One was over 10 MB.',
        2
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0036',
        channels.people,
        maria.id,
        'Benefits enrollment closes Friday. Questions go on my calendar, not this thread.',
        14
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0037',
        channels.announcements,
        james.id,
        'All-hands Thursday 10:00. Agenda is in the calendar invite. Please read it first.',
        20
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0038',
        channels.random,
        alex.id,
        'Whoever took the last oat milk: the list is on the fridge.',
        8
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0039',
        channels.standup,
        priya.id,
        'Yesterday: search ranking. Today: Files Range. Blocker: none.',
        2
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa003a',
        channels.standup,
        daniel.id,
        'Yesterday: upload complete. Today: guest cleanup. Blocker: waiting on MinIO CORS in staging.',
        2
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa003b',
        channels.watercooler,
        emily.id,
        'Kitchen is closed Friday afternoon for the photo shoot. Snacks will be in the lounge.',
        10
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0013',
        channels.lab,
        daniel.id,
        'This channel is Product Lab only. If an experiment graduates, we write it up in TeamHub.',
        10
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0014',
        channels.lab,
        emily.id,
        'Hero options A/B are in Figma. I prefer A for the launch, B for retargeting.',
        4
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0015',
        dms.sarahJames,
        james.id,
        'Can you intro me to Lena before the Northwind call? I want the renewal numbers.',
        5
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0016',
        dms.sarahJames,
        sarah.id,
        'Done — she is joining at 14:30. I also put the Files demo on the all-hands agenda.',
        3
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0017',
        dms.sarahJames,
        james.id,
        'Perfect. I left you a couple of notes in the feed post as well.',
        1
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0018',
        dms.sarahDaniel,
        daniel.id,
        'Presigned PUT is in. Memory driver is test-only. Do not demo uploads against an empty MinIO.',
        6
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0019',
        dms.sarahDaniel,
        sarah.id,
        'Got it. I will say “drop a PNG in #general” and keep SVG as the known failure.',
        2
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0020',
        dms.emilyLena,
        emily.id,
        'Need a 15-second customer clip if Northwind is willing. Text is fine if video is not.',
        8
      ),
      chat(
        'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0021',
        dms.emilyLena,
        lena.id,
        'They approved a quote, not a video. I will paste it in #marketing.',
        6
      )
    ])
    .onConflictDoNothing()

  await db
    .insert(posts)
    .values(
      demoPosts.map((post) => ({
        id: post.id,
        authorId: post.authorId,
        content: post.content,
        workspaceId:
          'workspaceId' in post && post.workspaceId
            ? post.workspaceId
            : DEMO_WORKSPACE_ID,
        createdAt: post.createdAt,
        updatedAt: post.createdAt
      }))
    )
    .onConflictDoNothing()

  await db
    .insert(comments)
    .values([
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        postId: demoPosts[1].id,
        authorId: alex.id,
        content: 'Looks like an incredible offsite — thanks for sharing!',
        createdAt: hoursAgo(46)
      },
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        postId: demoPosts[2].id,
        authorId: sarah.id,
        content: 'This template is going into our team folder today.',
        createdAt: hoursAgo(35)
      },
      {
        id: 'c1000001-aaaa-4aaa-8aaa-aaaaaaaa0001',
        postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
        authorId: daniel.id,
        content:
          'Works on channel messages. I will try a PDF from the composer next.',
        createdAt: hoursAgo(7)
      },
      {
        id: 'c1000001-aaaa-4aaa-8aaa-aaaaaaaa0002',
        postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
        authorId: chris.id,
        content:
          'Please keep the SVG error copy. Support already trained on it.',
        createdAt: hoursAgo(6)
      },
      {
        id: 'c1000001-aaaa-4aaa-8aaa-aaaaaaaa0003',
        postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04',
        authorId: sarah.id,
        content: 'Calendar hold is on my team. Thank you for the reminder.',
        createdAt: hoursAgo(9)
      },
      {
        id: 'c1000001-aaaa-4aaa-8aaa-aaaaaaaa0004',
        postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa06',
        authorId: james.id,
        content: 'Well done. Mention this at all-hands — it is a real win.',
        createdAt: hoursAgo(4)
      },
      {
        id: 'c1000001-aaaa-4aaa-8aaa-aaaaaaaa0005',
        postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa08',
        authorId: noah.id,
        content: 'Hero A is stronger. I tightened the type scale in the file.',
        createdAt: hoursAgo(3)
      }
    ])
    .onConflictDoNothing()

  await db
    .insert(reactions)
    .values([
      { postId: demoPosts[0].id, userId: sarah.id },
      { postId: demoPosts[0].id, userId: emily.id },
      { postId: demoPosts[0].id, userId: maria.id },
      { postId: demoPosts[1].id, userId: sarah.id },
      { postId: demoPosts[1].id, userId: james.id },
      { postId: demoPosts[1].id, userId: noah.id },
      { postId: demoPosts[2].id, userId: priya.id },
      { postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', userId: daniel.id },
      { postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', userId: priya.id },
      { postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', userId: alex.id },
      { postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', userId: chris.id },
      { postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04', userId: emily.id },
      { postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa06', userId: sarah.id },
      { postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa06', userId: james.id },
      { postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa07', userId: sarah.id }
    ])
    .onConflictDoNothing()

  const inviteId = 'a1000001-aaaa-4aaa-8aaa-aaaaaaaa0091'
  await db
    .insert(workspaceInvitations)
    .values({
      id: inviteId,
      workspaceId: DEMO_WORKSPACE_ID,
      email: 'jordan.lee@example.com',
      role: 'member',
      invitedById: sarah.id,
      status: 'pending',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    })
    .onConflictDoNothing()

  await db
    .insert(notifications)
    .values([
      {
        id: 'a1000001-aaaa-4aaa-8aaa-aaaaaaaa0081',
        recipientId: sarah.id,
        actorId: daniel.id,
        type: 'comment',
        postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
        commentId: 'c1000001-aaaa-4aaa-8aaa-aaaaaaaa0001',
        createdAt: hoursAgo(7)
      },
      {
        id: 'a1000001-aaaa-4aaa-8aaa-aaaaaaaa0082',
        recipientId: sarah.id,
        actorId: chris.id,
        type: 'comment',
        postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
        commentId: 'c1000001-aaaa-4aaa-8aaa-aaaaaaaa0002',
        createdAt: hoursAgo(6)
      },
      {
        id: 'a1000001-aaaa-4aaa-8aaa-aaaaaaaa0083',
        recipientId: sarah.id,
        actorId: daniel.id,
        type: 'reaction',
        postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
        createdAt: hoursAgo(7)
      },
      {
        id: 'a1000001-aaaa-4aaa-8aaa-aaaaaaaa0084',
        recipientId: james.id,
        actorId: sarah.id,
        type: 'reaction',
        postId: demoPosts[0].id,
        createdAt: hoursAgo(70),
        readAt: hoursAgo(60)
      },
      {
        id: 'a1000001-aaaa-4aaa-8aaa-aaaaaaaa0085',
        recipientId: emily.id,
        actorId: noah.id,
        type: 'comment',
        postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa08',
        commentId: 'c1000001-aaaa-4aaa-8aaa-aaaaaaaa0005',
        workspaceId: PRODUCT_LAB_ID,
        createdAt: hoursAgo(3)
      }
    ])
    .onConflictDoNothing()

  const crowd = makeCrowd(55)
  await db
    .insert(users)
    .values(
      crowd.map((user) => ({
        id: user.id,
        email: user.email,
        passwordHash,
        accountKind: 'demo_persona' as const
      }))
    )
    .onConflictDoNothing()
  await db
    .insert(profiles)
    .values(
      crowd.map((user) => ({
        userId: user.id,
        displayName: user.displayName,
        jobTitle: user.jobTitle,
        bio: user.bio,
        avatarUrl: user.avatarUrl
      }))
    )
    .onConflictDoNothing()

  const workspaceRows = await db.select({ id: workspaces.id }).from(workspaces)
  await db
    .insert(workspaceMembers)
    .values(
      workspaceRows.flatMap((workspace) =>
        crowd.map((user) => ({
          workspaceId: workspace.id,
          userId: user.id,
          role: 'member' as const
        }))
      )
    )
    .onConflictDoNothing()

  const authors = [...allUsers, ...crowd]
  const extraPosts = [
    ...makeCrowdPosts(DEMO_WORKSPACE_ID, authors, 55, 0),
    ...makeCrowdPosts(PRODUCT_LAB_ID, authors, 55, 100)
  ]
  await db.insert(posts).values(extraPosts).onConflictDoNothing()

  const seededFiles = await seedWorkspaceFiles()
  await db.insert(files).values(seededFiles).onConflictDoNothing()

  await db
    .insert(tasks)
    .values([
      {
        id: 'b0a0d000-0000-4000-8000-000000000001',
        workspaceId: DEMO_WORKSPACE_ID,
        title: 'Write Kanban board copy',
        description:
          'Keep the empty state short and the column headers obvious.',
        status: 'todo',
        priority: 'medium',
        position: 0,
        assigneeId: emily.id,
        dueDate: '2026-11-04',
        createdBy: sarah.id
      },
      {
        id: 'b0a0d000-0000-4000-8000-000000000002',
        workspaceId: DEMO_WORKSPACE_ID,
        title: 'Review file size limits with Support',
        description:
          'Confirm 10 MB docs / 25 MB media is still the canned reply.',
        status: 'todo',
        priority: 'high',
        position: 1,
        assigneeId: james.id,
        dueDate: '2026-11-03',
        createdBy: sarah.id
      },
      {
        id: 'b0a0d000-0000-4000-8000-000000000003',
        workspaceId: DEMO_WORKSPACE_ID,
        title: 'Ship workspace task board',
        description:
          'Three columns, drag-and-drop, membership checks on the API.',
        status: 'in_progress',
        priority: 'high',
        position: 0,
        assigneeId: daniel.id,
        dueDate: '2026-11-01',
        createdBy: sarah.id
      },
      {
        id: 'b0a0d000-0000-4000-8000-000000000004',
        workspaceId: DEMO_WORKSPACE_ID,
        title: 'Seed demo members for overflow',
        description: 'Already on the feed. Keep the board small on purpose.',
        status: 'done',
        priority: 'low',
        position: 0,
        assigneeId: sarah.id,
        dueDate: null,
        createdBy: sarah.id
      }
    ])
    .onConflictDoNothing({ target: tasks.id })

  await client.end()

  const people = allUsers.length + crowd.length
  console.log(
    `Seeded ${people} users, ${workspaceRows.length} workspaces, ${demoPosts.length + extraPosts.length} posts, ${seededFiles.length} files, channels, DMs, reactions, and notifications.`
  )
  console.log(
    'Seeded persona passwords live in demo-users.ts (local/e2e only). Do not seed production.'
  )
}

const FIRST_NAMES = [
  'Ava',
  'Ben',
  'Chloe',
  'Diego',
  'Elena',
  'Farid',
  'Grace',
  'Hugo',
  'Ines',
  'Jules',
  'Kai',
  'Lara',
  'Mateo',
  'Nina',
  'Omar',
  'Pia',
  'Quinn',
  'Rosa',
  'Samir',
  'Tara'
] as const

const LAST_NAMES = [
  'Adler',
  'Bennett',
  'Cho',
  'Duarte',
  'Ellis',
  'Frost',
  'Garcia',
  'Hassan',
  'Ito',
  'Jansen',
  'Khan',
  'Lang',
  'Moreau',
  'Nair',
  'Okeke',
  'Petrov',
  'Rahman',
  'Silva',
  'Tanaka',
  'Vega'
] as const

const JOBS = [
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'Support',
  'People Team',
  'Finance',
  'Operations'
] as const

function crowdId(kind: 'user' | 'post', n: number): string {
  const prefix = kind === 'user' ? 'd0e1f2a3' : 'e0f1a2b3'
  return `${prefix}-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
}

function makeCrowd(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1
    const first = FIRST_NAMES[index % FIRST_NAMES.length]
    const last =
      LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]
    const slug = `${first}.${last}.${n}`.toLowerCase()
    return {
      id: crowdId('user', n),
      email: `${slug}@teamhub.local`,
      displayName: `${first} ${last}`,
      jobTitle: JOBS[index % JOBS.length],
      bio: `Mock teammate ${n} for dense directory and feed layouts.`,
      avatarUrl: `https://i.pravatar.cc/128?u=${slug}`
    }
  })
}

function seedFileId(n: number): string {
  return `f1000001-aaaa-4aaa-8aaa-${n.toString(16).padStart(12, '0')}`
}

const MINIMAL_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 68>>stream
BT /F1 18 Tf 72 720 Td (TeamHub product spec) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF
`
)

const MINIMAL_TXT = Buffer.from(
  'TeamHub file limits: 10 MB per file, no SVG.\nPNG, JPEG, WebP, GIF, PDF, TXT, DOCX, XLSX are allowed.\n',
  'utf8'
)

async function fetchImageBytes(url: string): Promise<Buffer> {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`Could not fetch ${url} (${response.status})`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function seedWorkspaceFiles() {
  const specs: Array<{
    n: number
    originalName: string
    contentType: string
    uploadedBy: string
    workspaceId: string
    postId?: string
    messageId?: string
    hours: number
    bytes?: Buffer
    url?: string
  }> = [
    {
      n: 1,
      originalName: 'offsites-highlights.jpg',
      contentType: 'image/jpeg',
      uploadedBy: emily.id,
      workspaceId: DEMO_WORKSPACE_ID,
      postId: demoPosts[1]?.id,
      hours: 48,
      url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80'
    },
    {
      n: 2,
      originalName: 'whiteboard-session.jpg',
      contentType: 'image/jpeg',
      uploadedBy: emily.id,
      workspaceId: DEMO_WORKSPACE_ID,
      postId: demoPosts[1]?.id,
      hours: 47,
      url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80'
    },
    {
      n: 3,
      originalName: '2025-plans.jpg',
      contentType: 'image/jpeg',
      uploadedBy: james.id,
      workspaceId: DEMO_WORKSPACE_ID,
      postId: demoPosts[0]?.id,
      hours: 72,
      url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80'
    },
    {
      n: 4,
      originalName: 'files-composer.jpg',
      contentType: 'image/jpeg',
      uploadedBy: sarah.id,
      workspaceId: DEMO_WORKSPACE_ID,
      postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
      hours: 8,
      url: 'https://picsum.photos/seed/teamhub-composer/1200/750'
    },
    {
      n: 5,
      originalName: 'files-limits.txt',
      contentType: 'text/plain',
      uploadedBy: sarah.id,
      workspaceId: DEMO_WORKSPACE_ID,
      postId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
      hours: 8,
      bytes: MINIMAL_TXT
    },
    {
      n: 6,
      originalName: 'product-spec.pdf',
      contentType: 'application/pdf',
      uploadedBy: daniel.id,
      workspaceId: DEMO_WORKSPACE_ID,
      postId: demoPosts[2]?.id,
      hours: 36,
      bytes: MINIMAL_PDF
    },
    {
      n: 7,
      originalName: 'office-kitchen.jpg',
      contentType: 'image/jpeg',
      uploadedBy: maria.id,
      workspaceId: DEMO_WORKSPACE_ID,
      postId: crowdId('post', 3),
      hours: 3,
      url: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=1200&q=80'
    },
    {
      n: 8,
      originalName: 'staging-green.jpg',
      contentType: 'image/jpeg',
      uploadedBy: alex.id,
      workspaceId: DEMO_WORKSPACE_ID,
      postId: crowdId('post', 6),
      hours: 6,
      url: 'https://picsum.photos/seed/teamhub-staging/1200/700'
    },
    {
      n: 9,
      originalName: 'northwind-live.jpg',
      contentType: 'image/jpeg',
      uploadedBy: lena.id,
      workspaceId: DEMO_WORKSPACE_ID,
      messageId: 'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0004',
      hours: 1,
      url: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=80'
    },
    {
      n: 10,
      originalName: 'all-hands-agenda.jpg',
      contentType: 'image/jpeg',
      uploadedBy: james.id,
      workspaceId: DEMO_WORKSPACE_ID,
      messageId: 'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0001',
      hours: 30,
      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80'
    },
    {
      n: 11,
      originalName: 'empty-states.jpg',
      contentType: 'image/jpeg',
      uploadedBy: noah.id,
      workspaceId: DEMO_WORKSPACE_ID,
      messageId: 'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0011',
      hours: 11,
      url: 'https://picsum.photos/seed/teamhub-empty/1000/700'
    },
    {
      n: 12,
      originalName: 'brand-deck-cover.jpg',
      contentType: 'image/jpeg',
      uploadedBy: emily.id,
      workspaceId: DEMO_WORKSPACE_ID,
      messageId: 'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0009',
      hours: 22,
      url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80'
    },
    {
      n: 13,
      originalName: 'lab-hero-a.jpg',
      contentType: 'image/jpeg',
      uploadedBy: emily.id,
      workspaceId: PRODUCT_LAB_ID,
      messageId: 'b1000001-aaaa-4aaa-8aaa-aaaaaaaa0014',
      hours: 4,
      url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'
    },
    {
      n: 14,
      originalName: 'lab-experiment.jpg',
      contentType: 'image/jpeg',
      uploadedBy: daniel.id,
      workspaceId: PRODUCT_LAB_ID,
      postId: crowdId('post', 101),
      hours: 10,
      url: 'https://picsum.photos/seed/teamhub-lab/1200/800'
    },
    {
      n: 15,
      originalName: 'members-overflow.jpg',
      contentType: 'image/jpeg',
      uploadedBy: sarah.id,
      workspaceId: DEMO_WORKSPACE_ID,
      postId: crowdId('post', 7),
      hours: 7,
      url: 'https://picsum.photos/seed/teamhub-members/1100/700'
    },
    {
      n: 16,
      originalName: 'desk-setup.jpg',
      contentType: 'image/jpeg',
      uploadedBy: priya.id,
      workspaceId: DEMO_WORKSPACE_ID,
      postId: crowdId('post', 2),
      hours: 2,
      url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80'
    }
  ]

  const rows = []
  for (const spec of specs) {
    let bytes = spec.bytes
    if (!bytes && spec.url) {
      try {
        bytes = await fetchImageBytes(spec.url)
      } catch (error) {
        console.warn(
          `Skipping ${spec.originalName}: ${error instanceof Error ? error.message : 'fetch failed'}`
        )
        continue
      }
    }
    if (!bytes || bytes.byteLength === 0) {
      continue
    }
    const id = seedFileId(spec.n)
    const objectKey = objectKeyFor({
      workspaceId: spec.workspaceId,
      fileId: id,
      filename: spec.originalName
    })
    await writeLocalObject(objectKey, bytes)
    rows.push({
      id,
      workspaceId: spec.workspaceId,
      uploadedBy: spec.uploadedBy,
      originalName: spec.originalName,
      contentType: spec.contentType,
      byteSize: bytes.byteLength,
      objectKey,
      status: 'ready' as const,
      messageId: spec.messageId ?? null,
      postId: spec.postId ?? null,
      createdAt: hoursAgo(spec.hours),
      uploadedAt: hoursAgo(spec.hours)
    })
  }
  return rows
}

function makeCrowdPosts(
  workspaceId: string,
  authors: { id: string }[],
  count: number,
  offset: number
) {
  const snippets = [
    'Weekly notes are in the shared doc. Call out blockers in the thread.',
    'Shipped a small fix for the empty state. Please refresh before filing a bug.',
    'Office kitchen restocked. If you took the last oat milk, add it to the list.',
    'Customer asked about file size limits again — 10 MB, no SVG.',
    'Retro is Thursday. Add one win and one friction item before noon.',
    'The staging deploy is green. Prod is still frozen until Friday.',
    'I owe a screenshot of the members overflow. Will post after standup.',
    'If the feed feels long, that is the point — we are testing pagination.'
  ]
  return Array.from({ length: count }, (_, index) => {
    const n = offset + index + 1
    const author = authors[n % authors.length]
    if (!author) {
      throw new Error('Author list is empty')
    }
    return {
      id: crowdId('post', n),
      workspaceId,
      authorId: author.id,
      content: `${snippets[index % snippets.length]} (#${n})`,
      createdAt: hoursAgo(1 + index),
      updatedAt: hoursAgo(1 + index)
    }
  })
}

seed().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
