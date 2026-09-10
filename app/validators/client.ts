import vine from '@vinejs/vine'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const createClientValidator = vine.create({
  fullName: vine.string().trim().minLength(2).maxLength(160),
  phone: vine.string().trim().minLength(5).maxLength(40),
  email: vine.string().email().maxLength(254).optional(),
  licenseNumber: vine.string().trim().minLength(2).maxLength(80),
  licenseExpiresAt: isoDate(),
  idCardNumber: vine.string().trim().minLength(2).maxLength(80),
  city: vine.string().trim().maxLength(120).optional(),
  birthDate: isoDate().optional(),
  type: vine.enum(['particulier', 'entreprise'] as const),
  notes: vine.string().trim().maxLength(2000).optional(),
  isActive: vine.boolean().optional(),
})

export const updateClientValidator = vine.create({
  fullName: vine.string().trim().minLength(2).maxLength(160).optional(),
  phone: vine.string().trim().minLength(5).maxLength(40).optional(),
  email: vine.string().email().maxLength(254).nullable().optional(),
  licenseNumber: vine.string().trim().minLength(2).maxLength(80).optional(),
  licenseExpiresAt: isoDate().optional(),
  idCardNumber: vine.string().trim().minLength(2).maxLength(80).optional(),
  city: vine.string().trim().maxLength(120).nullable().optional(),
  birthDate: isoDate().nullable().optional(),
  type: vine.enum(['particulier', 'entreprise'] as const).optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
  isActive: vine.boolean().optional(),
})
