export const MARKETPLACE_BOOST_STATUSES = [
  'none',
  'pending_review',
  'approved',
  'rejected',
] as const

export type MarketplaceBoostStatus = (typeof MARKETPLACE_BOOST_STATUSES)[number]

/** Tri catalogue : boost approuvé et dans sa fenêtre de dates en premier. Les deux `?` sont la date du jour. */
export const BOOST_LIVE_ORDER_SQL = `
  CASE
    WHEN boost_status = 'approved'
      AND (boost_starts_at IS NULL OR boost_starts_at <= ?)
      AND (boost_ends_at IS NULL OR boost_ends_at >= ?)
    THEN 0
    ELSE 1
  END
`
