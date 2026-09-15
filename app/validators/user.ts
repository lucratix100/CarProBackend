import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(254).toLowerCase()

/** Mot de passe fort : 10+ car., majuscule, minuscule, chiffre, symbole. */
const password = () =>
  vine
    .string()
    .minLength(10)
    .maxLength(64)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)

/**
 * Shared rules for email and password.
 */
export { email, password }

/**
 * Validator to use when performing self-signup (bootstrap / disabled in prod)
 */
export const signupValidator = vine.create({
  fullName: vine.string().nullable(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/**
 * Validator to use before validating user credentials during login
 */
export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})

/**
 * Mot de passe oublié : demande d’envoi d’un lien de réinitialisation
 */
export const forgotPasswordValidator = vine.create({
  email: email(),
})

/**
 * Définir un nouveau mot de passe via le lien reçu par email
 */
export const resetPasswordValidator = vine.create({
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/**
 * Demande un lien de changement de mot de passe (utilisateur connecté)
 */
export const changePasswordValidator = vine.create({
  currentPassword: vine.string().minLength(1),
})

/**
 * Accept invitation: password + acceptation des termes (mandat ou plateforme)
 */
export const acceptInvitationValidator = vine.create({
  password: password(),
  passwordConfirmation: password().sameAs('password'),
  acceptTerms: vine.accepted(),
})
