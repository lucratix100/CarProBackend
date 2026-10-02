import vine from '@vinejs/vine'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const createHomepageBannerValidator = vine.create({
  title: vine.string().trim().minLength(2).maxLength(120),
  body: vine.string().trim().maxLength(400).nullable().optional(),
  linkUrl: vine.string().trim().maxLength(500).nullable().optional(),
  linkLabel: vine.string().trim().maxLength(80).nullable().optional(),
  placement: vine.enum(['below_hero', 'top_bar', 'hero']).optional(),
  sortOrder: vine.number().min(0).optional(),
  isActive: vine.boolean().optional(),
  startsAt: isoDate().nullable().optional(),
  endsAt: isoDate().nullable().optional(),
})

export const updateHomepageBannerValidator = vine.create({
  title: vine.string().trim().minLength(2).maxLength(120).optional(),
  body: vine.string().trim().maxLength(400).nullable().optional(),
  linkUrl: vine.string().trim().maxLength(500).nullable().optional(),
  linkLabel: vine.string().trim().maxLength(80).nullable().optional(),
  placement: vine.enum(['below_hero', 'top_bar', 'hero']).optional(),
  sortOrder: vine.number().min(0).optional(),
  isActive: vine.boolean().optional(),
  startsAt: isoDate().nullable().optional(),
  endsAt: isoDate().nullable().optional(),
})
