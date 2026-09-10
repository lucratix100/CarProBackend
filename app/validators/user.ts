import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(254).toLowerCase()
const password = () => vine.string().minLength(8).maxLength(64)

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
 * Accept invitation: password (+ terms for owners)
 */
export const acceptInvitationValidator = vine.create({
  password: password(),
  passwordConfirmation: password().sameAs('password'),
  acceptTerms: vine.accepted().optional(),
})
