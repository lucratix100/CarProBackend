import logger from '@adonisjs/core/services/logger'
import ActivityLog, { type ActivityResult } from '#models/activity_log'
import type User from '#models/user'

export type AuditLogInput = {
  actor?: User | null
  agencyId?: number | null
  action: string
  module: string
  entityType?: string | null
  entityId?: number | null
  clientId?: number | null
  rentalId?: number | null
  vehicleId?: number | null
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  summary?: string | null
  result?: ActivityResult
  validatedBy?: User | null
  ip?: string | null
}

/**
 * Journal d’audit append-only.
 * Ne jamais exposer d’update/delete sur ActivityLog.
 */
export default class AuditService {
  async log(input: AuditLogInput) {
    try {
      const actor = input.actor ?? null
      const validator = input.validatedBy ?? null

      return await ActivityLog.create({
        agencyId: input.agencyId ?? actor?.agencyId ?? null,
        actorUserId: actor?.id ?? null,
        actorName: actor?.fullName ?? null,
        actorEmail: actor?.email ?? null,
        action: input.action,
        module: input.module,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        clientId: input.clientId ?? null,
        rentalId: input.rentalId ?? null,
        vehicleId: input.vehicleId ?? null,
        oldValues: input.oldValues ?? null,
        newValues: input.newValues ?? null,
        summary: input.summary ?? null,
        result: input.result ?? 'success',
        validatedByUserId: validator?.id ?? null,
        validatedByName: validator?.fullName ?? null,
        ip: input.ip ?? null,
      })
    } catch (error) {
      // Ne jamais faire échouer l’opération métier
      logger.error({ err: error, action: input.action }, '[audit] Échec écriture journal')
      return null
    }
  }
}

/** Compare deux snapshots et ne garde que les clés modifiées. */
export function diffValues(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { oldValues: Record<string, unknown>; newValues: Record<string, unknown> } | null {
  const oldValues: Record<string, unknown> = {}
  const newValues: Record<string, unknown> = {}
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of keys) {
    const a = normalizeAuditValue(before[key])
    const b = normalizeAuditValue(after[key])
    if (a === b) continue
    oldValues[key] = before[key] ?? null
    newValues[key] = after[key] ?? null
  }

  if (Object.keys(newValues).length === 0) return null
  return { oldValues, newValues }
}

function normalizeAuditValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object' && value !== null && 'toISO' in value) {
    try {
      return String((value as { toISO: () => string | null }).toISO() ?? '')
    } catch {
      return String(value)
    }
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function pickAuditFields(
  source: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of keys) {
    const raw = source[key]
    if (raw !== null && typeof raw === 'object' && 'toISODate' in (raw as object)) {
      out[key] = (raw as unknown as { toISODate: () => string | null }).toISODate()
    } else if (raw !== null && typeof raw === 'object' && 'toISO' in (raw as object)) {
      out[key] = (raw as unknown as { toISO: () => string | null }).toISO()
    } else {
      out[key] = raw ?? null
    }
  }
  return out
}
