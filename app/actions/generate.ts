'use server'

import { after } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generation, type StoryboardScene } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { consumeCredit } from './account'
import { runPipeline } from '@/lib/ai/pipeline'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export type GenerationState = {
  id: number
  status: 'pending' | 'running' | 'done' | 'error'
  step: number
  sellingPoints: string | null
  script: string | null
  storyboard: StoryboardScene[] | null
  imageUrls: string[] | null
  videoUrl: string | null
  audioUrl: string | null
  error: string | null
  createdAt: string
}

function toState(row: typeof generation.$inferSelect): GenerationState {
  return {
    id: row.id,
    status: row.status as GenerationState['status'],
    step: row.step,
    sellingPoints: row.sellingPoints,
    script: row.script,
    storyboard: row.storyboard ?? null,
    imageUrls: row.imageUrls ?? null,
    videoUrl: row.videoUrl,
    audioUrl: row.audioUrl,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
  }
}

/**
 * Starts a real AI generation. Enforces the plan/credit gate by consuming a
 * credit first, creates the job row, then runs the pipeline in the background
 * so the client can poll for progress.
 */
export async function startGeneration(sellingPoints: string): Promise<GenerationState> {
  const userId = await getUserId()

  // Gate: throws NO_PLAN / NO_CREDITS if the user cannot trial. This also
  // decrements one credit atomically.
  await consumeCredit()

  const inserted = await db
    .insert(generation)
    .values({ userId, sellingPoints: sellingPoints.trim() || null, status: 'pending', step: 0 })
    .returning()

  const row = inserted[0]

  // Run the heavy pipeline after the response is sent.
  after(async () => {
    await runPipeline(row.id, userId, sellingPoints.trim())
  })

  return toState(row)
}

/** Polls a single generation job, scoped to the current user. */
export async function getGeneration(id: number): Promise<GenerationState | null> {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(generation)
    .where(and(eq(generation.id, id), eq(generation.userId, userId)))
    .limit(1)
  return rows[0] ? toState(rows[0]) : null
}

/** Returns the current user's recent generation history. */
export async function getHistory(): Promise<GenerationState[]> {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(generation)
    .where(eq(generation.userId, userId))
    .orderBy(desc(generation.createdAt))
    .limit(12)
  return rows.map(toState)
}
