import env from '#start/env'

/**
 * Versioned mandate terms accepted by vehicle owners before activating
 * their read-only portal account.
 */
export const CURRENT_TERMS_VERSION = env.get('TERMS_VERSION') ?? 'v1'

export const MANDATE_TERMS = {
  version: CURRENT_TERMS_VERSION,
  title: 'Mandat de gestion et de location de véhicule — Profil Car Service',
  companyName: 'Profil Car Service',
  body: `En acceptant les présentes clauses, vous confiez à Profil Car Service (PCS) la gestion et la location de votre/vos véhicule(s).

1. Objet du mandat
PCS assure pour votre compte la mise en location, la gestion opérationnelle, le suivi des entretiens et la facturation des clients locataires.

2. Rôle du propriétaire
Vous disposez d'un accès en lecture seule à l'interface pour consulter :
- les informations relatives à vos véhicules ;
- l'historique des locations les concernant ;
- vos revenus nets (après commission PCS).

Vous ne gérez pas les clients, réservations, factures ni entretiens : ces opérations sont réservées à PCS.

3. Commission
PCS perçoit une commission sur chaque jour de location, selon le barème en vigueur communiqué par PCS. Le montant net qui vous revient correspond au loyer client diminué de cette commission (et, le cas échéant, des frais convenus).

4. Entretien et documents
PCS peut organiser entretien, visite technique et suivi d'assurance. Les modalités de prise en charge des coûts sont définies d'un commun accord.

5. Versements
Les revenus nets vous sont versés selon la périodicité convenue avec PCS. Un relevé peut être mis à disposition dans l'interface.

6. Durée et résiliation
Le mandat prend effet à l'acceptation des présentes clauses et peut être résilié selon les conditions convenues avec PCS, sous réserve des locations déjà engagées.

7. Données personnelles
Vos données (identité, contact) sont utilisées uniquement pour la gestion du mandat et l'accès à l'espace propriétaire.

En cochant la case d'acceptation et en créant votre mot de passe, vous reconnaissez avoir lu et accepté l'intégralité de ces clauses.`,
} as const
