import 'server-only'
import { db } from '@/lib/db'
import { generation } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateScript } from './script'
import { generateStoryboardImages, generateAdVideo } from './media'
import { generateVoiceover } from './voiceover'

// Persist partial progress for a generation job so the client poller can
// reflect which of the 12 workflow steps is currently active.
async function setStep(genId: number, step: number, fields: Record<string, unknown> = {}) {
  await db
    .update(generation)
    .set({ step, updatedAt: new Date(), ...fields })
    .where(eq(generation.id, genId))
}

// Runs the full script -> images -> video -> voiceover pipeline for one job,
// updating the generation row as it progresses. Designed to run in the
// background (via next/server `after`) after the action has responded.
export async function runPipeline(genId: number, userId: string, sellingPoints: string) {
  try {
    await setStep(genId, 1, { status: 'running' })

    // Steps 1-3: analyse framework + write the ad script and storyboard.
    const { script, storyboard } = await generateScript(sellingPoints)
    await setStep(genId, 3, { script, storyboard })

    // Steps 4-7: generate a storyboard frame image per scene.
    await setStep(genId, 4)
    const imageUrls = await generateStoryboardImages(storyboard, userId, genId)
    await setStep(genId, 7, { imageUrls })

    // Steps 8-10: generate the ad video, seeded by the first frame.
    await setStep(genId, 8)
    const videoUrl = await generateAdVideo(script, storyboard, imageUrls[0], userId, genId)
    await setStep(genId, 10, { videoUrl })

    // Step 11: optional AI voiceover (skipped gracefully when fal is absent).
    await setStep(genId, 11)
    const audioUrl = await generateVoiceover(script, userId, genId)

    // Step 12: done.
    await setStep(genId, 12, { status: 'done', audioUrl })
  } catch (err) {
    console.log('[v0] generation pipeline failed:', err instanceof Error ? err.message : err)
    await db
      .update(generation)
      .set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Generation failed',
        updatedAt: new Date(),
      })
      .where(eq(generation.id, genId))
  }
}
