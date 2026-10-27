import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

/**
 * Catalogue visible pour une agence : entrées partagées (agency_id null)
 * et entrées créées par cette agence.
 */
export function whereVisibleCatalog<T extends LucidModel>(
  query: ModelQueryBuilderContract<T>,
  agencyId: number
) {
  return query.where((builder) => {
    builder.whereNull('agencyId').orWhere('agencyId', agencyId)
  })
}
