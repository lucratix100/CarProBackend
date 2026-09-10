import vine from '@vinejs/vine'

export const createMarqueValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  isActive: vine.boolean().optional(),
})

export const createModeleValidator = vine.create({
  marqueId: vine.number().positive(),
  name: vine.string().trim().minLength(1).maxLength(80),
  isActive: vine.boolean().optional(),
})
