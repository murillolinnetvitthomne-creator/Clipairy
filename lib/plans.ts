export type PlanId = 'payg' | 'growth' | 'team'

export type Plan = {
  id: PlanId
  name: string
  price: string
  period: string
  description: string
  credits: number
  unlimited: boolean
  features: string[]
  highlight?: boolean
  cta: string
}

// Credit values represent how many video generations a plan grants.
export const PLANS: Plan[] = [
  {
    id: 'payg',
    name: '按次付费',
    price: '¥9',
    period: '/ 次',
    description: '偶尔使用，按需购买生成次数。',
    credits: 10,
    unlimited: false,
    cta: '购买 10 次',
    features: [
      '一次性 10 次视频生成',
      '全部 12 步智能工作流',
      '1080P 高清导出',
      '次数永久有效',
    ],
  },
  {
    id: 'growth',
    name: '增长版',
    price: '¥199',
    period: '/ 月',
    description: '中小卖家的高性价比之选。',
    credits: 120,
    unlimited: false,
    highlight: true,
    cta: '订阅增长版',
    features: [
      '每月 120 次视频生成',
      '全部 12 步智能工作流',
      '4K 超清导出 + 去水印',
      '多平台一键适配',
      '优先生成队列',
    ],
  },
  {
    id: 'team',
    name: '团队版',
    price: '¥899',
    period: '/ 月',
    description: '团队协作，海量产出。',
    credits: 0,
    unlimited: true,
    cta: '订阅团队版',
    features: [
      '不限次数视频生成',
      '5 个团队席位',
      '品牌素材库与模板',
      '专属客户成功经理',
      'API 接入支持',
    ],
  },
]

export function getPlan(id: string | null | undefined): Plan | undefined {
  if (!id) return undefined
  return PLANS.find((p) => p.id === id)
}
