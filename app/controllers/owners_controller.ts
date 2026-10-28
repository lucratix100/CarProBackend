import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import mail from '@adonisjs/mail/services/main'
import Owner from '#models/owner'
import OwnerInvitationService from '#services/owner_invitation_service'
import OwnerNotificationService from '#services/owner_notification_service'
import OwnerStatementService from '#services/owner_statement_service'
import OwnerTransformer from '#transformers/owner_transformer'
import OwnerStatementNotification from '#mails/owner_statement_notification'
import { OWNER_NOTIFICATION_TYPES } from '#constants/owner_notification_types'
import { createOwnerValidator, updateOwnerValidator } from '#validators/owner'
import { isPaginatedRequest, paginationMeta, readPage, unwrapSerializedList } from '#services/pagination'

function parseIsoDateInput(value: unknown) {
  const text = String(value ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : undefined
}

async function safeNotify(ownerId: number, payload: Parameters<OwnerNotificationService['notify']>[1]) {
  try {
    await new OwnerNotificationService().notify(ownerId, payload)
  } catch {
    // ignore
  }
}

export default class OwnersController {
  #statementService = new OwnerStatementService()

  async #findScoped(id: number | string, agencyId: number) {
    return Owner.query().where('id', id).where('agencyId', agencyId).preload('user').firstOrFail()
  }

  /**
   * List all vehicle owners (admin).
   */
  #scoped(agencyId: number) {
    return Owner.query().where('agencyId', agencyId).preload('user').withCount('vehicles')
  }

  async #summary(agencyId: number) {
    const count = async (apply?: (query: ReturnType<typeof Owner.query>) => void) => {
      const query = Owner.query().where('agencyId', agencyId)
      apply?.(query)
      const rows = await query.count('* as total')
      return Number(rows[0]?.$extras?.total ?? 0)
    }

    const [total, active, inactive, invited] = await Promise.all([
      count(),
      count((query) => query.where('isActive', true)),
      count((query) => query.where('isActive', false)),
      count((query) => query.whereHas('user', (user) => user.where('status', 'invited'))),
    ])

    return { total, active, inactive, invited }
  }

  async index({ request, serialize, agencyId }: HttpContext) {
    const status = String(request.input('status') || '')
    const query = this.#scoped(agencyId!)
    if (status === 'active') query.where('isActive', true)
    else if (status === 'inactive') query.where('isActive', false)
    else if (status === 'invited') {
      query.whereHas('user', (user) => user.where('status', 'invited'))
    }
    query.orderBy('id', 'desc')

    if (!isPaginatedRequest(request)) {
      const owners = await query
      return serialize(OwnerTransformer.transform(owners).useVariant('withUser'))
    }

    const { page, perPage } = readPage(request)
    const paginator = await query.paginate(page, perPage)
    const serialized = await serialize(
      OwnerTransformer.transform(paginator.all()).useVariant('withUser')
    )
    return {
      data: unwrapSerializedList(serialized),
      meta: paginationMeta(paginator, page, perPage),
      summary: await this.#summary(agencyId!),
    }
  }

  /**
   * Create owner. Invitation email is optional (default: no email).
   */
  async store({ request, serialize, response, agencyId }: HttpContext) {
    const payload = await request.validateUsing(createOwnerValidator)
    const sendInvitation = payload.sendInvitation === true
    const invitation = new OwnerInvitationService()
    const { owner } = await invitation.create({
      agencyId: agencyId!,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      city: payload.city,
      notes: payload.notes,
      sendInvitation,
    })

    await owner.load('user')

    return response.created(
      await serialize({
        owner: OwnerTransformer.transform(owner).useVariant('withUser'),
        message: sendInvitation
          ? 'Invitation envoyée par email. Demandez au destinataire de vérifier sa boîte de réception et ses indésirables.'
          : 'Propriétaire créé. Vous pouvez rattacher des véhicules, puis l’inviter plus tard.',
      })
    )
  }

  /**
   * Show one owner (admin).
   */
  async show({ params, serialize, agencyId }: HttpContext) {
    const owner = await Owner.query()
      .where('id', params.id)
      .where('agencyId', agencyId!)
      .preload('user')
      .withCount('vehicles')
      .firstOrFail()
    return serialize(OwnerTransformer.transform(owner).useVariant('withUser'))
  }

  /**
   * Owner account summary for a period (vehicles, revenues, expenses).
   * Query: from, to (ISO dates, optional).
   */
  async account({ params, request, agencyId }: HttpContext) {
    const data = await this.#statementService.build(Number(params.id), agencyId!, {
      from: parseIsoDateInput(request.input('from')),
      to: parseIsoDateInput(request.input('to')),
    })

    return {
      ownerId: data.ownerId,
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      ownerPhone: data.ownerPhone,
      companyName: data.companyName,
      from: data.from,
      to: data.to,
      issuedOn: data.issuedOn.toISODate(),
      totalNet: data.totalNet,
      totalExpenses: data.totalExpenses,
      balance: data.balance,
      lines: data.lines,
      expenses: data.expenses,
      byVehicle: data.byVehicle,
    }
  }

  /**
   * Export owner account statement as PDF (admin).
   * Query: from, to (ISO dates, optional).
   */
  async statement({ params, request, response, agencyId }: HttpContext) {
    const data = await this.#statementService.build(Number(params.id), agencyId!, {
      from: parseIsoDateInput(request.input('from')),
      to: parseIsoDateInput(request.input('to')),
    })
    const pdf = await this.#statementService.generatePdf(data)
    const fromSlug = data.from ?? 'debut'
    const toSlug = data.to ?? 'fin'
    const filename = `releve-compte-${data.ownerId}-${fromSlug}_${toSlug}.pdf`

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `inline; filename="${filename}"`)
    return response.send(pdf)
  }

  /**
   * Email the owner statement PDF for a period (admin).
   * Body/query: from, to (ISO dates, optional).
   */
  async emailStatement({ params, request, response, agencyId }: HttpContext) {
    const from = parseIsoDateInput(request.input('from'))
    const to = parseIsoDateInput(request.input('to'))
    const data = await this.#statementService.build(Number(params.id), agencyId!, { from, to })

    if (!data.ownerEmail) {
      throw new Exception('Ce propriétaire n’a pas d’adresse e-mail.', {
        status: 422,
        code: 'E_OWNER_NO_EMAIL',
      })
    }

    const pdf = await this.#statementService.generatePdf(data)
    const fromSlug = data.from ?? 'debut'
    const toSlug = data.to ?? 'fin'
    const filename = `releve-compte-${data.ownerId}-${fromSlug}_${toSlug}.pdf`

    try {
      await mail.send(
        new OwnerStatementNotification({
          email: data.ownerEmail,
          fullName: data.ownerName,
          companyName: data.companyName,
          from: data.from,
          to: data.to,
          totalNet: data.totalNet,
          totalExpenses: data.totalExpenses,
          balance: data.balance,
          filename,
          pdf,
        })
      )
    } catch {
      throw new Exception('Impossible d’envoyer le relevé par e-mail pour le moment.', {
        status: 502,
        code: 'E_STATEMENT_EMAIL',
      })
    }

    return response.ok({
      message: `Relevé envoyé à ${data.ownerEmail}.`,
      email: data.ownerEmail,
      from: data.from,
      to: data.to,
    })
  }

  /**
   * Update owner profile fields (admin).
   * Syncs user.status when isActive changes (activate / deactivate).
   */
  async update({ params, request, serialize, agencyId }: HttpContext) {
    const owner = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(updateOwnerValidator, {
      meta: { userId: owner.user.id },
    })
    const wasActive = owner.isActive

    if (payload.fullName !== undefined) {
      owner.user.fullName = payload.fullName
    }

    if (payload.email !== undefined) {
      owner.user.email = payload.email
    }

    if (payload.isActive !== undefined && payload.isActive !== owner.isActive) {
      owner.isActive = payload.isActive
      if (payload.isActive) {
        // Réactivation : actif si le mot de passe existe, sinon invitation en attente
        owner.user.status = owner.user.passwordSetAt ? 'active' : 'invited'
      } else {
        owner.user.status = 'revoked'
        owner.user.invitationToken = null
      }
    }

    const becameActive = payload.isActive === true && !wasActive
    const becameInactive = payload.isActive === false && wasActive

    owner.merge({
      phone: payload.phone === undefined ? owner.phone : payload.phone,
      city: payload.city === undefined ? owner.city : payload.city,
      notes: payload.notes === undefined ? owner.notes : payload.notes,
    })

    await owner.user.save()
    await owner.save()
    await owner.load('user')

    if (becameActive) {
      await safeNotify(owner.id, {
        type: OWNER_NOTIFICATION_TYPES.ACCOUNT_ACTIVATED,
        title: 'Compte réactivé',
        body: 'Votre accès au portail propriétaire a été réactivé par mobiprofil.',
        href: '/portal',
      })
    } else if (becameInactive) {
      await safeNotify(owner.id, {
        type: OWNER_NOTIFICATION_TYPES.ACCOUNT_DEACTIVATED,
        title: 'Compte désactivé',
        body: 'Votre accès au portail propriétaire a été désactivé par mobiprofil.',
        href: '/portal',
      })
    }

    return serialize(OwnerTransformer.transform(owner).useVariant('withUser'))
  }

  /**
   * Soft-revoke owner access (admin).
   */
  async destroy({ params, response, agencyId }: HttpContext) {
    const owner = await this.#findScoped(params.id, agencyId!)
    owner.isActive = false
    await owner.save()
    owner.user.status = 'revoked'
    owner.user.invitationToken = null
    await owner.user.save()

    await safeNotify(owner.id, {
      type: OWNER_NOTIFICATION_TYPES.ACCOUNT_DEACTIVATED,
      title: 'Compte révoqué',
      body: 'Votre accès au portail propriétaire a été révoqué par mobiprofil.',
      href: '/portal',
    })

    return response.ok({ message: 'Compte propriétaire révoqué.' })
  }

  /**
   * Resend invitation email (admin).
   */
  async resendInvitation({ params, serialize, agencyId }: HttpContext) {
    const owner = await this.#findScoped(params.id, agencyId!)
    const invitation = new OwnerInvitationService()

    try {
      await owner.load('user')
      const firstInvite = !owner.user.invitationExpiresAt
      await invitation.resend(owner)
      await owner.load('user')
      return serialize({
        owner: OwnerTransformer.transform(owner).useVariant('withUser'),
        message: firstInvite
          ? 'Invitation envoyée par email. Vérifiez aussi les indésirables côté destinataire.'
          : 'Invitation renvoyée par email. Vérifiez aussi les indésirables côté destinataire.',
      })
    } catch (error) {
      throw new Exception((error as Error).message, { status: 422, code: 'E_INVITE_RESEND' })
    }
  }
}
