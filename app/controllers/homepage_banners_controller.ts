import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import { DateTime } from 'luxon'
import HomepageBanner from '#models/homepage_banner'
import HomepageBannerTransformer from '#transformers/homepage_banner_transformer'
import BannerUploadService from '#services/banner_upload_service'
import {
  createHomepageBannerValidator,
  updateHomepageBannerValidator,
} from '#validators/homepage_banner'

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const dt = DateTime.fromISO(value)
  return dt.isValid ? dt : null
}

function sanitizeLink(url: string | null | undefined) {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  throw new Exception('Le lien doit être une URL http(s) ou un chemin interne (ex. /#catalogue).', {
    status: 422,
    code: 'E_BANNER_LINK_INVALID',
  })
}

function assertDateWindow(startsAt: DateTime | null, endsAt: DateTime | null) {
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new Exception('La date de fin doit être postérieure à la date de début.', {
      status: 422,
      code: 'E_BANNER_DATE_WINDOW',
    })
  }
}

export default class HomepageBannersController {
  #uploads = new BannerUploadService()

  async index({ serialize }: HttpContext) {
    const banners = await HomepageBanner.query()
      .where('isActive', true)
      .orderBy('sortOrder', 'asc')
      .orderBy('id', 'desc')

    return serialize(HomepageBannerTransformer.transform(banners.filter((banner) => banner.isLive())))
  }

  async imageFile({ params, response }: HttpContext) {
    const banner = await HomepageBanner.findOrFail(params.id)
    if (!banner.imagePath) {
      throw new Exception('Aucune image pour cette bannière.', {
        status: 404,
        code: 'E_BANNER_IMAGE',
      })
    }
    return this.#uploads.streamFile(response, banner.imagePath, true)
  }

  async adminIndex({ serialize }: HttpContext) {
    const banners = await HomepageBanner.query().orderBy('sortOrder', 'asc').orderBy('id', 'desc')
    return serialize(HomepageBannerTransformer.transform(banners))
  }

  async adminShow({ params, serialize }: HttpContext) {
    const banner = await HomepageBanner.findOrFail(params.id)
    return serialize(HomepageBannerTransformer.transform(banner))
  }

  async store({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(createHomepageBannerValidator)
    const startsAt = parseDate(payload.startsAt)
    const endsAt = parseDate(payload.endsAt)
    assertDateWindow(startsAt, endsAt)

    const banner = await HomepageBanner.create({
      title: payload.title,
      body: payload.body ?? null,
      linkUrl: sanitizeLink(payload.linkUrl),
      linkLabel: payload.linkLabel ?? null,
      placement: payload.placement ?? 'below_hero',
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
      startsAt,
      endsAt,
    })

    return response.created(await serialize(HomepageBannerTransformer.transform(banner)))
  }

  async update({ params, request, serialize }: HttpContext) {
    const banner = await HomepageBanner.findOrFail(params.id)
    const payload = await request.validateUsing(updateHomepageBannerValidator)

    const startsAt =
      payload.startsAt === undefined ? banner.startsAt : parseDate(payload.startsAt)
    const endsAt = payload.endsAt === undefined ? banner.endsAt : parseDate(payload.endsAt)
    assertDateWindow(startsAt, endsAt)

    banner.merge({
      title: payload.title ?? banner.title,
      body: payload.body === undefined ? banner.body : payload.body,
      linkUrl: payload.linkUrl === undefined ? banner.linkUrl : sanitizeLink(payload.linkUrl),
      linkLabel: payload.linkLabel === undefined ? banner.linkLabel : payload.linkLabel,
      placement: payload.placement ?? banner.placement,
      sortOrder: payload.sortOrder ?? banner.sortOrder,
      isActive: payload.isActive ?? banner.isActive,
      startsAt,
      endsAt,
    })
    await banner.save()

    return serialize(HomepageBannerTransformer.transform(banner))
  }

  async destroy({ params, response }: HttpContext) {
    const banner = await HomepageBanner.findOrFail(params.id)
    await this.#uploads.removeIfExists(banner.imagePath)
    await banner.delete()
    return response.noContent()
  }

  async adminImageFile({ params, response }: HttpContext) {
    const banner = await HomepageBanner.findOrFail(params.id)
    if (!banner.imagePath) {
      throw new Exception('Aucune image pour cette bannière.', {
        status: 404,
        code: 'E_BANNER_IMAGE',
      })
    }
    return this.#uploads.streamFile(response, banner.imagePath)
  }

  async uploadImage({ params, request, response, serialize }: HttpContext) {
    const banner = await HomepageBanner.findOrFail(params.id)
    const file = this.#uploads.validateFile(request.file('image'))
    if (!file) {
      throw new Exception('Ajoutez une image (JPG, PNG ou WEBP, max 1,5 Mo).', {
        status: 422,
        code: 'E_BANNER_IMAGE_REQUIRED',
      })
    }

    const previous = banner.imagePath
    const path = await this.#uploads.store(file, banner.id)
    banner.imagePath = path
    await banner.save()

    if (previous && previous !== path) {
      await this.#uploads.removeIfExists(previous)
    }

    return response.ok(await serialize(HomepageBannerTransformer.transform(banner)))
  }

  async destroyImage({ params, response, serialize }: HttpContext) {
    const banner = await HomepageBanner.findOrFail(params.id)
    await this.#uploads.removeIfExists(banner.imagePath)
    banner.imagePath = null
    await banner.save()
    return response.ok(await serialize(HomepageBannerTransformer.transform(banner)))
  }
}
