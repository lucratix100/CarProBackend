/**
 * Catalogue des opérations sensibles (Phase 3).
 * L’admin d’agence configure pour chacune : free | notify | require_approval.
 */

export type SensitiveActionMode = 'free' | 'notify' | 'require_approval'

export type SensitiveActionDef = {
  code: string
  module: string
  label: string
  description: string
  defaultMode: SensitiveActionMode
}

export const SENSITIVE_ACTIONS: SensitiveActionDef[] = [
  {
    code: 'rentals.update_price',
    module: 'rentals',
    label: 'Modifier le tarif d’une location',
    description: 'Changement du prix journalier d’une location existante.',
    defaultMode: 'require_approval',
  },
  {
    code: 'rentals.cancel',
    module: 'rentals',
    label: 'Annuler une location',
    description: 'Annulation d’une location en cours ou réservée.',
    defaultMode: 'require_approval',
  },
  {
    code: 'payments.cancel',
    module: 'payments',
    label: 'Annuler un paiement',
    description: 'Suppression / annulation d’un paiement déjà enregistré.',
    defaultMode: 'require_approval',
  },
  {
    code: 'clients.delete',
    module: 'clients',
    label: 'Supprimer un client',
    description: 'Suppression définitive d’une fiche client.',
    defaultMode: 'require_approval',
  },
  {
    code: 'vehicles.change_owner',
    module: 'vehicles',
    label: 'Changer le propriétaire d’un véhicule',
    description: 'Rattachement du véhicule à un autre propriétaire (ou à l’agence).',
    defaultMode: 'require_approval',
  },
  {
    code: 'vehicles.delete',
    module: 'vehicles',
    label: 'Supprimer un véhicule',
    description: 'Suppression d’un véhicule de la flotte.',
    defaultMode: 'notify',
  },
]

export const SENSITIVE_ACTION_CODES = SENSITIVE_ACTIONS.map((a) => a.code)

export function isSensitiveAction(code: string) {
  return SENSITIVE_ACTION_CODES.includes(code)
}
