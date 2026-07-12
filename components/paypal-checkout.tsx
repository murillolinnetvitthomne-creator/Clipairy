'use client'

import { useEffect } from 'react'
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer,
  DISPATCH_ACTION,
} from '@paypal/react-paypal-js'
import { X, Loader2 } from 'lucide-react'
import type { Plan } from '@/lib/plans'
import {
  createPaypalOrder,
  capturePaypalOrder,
  activatePaypalSubscription,
} from '@/app/actions/paypal'
import { useI18n } from '@/components/i18n-provider'

export type PaypalConfig = {
  clientId: string
  growthPlanId: string | null
  teamPlanId: string | null
}

/**
 * Modal overlay that renders PayPal's official buttons for a single selected
 * plan. The PayPal SDK only supports one intent per script load, so the script
 * options are reset whenever the selected plan's mode changes.
 */
export function PaypalCheckout({
  plan,
  userId,
  config,
  onClose,
  onSuccess,
}: {
  plan: Plan
  userId: string
  config: PaypalConfig
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useI18n()

  const isSubscription = plan.mode === 'subscription'
  const paypalPlanId = plan.id === 'growth' ? config.growthPlanId : config.teamPlanId
  const notConfigured = isSubscription && !paypalPlanId

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.account.payWith}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t.account.close}
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <h3 className="font-display text-lg font-bold">{plan.name}</h3>
        <div className="mt-1 flex items-end gap-1">
          <span className="font-display text-2xl font-bold">{plan.price}</span>
          <span className="mb-1 text-sm text-muted-foreground">
            {plan.id === 'payg' ? t.account.perUse : t.account.perMonth}
          </span>
        </div>
        <p className="mt-3 mb-5 text-sm text-muted-foreground text-pretty">
          {t.account.payWith}
        </p>

        {notConfigured ? (
          <p className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            {t.account.paypalNotReady}
          </p>
        ) : (
          <PayPalScriptProvider
            options={{
              clientId: config.clientId,
              currency: 'USD',
              intent: isSubscription ? 'subscription' : 'capture',
              ...(isSubscription ? { vault: true } : {}),
              components: 'buttons',
            }}
          >
            <PaypalButtonsInner
              plan={plan}
              userId={userId}
              paypalPlanId={paypalPlanId ?? undefined}
              onSuccess={onSuccess}
            />
          </PayPalScriptProvider>
        )}
      </div>
    </div>
  )
}

function PaypalButtonsInner({
  plan,
  userId,
  paypalPlanId,
  onSuccess,
}: {
  plan: Plan
  userId: string
  paypalPlanId?: string
  onSuccess: () => void
}) {
  const [{ isPending }, dispatch] = usePayPalScriptReducer()
  const isSubscription = plan.mode === 'subscription'

  // Keep the loaded SDK aligned with the selected plan's intent.
  useEffect(() => {
    dispatch({
      type: DISPATCH_ACTION.RESET_OPTIONS,
      value: {
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID as string,
        currency: 'USD',
        intent: isSubscription ? 'subscription' : 'capture',
        ...(isSubscription ? { vault: true } : {}),
        components: 'buttons',
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscription])

  return (
    <div className="min-h-[3rem]">
      {isPending && (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        </div>
      )}

      {isSubscription ? (
        <PayPalButtons
          key="subscription"
          style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'subscribe' }}
          createSubscription={(_data, actions) =>
            actions.subscription.create({
              plan_id: paypalPlanId as string,
              custom_id: userId,
            })
          }
          onApprove={async (data) => {
            if (data.subscriptionID) {
              await activatePaypalSubscription(data.subscriptionID)
            }
            onSuccess()
          }}
        />
      ) : (
        <PayPalButtons
          key="one-time"
          style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
          createOrder={async () => {
            const { orderId } = await createPaypalOrder(plan.id)
            return orderId
          }}
          onApprove={async (data) => {
            await capturePaypalOrder(data.orderID)
            onSuccess()
          }}
        />
      )}
    </div>
  )
}
