export type PlanId = 'payg' | 'growth' | 'team'

export type Plan = {
  id: PlanId
  name: string
  price: string
  priceInCents: number
  currency: 'usd'
  billing: 'payment' | 'subscription'
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
    name: 'Pay as you go',
    price: '$5',
    priceInCents: 500,
    currency: 'usd',
    billing: 'payment',
    period: '/ generation',
    description: 'One generation credit with no recurring charge.',
    credits: 1,
    unlimited: false,
    cta: 'Buy 1 generation',
    features: [
      '1 video generation credit',
      'Complete 12-step AI workflow',
      '1080P export',
      'Credit never expires',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$29',
    priceInCents: 2900,
    currency: 'usd',
    billing: 'subscription',
    period: '/ month',
    description: 'For sellers who create consistently.',
    credits: 120,
    unlimited: false,
    highlight: true,
    cta: 'Subscribe to Growth',
    features: [
      '120 video generations each month',
      'Complete 12-step AI workflow',
      '4K export without watermark',
      'Multi-platform formatting',
      'Priority generation queue',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$199',
    priceInCents: 19900,
    currency: 'usd',
    billing: 'subscription',
    period: '/ month',
    description: 'Unlimited generation for high-volume teams.',
    credits: 0,
    unlimited: true,
    cta: 'Subscribe to Team',
    features: [
      'Unlimited video generations',
      '5 team seats',
      'Brand asset library and templates',
      'Dedicated customer success',
      'API access support',
    ],
  },
]

export function getPlan(id: string | null | undefined): Plan | undefined {
  if (!id) return undefined
  return PLANS.find((p) => p.id === id)
}
