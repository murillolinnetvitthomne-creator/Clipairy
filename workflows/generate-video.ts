import { db } from '@/lib/db'
import { accountPlan, generation } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { generateScript } from '@/lib/ai/script'
import {
  assembleVideo,
  generateAdVideoSegment,
  generateStoryboardImages,
  type VideoAspectRatio,
  type VideoDuration,
} from '@/lib/ai/media'
import { generateVoiceover } from '@/lib/ai/voiceover'

export type GenerateVideoInput = {
  genId: number
  userId: string
  sellingPoints: string
  referenceVideoPath: string | null
  productImagePaths: string[]
  duration: VideoDuration
  aspectRatio: VideoAspectRatio
}

async function setProgress(genId: number, step: number, fields: Record<string, unknown> = {}) {
  'use step'
  await db.update(generation).set({ step, updatedAt: new Date(), ...fields }).where(eq(generation.id, genId))
}

async function createScript(input: GenerateVideoInput) {
  'use step'
  return generateScript(
    input.sellingPoints,
    input.duration,
    input.aspectRatio,
    input.referenceVideoPath,
    input.productImagePaths,
  )
}

// Versioned step names prevent new runs from resolving to media steps bundled
// by an older production deployment.
async function createPrivateFramesV2(
  storyboard: Awaited<ReturnType<typeof generateScript>>['storyboard'],
  input: GenerateVideoInput,
) {
  'use step'
  return generateStoryboardImages(
    storyboard,
    input.userId,
    input.genId,
    input.aspectRatio,
    input.productImagePaths,
  )
}

async function createPrivateSegmentV2(
  script: string,
  storyboard: Awaited<ReturnType<typeof generateScript>>['storyboard'],
  firstFrameUrl: string | undefined,
  input: GenerateVideoInput,
  segmentIndex: number,
) {
  'use step'
  return generateAdVideoSegment(
    script,
    storyboard,
    firstFrameUrl,
    input.userId,
    input.genId,
    segmentIndex,
    input.aspectRatio,
  )
}

async function joinPrivateSegmentsV2(urls: string[], input: GenerateVideoInput) {
  'use step'
  return assembleVideo(urls, input.duration, input.userId, input.genId)
}

async function createPrivateVoiceoverV2(script: string, input: GenerateVideoInput) {
  'use step'
  return generateVoiceover(script, input.userId, input.genId)
}

async function failGeneration(input: GenerateVideoInput, message: string) {
  'use step'
  await db.transaction(async (tx) => {
    await tx
      .update(generation)
      .set({ status: 'error', error: message, updatedAt: new Date() })
      .where(eq(generation.id, input.genId))
    await tx
      .update(accountPlan)
      .set({ credits: sql`${accountPlan.credits} + 1`, updatedAt: new Date() })
      .where(and(eq(accountPlan.userId, input.userId), eq(accountPlan.unlimited, false)))
  })
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>
    if (typeof value.message === 'string' && value.message) return value.message
    if (typeof value.responseBody === 'string' && value.responseBody) return value.responseBody.slice(0, 1000)
    if (value.cause) return getErrorMessage(value.cause)
  }
  return 'Generation failed'
}

export async function generateVideoWorkflow(input: GenerateVideoInput) {
  'use workflow'

  try {
    await setProgress(input.genId, 1, { status: 'running', error: null })
    const { script, storyboard } = await createScript(input)
    await setProgress(input.genId, 3, { script, storyboard })

    await setProgress(input.genId, 4)
    const imageUrls = await createPrivateFramesV2(storyboard, input)
    await setProgress(input.genId, 7, { imageUrls })

    await setProgress(input.genId, 8)
    const segmentCount = Math.ceil(input.duration / 8)
    const segmentUrls: string[] = []
    for (let index = 0; index < segmentCount; index++) {
      segmentUrls.push(await createPrivateSegmentV2(script, storyboard, imageUrls[0], input, index))
      await setProgress(input.genId, Math.min(9, 8 + Math.ceil(((index + 1) / segmentCount) * 2)))
    }
    const videoUrl = await joinPrivateSegmentsV2(segmentUrls, input)
    await setProgress(input.genId, 10, { videoUrl })

    await setProgress(input.genId, 11)
    const audioUrl = await createPrivateVoiceoverV2(script, input)
    await setProgress(input.genId, 12, { status: 'done', audioUrl })
    return { videoUrl }
  } catch (error) {
    const message = getErrorMessage(error)
    await failGeneration(input, message)
    throw error
  }
}
