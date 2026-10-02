import vine from '@vinejs/vine'

export const inviteStaffValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(80),
  lastName: vine.string().trim().minLength(1).maxLength(80),
  email: vine.string().email().maxLength(254).toLowerCase(),
  phone: vine.string().trim().minLength(5).maxLength(40),
  jobTitle: vine.string().trim().maxLength(120).nullable().optional(),
  staffRoleId: vine.number().positive(),
  permissionCodes: vine.array(vine.string().maxLength(80)).optional(),
})

export const updateStaffValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(80).optional(),
  lastName: vine.string().trim().minLength(1).maxLength(80).optional(),
  phone: vine.string().trim().minLength(5).maxLength(40).optional(),
  jobTitle: vine.string().trim().maxLength(120).nullable().optional(),
  staffRoleId: vine.number().positive().optional(),
  permissionCodes: vine.array(vine.string().maxLength(80)).optional(),
})

export const updateStaffStatusValidator = vine.create({
  status: vine.enum(['active', 'suspended', 'blocked'] as const),
})

export const createStaffRoleValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(120),
  slug: vine.string().trim().minLength(2).maxLength(60).optional(),
  description: vine.string().trim().maxLength(500).nullable().optional(),
  permissionCodes: vine.array(vine.string().maxLength(80)),
})

export const updateStaffRoleValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(120).optional(),
  description: vine.string().trim().maxLength(500).nullable().optional(),
  permissionCodes: vine.array(vine.string().maxLength(80)).optional(),
})
