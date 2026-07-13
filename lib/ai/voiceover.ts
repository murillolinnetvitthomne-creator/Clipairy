import 'server-only'
import { fal } from '@fal-ai/client'
import { put } from '@vercel/blob'
import { FAL_TTS_MODEL } from './models'

// Whether fal voiceover is available (only when the user has connected fal /
// set FAL_KEY). When absent the pipeline skips this optional step.
export function voiceoverEnabled(): boolean {
  return !!process.env.FAL_KEY
}

// Generate an AI voiceover for the script via fal, store it in Blob, and
// return the URL. Returns null when fal is not configured, so the pipeline can
// continue without audio.
export async function generateVoiceover(
  script: string,
  userId: string,
  genId: number,
): Promise<string | null> {
  if (!voiceoverEnabled()) return null

  fal.config({ credentials: process.env.FAL_KEY })

  const result = (await fal.subscribe(FAL_TTS_MODEL, {
    input: { prompt: script },
  })) as { data?: { audio?: { url?: string } } }

  const audioUrl = result?.data?.audio?.url
  if (!audioUrl) return null

  // Re-host the fal-hosted audio in our own Blob store for persistence.
  const res = await fetch(audioUrl)
  const bytes = new Uint8Array(await res.arrayBuffer())
  const blob = await put(`generations/${userId}/${genId}/voiceover.mp3`, Buffer.from(bytes), {
    access: 'private',
    contentType: res.headers.get('content-type') ?? 'audio/mpeg',
    addRandomSuffix: true,
  })
  return blob.pathname
}
