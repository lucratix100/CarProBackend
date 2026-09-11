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
 * Accept invitation: password + acceptation des termes (mandat ou plateforme)
 */
export const acceptInvitationValidator = vine.create({
  password: password(),
  passwordConfirmation: password().sameAs('password'),
  acceptTerms: vine.accepted(),
})
