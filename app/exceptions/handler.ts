import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { Exception } from '@adonisjs/core/exceptions'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'

function isTechnicalMessage(message: string) {
  const trimmed = message.trim()
  if (trimmed.length > 280) return true
  return (
    /\binsert into\b/i.test(trimmed) ||
    /\bupdate\b.+\bset\b/i.test(trimmed) ||
    /\bselect\b.+\bfrom\b/i.test(trimmed) ||
    /\bcolumn\b.+\bdoes not exist\b/i.test(trimmed) ||
    /\brelation\b.+\bdoes not exist\b/i.test(trimmed) ||
    /\bduplicate key\b/i.test(trimmed) ||
    /\bviolates\b.+\bconstraint\b/i.test(trimmed) ||
    /\bECONNREFUSED\b/i.test(trimmed) ||
    /\bSQLSTATE\b/i.test(trimmed) ||
    /\$\d+/.test(trimmed) ||
    /\bnode_modules\b/i.test(trimmed)
  )
}

function publicMessageFor(error: unknown, status: number) {
  if (error instanceof Exception) {
    if (!isTechnicalMessage(error.message)) return error.message
  } else if (error instanceof Error && !isTechnicalMessage(error.message) && status < 500) {
    return error.message
  }

  if (status === 401) return 'Session expirée. Reconnectez-vous.'
  if (status === 403) return 'Accès refusé.'
  if (status === 404) return 'Élément introuvable.'
  if (status === 422) return 'Vérifiez les informations saisies.'
  return 'Une erreur est survenue. Réessayez plus tard.'
}

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    const wantsJson = ctx.request.accepts(['json', 'html']) === 'json'
    const status =
      error instanceof Exception
        ? error.status
        : typeof (error as { status?: number })?.status === 'number'
          ? (error as { status: number }).status
          : 500

    if (wantsJson) {
      if (!(error instanceof Exception) || isTechnicalMessage(String((error as Error).message ?? ''))) {
        logger.error({ err: error }, '[http] Erreur technique masquée au client')
      }

      return ctx.response.status(status >= 400 ? status : 500).send({
        message: publicMessageFor(error, status >= 400 ? status : 500),
        code: error instanceof Exception ? error.code : 'E_INTERNAL',
      })
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
