export const DEMO_CURRENT_USER_ID = '11111111-1111-4111-8111-111111111111'
export const DEMO_WORKSPACE_ID = '88888888-8888-4888-8888-888888888888'
export const DEMO_WORKSPACE_SLUG = 'teamhub'
export const DEMO_PASSWORD = 'TeamHub!dev'

export const demoUsers = [
  {
    id: DEMO_CURRENT_USER_ID,
    email: 'sarah.chen@teamhub.local',
    displayName: 'Sarah Chen',
    jobTitle: 'Product Team',
    bio: 'Building a more connected workplace.',
    avatarUrl: 'https://i.pravatar.cc/128?u=sarah.chen'
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'james.parker@teamhub.local',
    displayName: 'James Parker',
    jobTitle: 'CEO',
    bio: 'Grateful for the people who make TeamHub possible.',
    avatarUrl: 'https://i.pravatar.cc/128?u=james.parker'
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'emily.carter@teamhub.local',
    displayName: 'Emily Carter',
    jobTitle: 'Marketing',
    bio: 'Great discussions, fresh ideas, and an incredible team.',
    avatarUrl: 'https://i.pravatar.cc/128?u=emily.carter'
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'daniel.kim@teamhub.local',
    displayName: 'Daniel Kim',
    jobTitle: 'Engineering',
    bio: 'Sharing useful resources so the team can move faster.',
    avatarUrl: 'https://i.pravatar.cc/128?u=daniel.kim'
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'priya.shah@teamhub.local',
    displayName: 'Priya Shah',
    jobTitle: 'Engineering',
    bio: 'Always happy to review the notes.',
    avatarUrl: 'https://i.pravatar.cc/128?u=priya.shah'
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    email: 'alex.johnson@teamhub.local',
    displayName: 'Alex Johnson',
    jobTitle: 'Engineering',
    bio: 'Online and ready to collaborate.',
    avatarUrl: 'https://i.pravatar.cc/128?u=alex.johnson'
  },
  {
    id: '77777777-7777-4777-8777-777777777777',
    email: 'maria.lopez@teamhub.local',
    displayName: 'Maria Lopez',
    jobTitle: 'People Team',
    bio: 'Let’s sync up later this week.',
    avatarUrl: 'https://i.pravatar.cc/128?u=maria.lopez'
  }
] as const
