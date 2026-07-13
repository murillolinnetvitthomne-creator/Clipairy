export type PlanId = 'single-8' | 'single-16' | 'single-24' | 'single-30' | 'professional'
export type LegacyPlanId = 'payg' | 'growth' | 'team'

export type Plan = {
  id: PlanId | LegacyPlanId
  name: string
  price: string
  period: string
  description: string
  credits: number
  unlimited: boolean
  features: string[]
  highlight?: boolean
  cta: string
  amountInCents: number
  currency: 'usd'
  mode: 'payment' | 'subscription'
  duration?: 8 | 16 | 24 | 30
  hidden?: boolean
}

/** One credit always represents one 8-second AI video segment. */
export const PLANS: Array<Plan & { id: PlanId }> = [
  {
    id: 'single-8',
    name: '8 秒视频',
    price: '$4.99',
    period: '/ 条',
    description: '适合快速测试创意和短促销片段。',
    credits: 1,
    unlimited: false,
    amountInCents: 499,
    currency: 'usd',
    mode: 'payment',
    duration: 8,
    cta: '购买 8 秒',
    features: ['1 个 8 秒额度', '完整原创广告工作流', '额度永久有效'],
  },
  {
    id: 'single-16',
    name: '16 秒视频',
    price: '$9.99',
    period: '/ 条',
    description: '适合完整卖点演示和社交广告。',
    credits: 2,
    unlimited: false,
    amountInCents: 999,
    currency: 'usd',
    mode: 'payment',
    duration: 16,
    cta: '购买 16 秒',
    features: ['2 个 8 秒额度', '完整原创广告工作流', '额度永久有效'],
  },
  {
    id: 'single-24',
    name: '24 秒视频',
    price: '$14.99',
    period: '/ 条',
    description: '适合多场景产品故事和转化广告。',
    credits: 3,
    unlimited: false,
    amountInCents: 1499,
    currency: 'usd',
    mode: 'payment',
    duration: 24,
    cta: '购买 24 秒',
    features: ['3 个 8 秒额度', '完整原创广告工作流', '额度永久有效'],
  },
  {
    id: 'single-30',
    name: '30 秒视频',
    price: '$18.99',
    period: '/ 条',
    description: '适合完整品牌叙事和深度产品介绍。',
    credits: 4,
    unlimited: false,
    amountInCents: 1899,
    currency: 'usd',
    mode: 'payment',
    duration: 30,
    cta: '购买 30 秒',
    features: ['4 个 8 秒额度', '完整原创广告工作流', '额度永久有效'],
  },
  {
    id: 'professional',
    name: '专业月套餐',
    price: '$299',
    period: '/ 月',
    description: '每月 120 个 8 秒额度，适合持续投放。',
    credits: 120,
    unlimited: false,
    amountInCents: 29900,
    currency: 'usd',
    mode: 'subscription',
    highlight: true,
    cta: '订阅专业版',
    features: ['每月 120 个 8 秒额度', '可生成 60 条 16 秒视频', '可生成 40 条 24 秒视频', '可生成 30 条 30 秒视频', '优先生成队列'],
  },
]

// Kept only so already-created Stripe subscriptions can complete their
// lifecycle safely. These products are never shown or sold to new customers.
const LEGACY_PLANS: Plan[] = [
  { id: 'payg', name: '按次付费', price: '$9.90', period: '/ 次', description: '', credits: 1, unlimited: false, features: [], cta: '', amountInCents: 990, currency: 'usd', mode: 'payment', hidden: true },
  { id: 'growth', name: '增长版', price: '$199', period: '/ 月', description: '', credits: 120, unlimited: false, features: [], cta: '', amountInCents: 19900, currency: 'usd', mode: 'subscription', hidden: true },
  { id: 'team', name: '团队版', price: '$399', period: '/ 月', description: '', credits: 500, unlimited: false, features: [], cta: '', amountInCents: 39900, currency: 'usd', mode: 'subscription', hidden: true },
]

export function getPlan(id: string | null | undefined): Plan | undefined {
  if (!id) return undefined
  return [...PLANS, ...LEGACY_PLANS].find((plan) => plan.id === id)
}
