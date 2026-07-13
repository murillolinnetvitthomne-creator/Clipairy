export const QUALITY_TIERS = {
  economy: {
    id: 'economy',
    name: '经济',
    model: 'bytedance/seedance-v1.0-pro-fast',
    resolution: '854x480',
    resolutionLabel: '480p',
    creditMultiplier: 1,
    estimatedCostPerSegment: 0.08,
    description: '快速低成本，适合批量测试创意',
  },
  standard: {
    id: 'standard',
    name: '标准',
    model: 'bytedance/seedance-v1.0-pro-fast',
    resolution: '1280x720',
    resolutionLabel: '720p',
    creditMultiplier: 1,
    estimatedCostPerSegment: 0.16,
    description: '清晰度与成本平衡，适合日常发布',
  },
  premium: {
    id: 'premium',
    name: '高级',
    model: 'google/veo-3.1-fast-generate-001',
    resolution: '1280x720',
    resolutionLabel: '720p',
    creditMultiplier: 2,
    estimatedCostPerSegment: 0.8,
    description: '更强运动与画面表现，适合重点广告',
  },
} as const

export type QualityTier = keyof typeof QUALITY_TIERS
export const QUALITY_TIER_IDS = Object.keys(QUALITY_TIERS) as QualityTier[]

export function getQualityTier(value: string) {
  return QUALITY_TIERS[value as QualityTier]
}

export function getCreditsRequired(duration: number, quality: QualityTier) {
  return Math.ceil(duration / 8) * QUALITY_TIERS[quality].creditMultiplier
}

export const CHARACTER_PRESETS = [
  { id: 'ava', name: 'Ava', style: '活力生活', image: '/characters/ava.png', description: 'late-20s East Asian woman, shoulder-length straight black hair, cream blouse, warm confident expression' },
  { id: 'maya', name: 'Maya', style: '亲和潮流', image: '/characters/maya.png', description: 'early-30s Black woman, natural shoulder-length curls, rust casual jacket, friendly energetic expression' },
  { id: 'sofia', name: 'Sofia', style: '商务专业', image: '/characters/sofia.png', description: 'late-30s Latina woman, long dark brown waved hair, charcoal blazer, poised professional expression' },
  { id: 'elena', name: 'Elena', style: '成熟优雅', image: '/characters/elena.png', description: 'mid-50s European woman, short silver-blonde hair, olive knit top, reassuring sophisticated expression' },
  { id: 'leo', name: 'Leo', style: '年轻科技', image: '/characters/leo.png', description: 'late-20s East Asian man, neat short black hair, navy overshirt, upbeat approachable expression' },
  { id: 'marcus', name: 'Marcus', style: '休闲自信', image: '/characters/marcus.png', description: 'mid-30s Black man, close-cropped hair and trimmed beard, camel jacket, confident friendly expression' },
  { id: 'daniel', name: 'Daniel', style: '高管商务', image: '/characters/daniel.png', description: 'early-40s Middle Eastern man, short dark hair with slight gray, charcoal blazer, composed executive expression' },
  { id: 'james', name: 'James', style: '可靠成熟', image: '/characters/james.png', description: 'late-50s white man, short salt-and-pepper hair, muted blue shirt, warm trustworthy expression' },
] as const

export type CharacterPresetId = (typeof CHARACTER_PRESETS)[number]['id']

export function getCharacterPreset(value: string | null | undefined) {
  return CHARACTER_PRESETS.find((preset) => preset.id === value)
}
