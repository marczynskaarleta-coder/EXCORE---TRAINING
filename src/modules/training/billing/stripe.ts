import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY not set')
    stripeInstance = new Stripe(key)
  }
  return stripeInstance
}

/**
 * Map billing_interval to Stripe recurring interval.
 */
export function toStripeInterval(interval: string): Stripe.Price.Recurring.Interval {
  const map: Record<string, Stripe.Price.Recurring.Interval> = {
    monthly: 'month',
    quarterly: 'month', // 3 months - handle via interval_count
    yearly: 'year',
  }
  return map[interval] || 'month'
}

export function toStripeIntervalCount(interval: string): number {
  return interval === 'quarterly' ? 3 : 1
}
