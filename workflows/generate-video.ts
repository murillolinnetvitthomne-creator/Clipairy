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
  duration: VideoDuration
  aspectRatio: VideoAspectRatio
}

async function setProgress(genId: number, step: number, fields: Record<string, unknown> = {}) {
  'use step'
  await db.update(generation).set({ step, updatedAt: new Date(), ...fields }).where(eq(generation.id, genId))
}

async function createScript(input: GenerateVideoInput) {
  'use step'
  return generateScript(input.sellingPoints, input.duration, input.aspectRatio)
}

async function createFrames(
  storyboard: Awaited<ReturnType<typeof generateScript>>['storyboard'],
  input: GenerateVideoInput,
) {
  'use step'
  return generateStoryboardImages(storyboard, input.userId, input.genId, input.aspectRatio)
}

async function createSegment(
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

async function joinSegments(urls: string[], input: GenerateVideoInput) {
  'use step'
  return assembleVideo(urls, input.duration, input.userId, input.genId)
}

async function createVoiceover(script: string, input: GenerateVideoInput) {
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

export async function generateVideoWorkflow(input: GenerateVideoInput) {
  'use workflow'

  try {
    await setProgress(input.genId, 1, { status: 'running', error: null })
    const { script, storyboard } = await createScript(input)
    await setProgress(input.genId, 3, { script, storyboard })

    await setProgress(input.genId, 4)
    const imageUrls = await createFrames(storyboard, input)
    await setProgress(input.genId, 7, { imageUrls })

    await setProgress(input.genId, 8)
    const segmentCount = Math.ceil(input.duration / 8)
    const segmentUrls: string[] = []
    for (let index = 0; index < segmentCount; index++) {
      segmentUrls.push(await createSegment(script, storyboard, imageUrls[0], input, index))
      await setProgress(input.genId, Math.min(9, 8 + Math.ceil(((index + 1) / segmentCount) * 2)))
    }
    const videoUrl = await joinSegments(segmentUrls, input)
    await setProgress(input.genId, 10, { videoUrl })

    await setProgress(input.genId, 11)
    const audioUrl = await createVoiceover(script, input)
    await setProgress(input.genId, 12, { status: 'done', audioUrl })
    return { videoUrl }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed'
    await failGeneration(input, message)
    throw error
  }
}
