import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(254).toLowerCase()

export const createAgencyValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(160),
  slug: vine
    .string()
    .trim()
    .minLength(2)
    .maxLength(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
  cityId: vine.number().positive(),
  adminFullName: vine.string().trim().minLength(2).maxLength(120),
  adminEmail: email().unique({ table: 'users', column: 'email' }),
})

export const updateAgencyValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(160).optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
  isActive: vine.boolean().optional(),
  isVerified: vine.boolean().optional(),
  cityId: vine.number().positive().nullable().optional(),
  publishOnMarketplace: vine.boolean().optional(),
  clearMarketplacePublishBan: vine.boolean().optional(),
})

export const inviteAgencyAdminValidator = vine.create({
  fullName: vine.string().trim().minLength(2).maxLength(120),
  email: email().unique({ table: 'users', column: 'email' }),
})
