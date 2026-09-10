import { createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'
import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Vehicle from '#models/vehicle'
import VehiclePhoto from '#models/vehicle_photo'
import City from '#models/city'
import Setting from '#models/setting'
import Rental from '#models/rental'
import RentalService from '#services/rental_service'
import MarketplaceReviewService from '#services/marketplace_review_service'
import CityTransformer from '#transformers/city_transformer'
import { todayISO } from '#services/finance_service'

export default class MarketplaceCatalogController {
  #rentals = new RentalService()
  #reviews = new MarketplaceReviewService()

  #photoUrls(vehicle: Vehicle) {
    const photos = (vehicle.photos ?? []).map((photo) => ({
      id: photo.id,
      position: photo.position,
      url: `/api/v1/marketplace/vehicles/${vehicle.id}/photos/${photo.id}`,
    }))
    return {
      photos,
      photosCount: photos.length,
      photoUrl: photos[0]?.url ?? null,
    }
  }

  #publishedVehicleQuery() {
    return Vehicle.query()
      .where('status', 'Disponible')
      .where('complianceHold', false)
      .where('marketplacePublicationStatus', 'published')
      .whereHas('agency', (agencyQuery) => {
        agencyQuery.where('isActive', true).where('publishOnMarketplace', true)
      })
  }

  async cities({ serialize }: HttpContext) {
    const cities = await City.query().where('isActive', true).orderBy('region').orderBy('name')
    return serialize(CityTransformer.transform(cities))
  }

  async vehicles({ request, response }: HttpContext) {
    const cityId = request.input('cityId')
    const startDate = request.input('startDate')
    const endDate = request.input('endDate')
    const fuel = request.input('fuel')
    const vehicleType = request.input('vehicleType')
    const minPrice = request.input('minPrice')
    const maxPrice = request.input('maxPrice')
    const q = request.input('q')
    const sortRaw = String(request.input('sort') || 'price_asc')
    const sort = ['price_asc', 'price_desc', 'rating_desc'].includes(sortRaw)
      ? sortRaw
      : 'price_asc'
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const perPage = Math.min(50, Math.max(1, Number(request.input('perPage', 12)) || 12))

    if ((startDate && !endDate) || (!startDate && endDate)) {
      throw new Exception('Indiquez les deux dates de début et de fin.', {
        status: 422,
        code: 'E_DATES_REQUIRED',
      })
    }
    if (startDate && endDate && endDate < startDate) {
      throw new Exception('La date de fin doit être postérieure ou égale à la date de début.', {
        status: 422,
        code: 'E_INVALID_DATES',
      })
    }

    const query = this.#publishedVehicleQuery()
    query
      .preload('agency', (aq) => aq.preload('city'))
      .preload('marque')
      .preload('modele')
      .preload('photos', (pq) => pq.orderBy('position').orderBy('id'))

    if (cityId) {
      query.whereHas('agency', (aq) => aq.where('cityId', cityId))
    }
    if (fuel) query.where('fuel', fuel)
    if (vehicleType) query.where('vehicleType', vehicleType)
    if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
      query.where('dailyPrice', '>=', Number(minPrice))
    }
    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
      query.where('dailyPrice', '<=', Number(maxPrice))
    }
    if (q) {
      const term = `%${String(q).trim()}%`
      query.where((builder) => {
        builder
          .whereILike('brand', term)
          .orWhereILike('model', term)
          .orWhereHas('agency', (aq) => aq.whereILike('name', term))
      })
    }

    let rows: Vehicle[] = []
    let meta = {
      total: 0,
      perPage,
      currentPage: page,
      lastPage: 1,
    }

    if (sort === 'rating_desc') {
      const allRows = await query.orderBy('dailyPrice', 'asc').limit(200)
      rows = allRows
      if (startDate && endDate) {
        const available: Vehicle[] = []
        for (const vehicle of rows) {
          const conflict = await this.#rentals.findConflict(vehicle.id, startDate, endDate)
          if (!conflict) available.push(vehicle)
        }
        rows = available
      }
      const agencyRatings = await this.#reviews.aggregatesForAgencies(
        rows.map((v) => v.agencyId).filter(Boolean)
      )
      rows = [...rows].sort((a, b) => {
        const ratingA = agencyRatings.get(a.agencyId)?.avg ?? -1
        const ratingB = agencyRatings.get(b.agencyId)?.avg ?? -1
        if (ratingB !== ratingA) return ratingB - ratingA
        const countA = agencyRatings.get(a.agencyId)?.count ?? 0
        const countB = agencyRatings.get(b.agencyId)?.count ?? 0
        if (countB !== countA) return countB - countA
        return a.dailyPrice - b.dailyPrice
      })
      meta.total = rows.length
      meta.lastPage = Math.max(1, Math.ceil(rows.length / perPage))
      const offset = (page - 1) * perPage
      const pageRows = rows.slice(offset, offset + perPage)
      return response.ok({
        data: pageRows.map((vehicle) => {
          const rating = agencyRatings.get(vehicle.agencyId) ?? { avg: null, count: 0 }
          return {
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            fuel: vehicle.fuel,
            vehicleType: vehicle.vehicleType,
            dailyPrice: vehicle.dailyPrice,
            label: vehicle.label,
            ratingAvg: rating.avg,
            ratingCount: rating.count,
            agency: vehicle.agency
              ? {
                  id: vehicle.agency.id,
                  name: vehicle.agency.name,
                  slug: vehicle.agency.slug,
                  isVerified: Boolean(vehicle.agency.isVerified),
                  city: vehicle.agency.city
                    ? {
                        id: vehicle.agency.city.id,
                        name: vehicle.agency.city.name,
                        region: vehicle.agency.city.region,
                      }
                    : null,
                  ratingAvg: rating.avg,
                  ratingCount: rating.count,
                }
              : null,
            marque: vehicle.marque ? { id: vehicle.marque.id, name: vehicle.marque.name } : null,
            modele: vehicle.modele ? { id: vehicle.modele.id, name: vehicle.modele.name } : null,
            ...this.#photoUrls(vehicle),
          }
        }),
        meta,
      })
    }

    const priceOrder = sort === 'price_desc' ? 'desc' : 'asc'
    const paginated = await query.orderBy('dailyPrice', priceOrder).paginate(page, perPage)
    rows = paginated.all()

    if (startDate && endDate) {
      const available: Vehicle[] = []
      for (const vehicle of rows) {
        const conflict = await this.#rentals.findConflict(vehicle.id, startDate, endDate)
        if (!conflict) available.push(vehicle)
      }
      rows = available
    }

    const agencyRatings = await this.#reviews.aggregatesForAgencies(
      rows.map((v) => v.agencyId).filter(Boolean)
    )

    return response.ok({
      data: rows.map((vehicle) => {
        const rating = agencyRatings.get(vehicle.agencyId) ?? { avg: null, count: 0 }
        return {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          fuel: vehicle.fuel,
          vehicleType: vehicle.vehicleType,
          dailyPrice: vehicle.dailyPrice,
          label: vehicle.label,
          ratingAvg: rating.avg,
          ratingCount: rating.count,
          agency: vehicle.agency
            ? {
                id: vehicle.agency.id,
                name: vehicle.agency.name,
                slug: vehicle.agency.slug,
                isVerified: Boolean(vehicle.agency.isVerified),
                city: vehicle.agency.city
                  ? {
                      id: vehicle.agency.city.id,
                      name: vehicle.agency.city.name,
                      region: vehicle.agency.city.region,
                    }
                  : null,
                ratingAvg: rating.avg,
                ratingCount: rating.count,
              }
            : null,
          marque: vehicle.marque ? { id: vehicle.marque.id, name: vehicle.marque.name } : null,
          modele: vehicle.modele ? { id: vehicle.modele.id, name: vehicle.modele.name } : null,
          ...this.#photoUrls(vehicle),
        }
      }),
      meta: {
        total: startDate && endDate ? rows.length : paginated.total,
        perPage: paginated.perPage,
        currentPage: paginated.currentPage,
        lastPage: startDate && endDate ? 1 : paginated.lastPage,
      },
    })
  }

  async show({ params, response }: HttpContext) {
    const vehicle = await this.#publishedVehicleQuery()
      .where('id', params.id)
      .preload('agency', (aq) => aq.preload('city'))
      .preload('marque')
      .preload('modele')
      .preload('photos', (pq) => pq.orderBy('position').orderBy('id'))
      .firstOrFail()

    const settings = await Setting.current(vehicle.agencyId)
    const [agencyRating, vehicleRatings] = await Promise.all([
      this.#reviews.aggregateForAgency(vehicle.agencyId),
      this.#reviews.aggregatesForVehicles([vehicle.id]),
    ])
    const vehicleRating = vehicleRatings.get(vehicle.id) ?? { avg: null, count: 0 }

    return response.ok({
      id: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      fuel: vehicle.fuel,
      vehicleType: vehicle.vehicleType,
      mileage: vehicle.mileage,
      dailyPrice: vehicle.dailyPrice,
      label: vehicle.label,
      ratingAvg: agencyRating.avg,
      ratingCount: agencyRating.count,
      vehicleRatingAvg: vehicleRating.avg,
      vehicleRatingCount: vehicleRating.count,
      agency: vehicle.agency
        ? {
            id: vehicle.agency.id,
            name: vehicle.agency.name,
            slug: vehicle.agency.slug,
            isVerified: Boolean(vehicle.agency.isVerified),
            city: vehicle.agency.city
              ? {
                  id: vehicle.agency.city.id,
                  name: vehicle.agency.city.name,
                  region: vehicle.agency.city.region,
                }
              : null,
            rentalConditions: settings.rentalConditions,
            depositAmount: settings.depositAmount,
            ratingAvg: agencyRating.avg,
            ratingCount: agencyRating.count,
          }
        : null,
      marque: vehicle.marque ? { id: vehicle.marque.id, name: vehicle.marque.name } : null,
      modele: vehicle.modele ? { id: vehicle.modele.id, name: vehicle.modele.name } : null,
      ...this.#photoUrls(vehicle),
    })
  }

  async availability({ params, request, response }: HttpContext) {
    const startDate = request.input('startDate')
    const endDate = request.input('endDate')

    if ((startDate && !endDate) || (!startDate && endDate)) {
      throw new Exception('Indiquez les deux dates de début et de fin.', {
        status: 422,
        code: 'E_DATES_REQUIRED',
      })
    }

    if (startDate && endDate && endDate < startDate) {
      throw new Exception('La date de fin doit être postérieure ou égale à la date de début.', {
        status: 422,
        code: 'E_INVALID_DATES',
      })
    }

    const vehicle = await this.#publishedVehicleQuery().where('id', params.id).firstOrFail()

    const conflict =
      startDate && endDate
        ? await this.#rentals.findConflict(vehicle.id, startDate, endDate)
        : null

    const busyRows = await Rental.query()
      .where('vehicleId', vehicle.id)
      .whereNot('status', 'Annulée')
      .where('endDate', '>=', todayISO())
      .orderBy('startDate', 'asc')
      .orderBy('id', 'asc')

    return response.ok({
      available: !conflict,
      conflict: conflict
        ? {
            startDate: conflict.startDate.toISODate(),
            endDate: conflict.endDate.toISODate(),
            status: conflict.status,
          }
        : null,
      busyPeriods: busyRows.map((row) => ({
        startDate: row.startDate.toISODate(),
        endDate: row.endDate.toISODate(),
        status: row.status,
      })),
    })
  }

  async photoFile({ params, response }: HttpContext) {
    const vehicle = await this.#publishedVehicleQuery().where('id', params.id).firstOrFail()
    const photo = await VehiclePhoto.query()
      .where('id', params.photoId)
      .where('vehicleId', vehicle.id)
      .firstOrFail()

    const absolutePath = photo.path.startsWith('/')
      ? photo.path
      : `${process.cwd()}/${photo.path}`

    try {
      await access(absolutePath)
    } catch {
      throw new Exception('Photo introuvable.', { status: 404, code: 'E_PHOTO_MISSING' })
    }

    const lower = absolutePath.toLowerCase()
    if (lower.endsWith('.png')) response.header('Content-Type', 'image/png')
    else if (lower.endsWith('.webp')) response.header('Content-Type', 'image/webp')
    else response.header('Content-Type', 'image/jpeg')

    return response.stream(createReadStream(absolutePath))
  }
}
