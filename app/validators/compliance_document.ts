import vine from '@vinejs/vine'
import { COMPLIANCE_KINDS } from '#services/compliance_document_service'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const charges = ['owner', 'agency'] as const

export const createComplianceDocumentValidator = vine.create({
  vehicleId: vine.number().positive(),
  kind: vine.enum(COMPLIANCE_KINDS),
  provider: vine.string().trim().minLength(2).maxLength(160),
  reference: vine.string().trim().maxLength(80).optional(),
  startsOn: isoDate().optional(),
  expiresOn: isoDate(),
  cost: vine.number().min(0),
  chargedTo: vine.enum(charges).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})

export const updateComplianceDocumentValidator = vine.create({
  vehicleId: vine.number().positive().optional(),
  kind: vine.enum(COMPLIANCE_KINDS).optional(),
  provider: vine.string().trim().minLength(2).maxLength(160).optional(),
  reference: vine.string().trim().maxLength(80).nullable().optional(),
  startsOn: isoDate().nullable().optional(),
  expiresOn: isoDate().optional(),
  cost: vine.number().min(0).optional(),
  chargedTo: vine.enum(charges).optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
})
