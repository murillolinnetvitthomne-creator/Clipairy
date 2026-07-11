import { pgTable, text, timestamp, boolean, integer, serial, jsonb } from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------
// One row per user tracking their purchased plan and remaining trial credits.
// A user with no plan (planId is null) has 0 credits and cannot generate.

export const accountPlan = pgTable('account_plan', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull().unique(),
  planId: text('planId'), // 'payg' | 'growth' | 'team' | null (no plan)
  credits: integer('credits').notNull().default(0),
  unlimited: boolean('unlimited').notNull().default(false),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// One row per AI generation job. Polled by the client while the async
// pipeline (script -> images -> video -> voiceover) runs on the server.
export const generation = pgTable('generation', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  // 'pending' | 'running' | 'done' | 'error'
  status: text('status').notNull().default('pending'),
  sellingPoints: text('sellingPoints'),
  script: text('script'),
  storyboard: jsonb('storyboard').$type<StoryboardScene[]>(),
  imageUrls: jsonb('imageUrls').$type<string[]>(),
  videoUrl: text('videoUrl'),
  audioUrl: text('audioUrl'),
  error: text('error'),
  // 0..12 — which workflow step the pipeline has reached, drives the UI.
  step: integer('step').notNull().default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export type StoryboardScene = {
  scene: string
  caption: string
}
