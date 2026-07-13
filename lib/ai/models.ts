// Central model configuration for the generation pipeline.
// All models are referenced by Vercel AI Gateway "provider/model" strings,
// which the AI SDK resolves with zero provider-package setup.

// Multimodal model that analyzes the uploaded reference video and product images,
// then writes the ad script and storyboard.
export const TEXT_MODEL = 'google/gemini-2.5-flash'

// Image model for storyboard frames.
export const IMAGE_MODEL = 'openai/gpt-image-1'

// Video model (user chose Veo via AI Gateway). Fast variant for shorter waits.
export const VIDEO_MODEL = 'google/veo-3.1-fast-generate-001'

// fal voiceover model. Only used when a FAL_KEY is configured.
export const FAL_TTS_MODEL = 'fal-ai/kokoro'

// Vertical short-video format shared across image + video steps.
export const ASPECT_RATIO = '9:16' as const
export const VIDEO_RESOLUTION = '720x1280' as const
export const VIDEO_DURATION_SECONDS = 8
// Number of storyboard scenes / frame images to generate.
export const SCENE_COUNT = 4
