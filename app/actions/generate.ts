'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { accountPlan, generation, type StoryboardScene } from '@/lib/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { consumeCredit } from './account'
import { start } from 'workflow/api'
import {
  generateVideoWorkflow,
  type GenerateVideoInput,
} from '@/workflows/generate-video'

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
  duration: GenerateVideoInput['duration']
  aspectRatio: GenerateVideoInput['aspectRatio']
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
    duration: row.duration as GenerateVideoInput['duration'],
    aspectRatio: row.aspectRatio as GenerateVideoInput['aspectRatio'],
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
export async function startGeneration(
  sellingPoints: string,
  duration: GenerateVideoInput['duration'] = 8,
  aspectRatio: GenerateVideoInput['aspectRatio'] = '9:16',
): Promise<GenerationState> {
  const userId = await getUserId()
  if (![8, 16, 24, 30].includes(duration)) throw new Error('INVALID_DURATION')
  if (!['9:16', '16:9'].includes(aspectRatio)) throw new Error('INVALID_ASPECT_RATIO')

  // Every finished video consumes exactly one credit, regardless of duration.
  await consumeCredit()

  const cleanSellingPoints = sellingPoints.trim()
  const inserted = await db
    .insert(generation)
    .values({
      userId,
      sellingPoints: cleanSellingPoints || null,
      duration,
      aspectRatio,
      status: 'pending',
      step: 0,
    })
    .returning()

  const row = inserted[0]
  try {
    const run = await start(generateVideoWorkflow, [{
      genId: row.id,
      userId,
      sellingPoints: cleanSellingPoints,
      duration,
      aspectRatio,
    }])
    await db
      .update(generation)
      .set({ workflowRunId: run.runId, updatedAt: new Date() })
      .where(eq(generation.id, row.id))
  } catch (error) {
    await db.transaction(async (tx) => {
      await tx.delete(generation).where(eq(generation.id, row.id))
      await tx
        .update(accountPlan)
        .set({ credits: sql`${accountPlan.credits} + 1`, updatedAt: new Date() })
        .where(and(eq(accountPlan.userId, userId), eq(accountPlan.unlimited, false)))
    })
    throw error
  }

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
