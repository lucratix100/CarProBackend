import vine from '@vinejs/vine'

export const activityLogsIndexValidator = vine.create({
  page: vine.number().min(1).optional(),
  perPage: vine.number().min(1).max(100).optional(),
  q: vine.string().trim().maxLength(120).optional(),
  actorUserId: vine.number().positive().optional(),
  module: vine.string().trim().maxLength(40).optional(),
  action: vine.string().trim().maxLength(80).optional(),
  clientId: vine.number().positive().optional(),
  rentalId: vine.number().positive().optional(),
  vehicleId: vine.number().positive().optional(),
  result: vine
    .enum(['success', 'denied', 'pending_validation', 'approved', 'rejected'] as const)
    .optional(),
  from: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  entityType: vine.string().trim().maxLength(40).optional(),
  entityId: vine.number().positive().optional(),
})
