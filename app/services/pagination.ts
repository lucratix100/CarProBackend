import type { HttpContext } from '@adonisjs/core/http'

type PaginatorLike = {
  getMeta: () => Record<string, unknown>
}

function readNumber(value: unknown, fallback: number) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** Vrai dès que le client demande une page (les listes déroulantes restent complètes). */
export function isPaginatedRequest(request: HttpContext['request']) {
  const page = request.input('page')
  const perPage = request.input('perPage')
  const present = (value: unknown) => value !== undefined && value !== null && value !== ''
  return present(page) || present(perPage)
}

export function readPage(request: HttpContext['request'], defaultPerPage = 10) {
  const page = Math.max(1, readNumber(request.input('page', 1), 1))
  const perPageRaw = readNumber(request.input('perPage', defaultPerPage), defaultPerPage)
  const perPage = Math.min(100, Math.max(1, perPageRaw))
  return { page, perPage }
}

export function paginationMeta(paginator: PaginatorLike, page: number, perPage: number) {
  const raw = paginator.getMeta()
  const num = (camel: string, snake: string, fallback: number) =>
    readNumber(raw[camel] ?? raw[snake], fallback)

  return {
    total: num('total', 'total', 0),
    perPage: num('perPage', 'per_page', perPage),
    currentPage: num('currentPage', 'current_page', page),
    lastPage: num('lastPage', 'last_page', 1),
    firstPage: num('firstPage', 'first_page', 1),
  }
}

/** `serialize()` enveloppe souvent la collection dans `{ data }`. */
export function unwrapSerializedList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data: unknown }).data
    if (Array.isArray(data)) return data as T[]
  }
  return []
}
