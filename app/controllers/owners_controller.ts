import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Owner from '#models/owner'
import OwnerInvitationService from '#services/owner_invitation_service'
import OwnerNotificationService from '#services/owner_notification_service'
import OwnerTransformer from '#transformers/owner_transformer'
import { OWNER_NOTIFICATION_TYPES } from '#constants/owner_notification_types'
import { createOwnerValidator, updateOwnerValidator } from '#validators/owner'

async function safeNotify(ownerId: number, payload: Parameters<OwnerNotificationService['notify']>[1]) {
  try {
    await new OwnerNotificationService().notify(ownerId, payload)
  } catch {
    // ignore
  }
}

export default class OwnersController {
  async #findScoped(id: number | string, agencyId: number) {
    return Owner.query().where('id', id).where('agencyId', agencyId).preload('user').firstOrFail()
  }

  /**
   * List all vehicle owners (admin).
   */
  async index({ serialize, agencyId }: HttpContext) {
    const owners = await Owner.query()
      .where('agencyId', agencyId!)
      .preload('user')
      .orderBy('id', 'desc')
    return serialize(OwnerTransformer.transform(owners).useVariant('withUser'))
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
    const owner = await this.#findScoped(params.id, agencyId!)
    return serialize(OwnerTransformer.transform(owner).useVariant('withUser'))
  }

  /**
   * Update owner profile fields (admin).
   * Syncs user.status when isActive changes (activate / deactivate).
   */
  async update({ params, request, serialize, agencyId }: HttpContext) {
    const owner = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(updateOwnerValidator)
    const wasActive = owner.isActive

    if (payload.fullName !== undefined) {
      owner.user.fullName = payload.fullName
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
        body: 'Votre accès au portail propriétaire a été réactivé par PCS.',
        href: '/portal',
      })
    } else if (becameInactive) {
      await safeNotify(owner.id, {
        type: OWNER_NOTIFICATION_TYPES.ACCOUNT_DEACTIVATED,
        title: 'Compte désactivé',
        body: 'Votre accès au portail propriétaire a été désactivé par PCS.',
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
      body: 'Votre accès au portail propriétaire a été révoqué par PCS.',
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
