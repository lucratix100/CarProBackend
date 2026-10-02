/**
 * Catalogue des permissions agence (Phase 1).
 * Les codes sont stables — ne pas renommer sans migration de données.
 */

export type PermissionModule =
  | 'clients'
  | 'rentals'
  | 'vehicles'
  | 'payments'
  | 'invoices'
  | 'reports'
  | 'staff'
  | 'settings'
  | 'owners'
  | 'maintenances'

export type PermissionDef = {
  code: string
  module: PermissionModule
  label: string
}

export const PERMISSION_CATALOG: PermissionDef[] = [
  // Clients
  { code: 'clients.view', module: 'clients', label: 'Voir les clients' },
  { code: 'clients.create', module: 'clients', label: 'Ajouter un client' },
  { code: 'clients.update', module: 'clients', label: 'Modifier un client' },
  { code: 'clients.delete', module: 'clients', label: 'Supprimer un client' },
  { code: 'clients.view_documents', module: 'clients', label: 'Voir les documents du client' },
  {
    code: 'clients.manage_identity',
    module: 'clients',
    label: 'Ajouter ou remplacer une pièce d’identité',
  },
  {
    code: 'clients.update_personal',
    module: 'clients',
    label: 'Modifier les informations personnelles',
  },

  // Locations
  { code: 'rentals.view', module: 'rentals', label: 'Voir les locations' },
  { code: 'rentals.create', module: 'rentals', label: 'Créer une location' },
  { code: 'rentals.update', module: 'rentals', label: 'Modifier une location' },
  { code: 'rentals.cancel', module: 'rentals', label: 'Annuler une location' },
  { code: 'rentals.update_dates', module: 'rentals', label: 'Modifier les dates' },
  { code: 'rentals.update_vehicle', module: 'rentals', label: 'Modifier le véhicule' },
  { code: 'rentals.update_price', module: 'rentals', label: 'Modifier le tarif' },
  { code: 'rentals.update_deposit', module: 'rentals', label: 'Modifier la caution' },
  { code: 'rentals.record_payment', module: 'rentals', label: 'Enregistrer un paiement' },
  { code: 'rentals.update_payment', module: 'rentals', label: 'Modifier un paiement' },
  { code: 'rentals.view_history', module: 'rentals', label: 'Voir l’historique d’une location' },

  // Véhicules
  { code: 'vehicles.view', module: 'vehicles', label: 'Voir les véhicules' },
  { code: 'vehicles.create', module: 'vehicles', label: 'Ajouter un véhicule' },
  { code: 'vehicles.update', module: 'vehicles', label: 'Modifier un véhicule' },
  {
    code: 'vehicles.update_availability',
    module: 'vehicles',
    label: 'Modifier sa disponibilité',
  },
  {
    code: 'vehicles.set_available',
    module: 'vehicles',
    label: 'Mettre un véhicule disponible',
  },
  {
    code: 'vehicles.set_unavailable',
    module: 'vehicles',
    label: 'Mettre un véhicule indisponible',
  },
  { code: 'vehicles.manage_documents', module: 'vehicles', label: 'Ajouter des documents' },
  {
    code: 'vehicles.update_info',
    module: 'vehicles',
    label: 'Modifier les informations du véhicule',
  },
  { code: 'vehicles.delete', module: 'vehicles', label: 'Supprimer un véhicule' },

  // Maintenances
  { code: 'maintenances.view', module: 'maintenances', label: 'Voir les maintenances' },
  { code: 'maintenances.create', module: 'maintenances', label: 'Enregistrer une maintenance' },
  { code: 'maintenances.update', module: 'maintenances', label: 'Modifier une maintenance' },
  { code: 'maintenances.delete', module: 'maintenances', label: 'Supprimer une maintenance' },

  // Paiements
  { code: 'payments.view', module: 'payments', label: 'Voir les paiements' },
  { code: 'payments.create', module: 'payments', label: 'Ajouter un paiement' },
  { code: 'payments.update', module: 'payments', label: 'Modifier un paiement' },
  { code: 'payments.cancel', module: 'payments', label: 'Annuler un paiement' },
  { code: 'payments.refund', module: 'payments', label: 'Enregistrer un remboursement' },
  { code: 'payments.update_refund', module: 'payments', label: 'Modifier un remboursement' },

  // Factures
  { code: 'invoices.view', module: 'invoices', label: 'Voir les factures' },
  { code: 'invoices.create', module: 'invoices', label: 'Créer une facture' },
  { code: 'invoices.update', module: 'invoices', label: 'Modifier une facture' },
  { code: 'invoices.cancel', module: 'invoices', label: 'Annuler une facture' },
  { code: 'invoices.download', module: 'invoices', label: 'Télécharger une facture' },

  // Rapports
  { code: 'reports.view', module: 'reports', label: 'Consulter les rapports' },
  { code: 'reports.revenues', module: 'reports', label: 'Consulter les revenus' },
  { code: 'reports.expenses', module: 'reports', label: 'Consulter les dépenses' },
  {
    code: 'reports.vehicle_performance',
    module: 'reports',
    label: 'Consulter les performances des véhicules',
  },
  {
    code: 'reports.staff_performance',
    module: 'reports',
    label: 'Consulter les performances des collaborateurs',
  },
  { code: 'reports.export', module: 'reports', label: 'Exporter les données' },

  // Propriétaires
  { code: 'owners.view', module: 'owners', label: 'Voir les propriétaires' },
  { code: 'owners.manage', module: 'owners', label: 'Gérer les propriétaires' },

  // Paramètres agence
  { code: 'settings.view', module: 'settings', label: 'Voir les paramètres' },
  { code: 'settings.update', module: 'settings', label: 'Modifier les paramètres' },

  // Collaborateurs (réservé admin en pratique)
  { code: 'staff.view', module: 'staff', label: 'Voir les collaborateurs' },
  { code: 'staff.manage', module: 'staff', label: 'Gérer les collaborateurs et permissions' },
]

export const ALL_PERMISSION_CODES = PERMISSION_CATALOG.map((p) => p.code)

export type StaffRoleSlug =
  | 'operations_manager'
  | 'agent'
  | 'accountant'
  | 'readonly'

export type StaffRoleTemplate = {
  slug: StaffRoleSlug
  name: string
  description: string
  permissions: string[]
}

const allView = PERMISSION_CATALOG.filter((p) => p.code.endsWith('.view')).map((p) => p.code)

const operationsManagerPerms = ALL_PERMISSION_CODES.filter(
  (c) => !c.startsWith('staff.') && c !== 'settings.update'
)

const agentPerms = [
  'clients.view',
  'clients.create',
  'clients.update',
  'clients.view_documents',
  'clients.manage_identity',
  'clients.update_personal',
  'rentals.view',
  'rentals.create',
  'rentals.update',
  'rentals.update_dates',
  'rentals.record_payment',
  'rentals.view_history',
  'vehicles.view',
  'maintenances.view',
  'maintenances.create',
  'payments.view',
  'payments.create',
  'invoices.view',
  'owners.view',
]

const accountantPerms = [
  'clients.view',
  'rentals.view',
  'rentals.view_history',
  'vehicles.view',
  'payments.view',
  'payments.create',
  'payments.update',
  'payments.cancel',
  'payments.refund',
  'payments.update_refund',
  'invoices.view',
  'invoices.create',
  'invoices.update',
  'invoices.cancel',
  'invoices.download',
  'reports.view',
  'reports.revenues',
  'reports.expenses',
  'reports.export',
  'owners.view',
]

export const STAFF_ROLE_TEMPLATES: StaffRoleTemplate[] = [
  {
    slug: 'operations_manager',
    name: 'Responsable d’exploitation',
    description: 'Gestion quotidienne de la flotte, clients, locations et opérations autorisées.',
    permissions: operationsManagerPerms,
  },
  {
    slug: 'agent',
    name: 'Agent',
    description: 'Enregistrement des clients, locations et opérations autorisées.',
    permissions: agentPerms,
  },
  {
    slug: 'accountant',
    name: 'Comptable',
    description: 'Gestion des paiements, factures et informations financières autorisées.',
    permissions: accountantPerms,
  },
  {
    slug: 'readonly',
    name: 'Lecture seule',
    description: 'Peut consulter les informations mais ne peut pas les modifier.',
    permissions: [...new Set([...allView, 'invoices.download', 'reports.revenues', 'reports.expenses'])],
  },
]

export function isKnownPermission(code: string) {
  return ALL_PERMISSION_CODES.includes(code)
}
