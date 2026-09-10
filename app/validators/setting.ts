import vine from '@vinejs/vine'

export const updateSettingsValidator = vine.create({
  companyName: vine.string().trim().minLength(2).maxLength(160).optional(),
  commissionPerDay: vine.number().min(0).optional(),
  tvaRate: vine.number().min(0).max(1).optional(),
  rentalConditions: vine.string().trim().maxLength(10000).nullable().optional(),
  depositAmount: vine.number().min(0).nullable().optional(),
})
