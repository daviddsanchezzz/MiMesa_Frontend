// Keep in sync with core/lib/planCapabilities.PAYMENT_GRACE_DAYS
export const PAYMENT_GRACE_DAYS = 14;

/** Until when a business with a failed charge keeps its plan (null if none). */
export function paymentGraceUntil(business) {
  if (business?.subscriptionStatus !== 'past_due' || !business?.paymentFailedAt) return null;
  const until = new Date(new Date(business.paymentFailedAt).getTime() + PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000);
  return until > new Date() ? until : null;
}
