export const MARKETPLACE_PUBLICATION_STATUSES = [
  'draft',
  'pending_review',
  'published',
  'rejected',
] as const

export type MarketplacePublicationStatus = (typeof MARKETPLACE_PUBLICATION_STATUSES)[number]

export const MARKETPLACE_PUBLICATION_LABELS: Record<MarketplacePublicationStatus, string> = {
  draft: 'Brouillon',
  pending_review: 'En revue',
  published: 'Publié',
  rejected: 'Refusé',
}

export const MARKETPLACE_REJECTION_REASONS = [
  'Photos insuffisantes ou de mauvaise qualité',
  'Informations véhicule incomplètes ou incorrectes',
  'Prix incohérent',
  'Type / description non conformes',
  'Documents / conformité à vérifier',
  'Autre',
] as const

export const MARKETPLACE_PUBLICATION_EVENT_ACTIONS = [
  'submitted',
  'approved',
  'rejected',
  'unpublished',
  'rereview_requested',
  'agency_unpublished',
] as const

export type MarketplacePublicationEventAction =
  (typeof MARKETPLACE_PUBLICATION_EVENT_ACTIONS)[number]

export const MARKETPLACE_PUBLICATION_EVENT_LABELS: Record<
  MarketplacePublicationEventAction,
  string
> = {
  submitted: 'Soumise',
  approved: 'Approuvée',
  rejected: 'Refusée',
  unpublished: 'Retirée (carPro)',
  rereview_requested: 'Re-revue demandée',
  agency_unpublished: 'Retirée (agence)',
}

/** Nombre de refus consécutifs avant frein temporaire. */
export const MARKETPLACE_PUBLICATION_REJECTION_STREAK_LIMIT = 3

/** Durée du frein temporaire (jours). */
export const MARKETPLACE_PUBLICATION_BAN_DAYS = 7
