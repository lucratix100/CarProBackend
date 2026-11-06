import vine from '@vinejs/vine'

export const pushSubscribeValidator = vine.create({
  endpoint: vine.string().trim().url().maxLength(2048),
  keys: vine.object({
    p256dh: vine.string().trim().minLength(1).maxLength(255),
    auth: vine.string().trim().minLength(1).maxLength(255),
  }),
})

export const pushUnsubscribeValidator = vine.create({
  endpoint: vine.string().trim().url().maxLength(2048),
})
