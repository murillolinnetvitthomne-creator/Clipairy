'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { accountPlan, generation, type StoryboardScene } from '@/lib/db/schema'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { start } from 'workflow/api'
import { head } from '@vercel/blob'
import {
  getCharacterPreset,
  getCreditsRequired,
  getQualityTier,
  type CharacterPresetId,
  type QualityTier,
} from '@/lib/video-options'
import { getVideoLanguage, type VideoLanguage } from '@/lib/video-languages'
import {
  allowsCharacterReference,
  getProductAudience,
  type ProductAudience,
} from '@/lib/product-audiences'
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
  qualityTier: QualityTier
  videoLanguage: VideoLanguage
  productAudience: ProductAudience
  characterPresetId: CharacterPresetId | null
  characterSource: 'none' | 'preset' | 'upload'
  creditsCharged: number
  script: string | null
  storyboard: StoryboardScene[] | null
  imageUrls: string[] | null
  videoUrl: string | null
  audioUrl: string | null
  error: string | null
  createdAt: string
}

function mediaUrl(value: string | null): string | null {
  if (!value || value.startsWith('http://') || value.startsWith('https://')) return value
  return `/api/uploads/file?pathname=${encodeURIComponent(value)}`
}

function toState(row: typeof generation.$inferSelect): GenerationState {
  return {
    id: row.id,
    status: row.status as GenerationState['status'],
    step: row.step,
    sellingPoints: row.sellingPoints,
    duration: row.duration as GenerateVideoInput['duration'],
    aspectRatio: row.aspectRatio as GenerateVideoInput['aspectRatio'],
    qualityTier: row.qualityTier as QualityTier,
    videoLanguage: row.videoLanguage as VideoLanguage,
    productAudience: row.productAudience as ProductAudience,
    characterPresetId: row.characterPresetId as CharacterPresetId | null,
    characterSource: row.characterSource as GenerationState['characterSource'],
    creditsCharged: row.creditsCharged,
    script: row.script,
    storyboard: row.storyboard ?? null,
    imageUrls: row.imageUrls?.map((value) => mediaUrl(value) ?? value) ?? null,
    videoUrl: mediaUrl(row.videoUrl),
    audioUrl: mediaUrl(row.audioUrl),
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
  referenceVideoPath?: string,
  productImagePaths: string[] = [],
  qualityTier: QualityTier = 'standard',
  characterPresetId?: CharacterPresetId,
  characterImagePath?: string,
  videoLanguage?: VideoLanguage,
  productAudience?: ProductAudience,
): Promise<GenerationState> {
  const userId = await getUserId()
  if (![8, 16, 24, 30].includes(duration)) throw new Error('INVALID_DURATION')
  if (!['9:16', '16:9'].includes(aspectRatio)) throw new Error('INVALID_ASPECT_RATIO')
  if (productImagePaths.length > 6) throw new Error('TOO_MANY_IMAGES')

  const quality = getQualityTier(qualityTier)
  if (!quality) throw new Error('INVALID_QUALITY')
  const language = getVideoLanguage(videoLanguage)
  if (!language) throw new Error('VIDEO_LANGUAGE_REQUIRED')
  const audience = getProductAudience(productAudience)
  if (!audience || !productAudience) throw new Error('PRODUCT_AUDIENCE_REQUIRED')
  const characterAllowed = allowsCharacterReference(productAudience)
  const effectivePresetId = characterAllowed ? characterPresetId : undefined
  const effectiveCharacterImagePath = characterAllowed ? characterImagePath : undefined
  const preset = effectivePresetId ? getCharacterPreset(effectivePresetId) : undefined
  if (effectivePresetId && !preset) throw new Error('INVALID_CHARACTER')
  if (effectivePresetId && effectiveCharacterImagePath) throw new Error('MULTIPLE_CHARACTERS')

  const prefix = `uploads/${userId}/`
  const paths = [
    ...(referenceVideoPath ? [referenceVideoPath] : []),
    ...productImagePaths,
    ...(effectiveCharacterImagePath ? [effectiveCharacterImagePath] : []),
  ]
  if (paths.some((pathname) => !pathname.startsWith(prefix))) throw new Error('INVALID_UPLOAD')

  const metadata = await Promise.all(paths.map((pathname) => head(pathname)))
  const videoMeta = referenceVideoPath ? metadata[0] : null
  const imageMeta = referenceVideoPath ? metadata.slice(1) : metadata
  if (videoMeta && (!videoMeta.contentType.startsWith('video/') || videoMeta.size > 100 * 1024 * 1024)) {
    throw new Error('INVALID_VIDEO')
  }
  if (imageMeta.some((item) => !['image/jpeg', 'image/png', 'image/webp'].includes(item.contentType) || item.size > 12 * 1024 * 1024)) {
    throw new Error('INVALID_IMAGE')
  }

  const creditsRequired = getCreditsRequired(duration, qualityTier)
  const characterSource = effectiveCharacterImagePath ? 'upload' : preset ? 'preset' : 'none'
  const cleanSellingPoints = sellingPoints.trim()

  const row = await db.transaction(async (tx) => {
    const debited = await tx
      .update(accountPlan)
      .set({
        credits: sql`${accountPlan.credits} - ${creditsRequired}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(accountPlan.userId, userId),
          eq(accountPlan.unlimited, false),
          gte(accountPlan.credits, creditsRequired),
        ),
      )
      .returning({ id: accountPlan.id })

    if (debited.length === 0) return null

    const [created] = await tx
      .insert(generation)
      .values({
        userId,
        sellingPoints: cleanSellingPoints || null,
        referenceVideoPath: referenceVideoPath ?? null,
        productImagePaths,
        duration,
        aspectRatio,
        qualityTier,
        videoModel: quality.model,
        videoLanguage: language.code,
        productAudience,
        characterSource,
        characterPresetId: preset?.id ?? null,
        characterImagePath: effectiveCharacterImagePath ?? null,
        status: 'pending',
        step: 0,
        creditsCharged: creditsRequired,
        creditsRefunded: false,
      })
      .returning()

    return created
  })

  if (!row) throw new Error('INSUFFICIENT_CREDITS')
  try {
    const run = await start(generateVideoWorkflow, [{
      genId: row.id,
      userId,
      sellingPoints: cleanSellingPoints,
      referenceVideoPath: referenceVideoPath ?? null,
      productImagePaths,
      duration,
      aspectRatio,
      qualityTier,
      characterPresetId: preset?.id ?? null,
      characterImagePath: effectiveCharacterImagePath ?? null,
      videoLanguage: language.code,
      productAudience,
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
        .set({
          credits: sql`${accountPlan.credits} + ${row.creditsCharged}`,
          updatedAt: new Date(),
        })
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
