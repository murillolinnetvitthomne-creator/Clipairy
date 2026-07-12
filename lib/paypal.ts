import 'server-only'

/**
 * Minimal PayPal REST client (Orders v2 + Subscriptions v1 + Webhook verify).
 *
 * All entitlement decisions rely on server-side capture results and verified
 * webhooks — never on anything the browser reports. Credentials live in env:
 *   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID
 *   PAYPAL_ENV ('sandbox' | 'live'), PAYPAL_PLAN_GROWTH, PAYPAL_PLAN_TEAM
 */

const PAYPAL_ENV = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox'

export const PAYPAL_API_BASE =
  PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

function requireCreds() {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !secret) {
    throw new Error('PayPal credentials are not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)')
  }
  return { clientId, secret }
}

/** Fetches an OAuth2 access token via client-credentials grant. */
async function getAccessToken(): Promise<string> {
  const { clientId, secret } = requireCreds()
  const basic = Buffer.from(`${clientId}:${secret}`).toString('base64')

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal auth failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

type PayPalFetchOptions = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

/** Authenticated JSON request against the PayPal REST API. */
export async function paypalFetch<T = unknown>(
  path: string,
  { method = 'GET', body, headers = {} }: PayPalFetchOptions = {},
): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) {
    throw new Error(`PayPal ${method} ${path} failed: ${res.status} ${text}`)
  }
  return json as T
}

// --- Orders v2 (one-time payments) -----------------------------------------

export type PayPalOrder = {
  id: string
  status: string
  purchase_units?: Array<{ custom_id?: string; amount?: { value: string; currency_code: string } }>
}

/** Creates a one-time order for the given USD amount. */
export async function createOrder(params: {
  amountInCents: number
  currency: string
  customId: string
  description: string
}): Promise<PayPalOrder> {
  const value = (params.amountInCents / 100).toFixed(2)
  return paypalFetch<PayPalOrder>('/v2/checkout/orders', {
    method: 'POST',
    body: {
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: params.customId,
          description: params.description,
          amount: { currency_code: params.currency.toUpperCase(), value },
        },
      ],
    },
  })
}

/** Captures an approved order. Idempotent on PayPal's side per order id. */
export async function captureOrder(orderId: string): Promise<PayPalOrder> {
  return paypalFetch<PayPalOrder>(`/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
  })
}

export async function getOrder(orderId: string): Promise<PayPalOrder> {
  return paypalFetch<PayPalOrder>(`/v2/checkout/orders/${orderId}`)
}

// --- Subscriptions v1 (recurring) ------------------------------------------

export type PayPalSubscription = {
  id: string
  status: string
  custom_id?: string
  plan_id?: string
}

export async function getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
  return paypalFetch<PayPalSubscription>(`/v1/billing/subscriptions/${subscriptionId}`)
}

/** Cancels an active subscription. reason is shown in PayPal records. */
export async function cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
  await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    body: { reason },
  })
}

// --- Webhook signature verification ----------------------------------------

/**
 * Verifies a webhook event signature with PayPal's verify-webhook-signature
 * endpoint. Returns true only when PayPal responds SUCCESS.
 */
export async function verifyWebhookSignature(params: {
  headers: Headers
  rawBody: string
}): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) throw new Error('PAYPAL_WEBHOOK_ID is not configured')

  const transmissionId = params.headers.get('paypal-transmission-id')
  const transmissionTime = params.headers.get('paypal-transmission-time')
  const certUrl = params.headers.get('paypal-cert-url')
  const authAlgo = params.headers.get('paypal-auth-algo')
  const transmissionSig = params.headers.get('paypal-transmission-sig')

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false
  }

  const res = await paypalFetch<{ verification_status: string }>(
    '/v1/notifications/verify-webhook-signature',
    {
      method: 'POST',
      body: {
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        // webhook_event must be the parsed JSON of the raw body.
        webhook_event: JSON.parse(params.rawBody),
      },
    },
  )

  return res.verification_status === 'SUCCESS'
}

/** Maps a plan id to its configured PayPal subscription plan id. */
export function getPaypalPlanId(planId: 'growth' | 'team'): string {
  const map: Record<string, string | undefined> = {
    growth: process.env.PAYPAL_PLAN_GROWTH,
    team: process.env.PAYPAL_PLAN_TEAM,
  }
  const value = map[planId]
  if (!value) throw new Error(`PayPal subscription plan id for "${planId}" is not configured`)
  return value
}

export function isPaypalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
}
