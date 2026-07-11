import 'server-only'
import { generateImage, experimental_generateVideo as generateVideo } from 'ai'
import { put } from '@vercel/blob'
import {
  IMAGE_MODEL,
  VIDEO_MODEL,
  ASPECT_RATIO,
  VIDEO_RESOLUTION,
  VIDEO_DURATION_SECONDS,
} from './models'
import type { StoryboardScene } from '@/lib/db/schema'

// Upload raw bytes to Vercel Blob and return the public URL.
async function uploadBytes(
  bytes: Uint8Array,
  mediaType: string,
  path: string,
): Promise<string> {
  const blob = await put(path, Buffer.from(bytes), {
    access: 'public',
    contentType: mediaType,
    addRandomSuffix: true,
  })
  return blob.url
}

// Generate one storyboard frame per scene and store each in Blob.
export async function generateStoryboardImages(
  scenes: StoryboardScene[],
  userId: string,
  genId: number,
): Promise<string[]> {
  const urls: string[] = []
  for (let i = 0; i < scenes.length; i++) {
    const { image } = await generateImage({
      model: IMAGE_MODEL,
      prompt:
        `Vertical (9:16) short-video ad frame. ${scenes[i].scene}. ` +
        `Bright, high-energy, professional product photography, cinematic lighting.`,
      aspectRatio: ASPECT_RATIO,
    })
    urls.push(
      await uploadBytes(
        image.uint8Array,
        image.mediaType,
        `generations/${userId}/${genId}/frame-${i}.png`,
      ),
    )
  }
  return urls
}

// Generate the ad video from the script, optionally seeded by the first frame
// image (image-to-video), and store it in Blob.
export async function generateAdVideo(
  script: string,
  scenes: StoryboardScene[],
  firstFrameUrl: string | undefined,
  userId: string,
  genId: number,
): Promise<string> {
  const prompt =
    `A vertical short-video product ad. Narration: "${script}". ` +
    `Scenes: ${scenes.map((s, i) => `${i + 1}. ${s.scene}`).join(' ')} ` +
    `Fast-paced, energetic, professional commercial style.`

  const { video } = await generateVideo({
    model: VIDEO_MODEL,
    prompt,
    aspectRatio: ASPECT_RATIO,
    resolution: VIDEO_RESOLUTION,
    duration: VIDEO_DURATION_SECONDS,
    ...(firstFrameUrl
      ? { frameImages: [{ image: firstFrameUrl, frameType: 'first_frame' as const }] }
      : {}),
  })

  return uploadBytes(
    video.uint8Array,
    video.mediaType,
    `generations/${userId}/${genId}/video.mp4`,
  )
}
