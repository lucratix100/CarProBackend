import vine from '@vinejs/vine'

const email = () => vine.string().trim().email().maxLength(254).toLowerCase()

export const createPartnerApplicationValidator = vine.create({
  type: vine.enum(['agency', 'owner'] as const),
  fullName: vine.string().trim().minLength(2).maxLength(120),
  email: email(),
  phone: vine.string().trim().minLength(5).maxLength(40),
  cityId: vine.number().positive().optional(),
  agencyName: vine.string().trim().minLength(2).maxLength(160).optional(),
  requestedAgencyId: vine.number().positive().optional(),
  fleetSize: vine.number().min(0).max(10000).optional(),
  message: vine.string().trim().maxLength(2000).optional(),
})

export const listPartnerApplicationsValidator = vine.create({
  type: vine.enum(['agency', 'owner'] as const).optional(),
  status: vine.enum(['pending', 'approved', 'rejected', 'cancelled'] as const).optional(),
  agencyId: vine.number().positive().optional(),
  page: vine.number().min(1).optional(),
  perPage: vine.number().min(1).max(100).optional(),
})

export const rejectPartnerApplicationValidator = vine.create({
  reason: vine.string().trim().minLength(3).maxLength(500).optional(),
})

export const approveOwnerApplicationValidator = vine.create({
  agencyId: vine.number().positive().optional(),
  sendInvitation: vine.boolean().optional(),
})
