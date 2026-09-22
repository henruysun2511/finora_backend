export const SYSTEM_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const GROUP_ROLES = {
  OWNER: 'OWNER',
  ADMIN_GROUP: 'ADMIN_GROUP',
  MEMBER: 'MEMBER',
} as const;

export type GroupRole = (typeof GROUP_ROLES)[keyof typeof GROUP_ROLES];
