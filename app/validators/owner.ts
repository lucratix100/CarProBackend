import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(254).toLowerCase()

export const createOwnerValidator = vine.create({
  fullName: vine.string().trim().minLength(2).maxLength(120),
  email: email().unique({ table: 'users', column: 'email' }),
  phone: vine.string().trim().maxLength(40).optional(),
  city: vine.string().trim().maxLength(120).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
  sendInvitation: vine.boolean().optional(),
})

export const updateOwnerValidator = vine.create({
  fullName: vine.string().trim().minLength(2).maxLength(120).optional(),
  phone: vine.string().trim().maxLength(40).nullable().optional(),
  city: vine.string().trim().maxLength(120).nullable().optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
  isActive: vine.boolean().optional(),
})
