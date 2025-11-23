import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { VerifiedRegistrationResponse, VerifiedAuthenticationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON, AuthenticationResponseJSON, PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'

const rpName = 'Operone'
const rpID = process.env.NEXTAUTH_URL?.replace('http://', '').replace('https://', '') || 'localhost'
const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export const webAuthnConfig = {
  rpName,
  rpID,
  origin,
  timeout: 60000,
}

export async function generateRegistrationOptionsForUser(
  userId: string,
  userName: string,
  userEmail: string,
  existingAuthenticators: Array<{
    credentialID: string
    credentialPublicKey: string
    counter: number
    transports?: string
  }>
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const options = await generateRegistrationOptions({
    rpName: webAuthnConfig.rpName,
    rpID: webAuthnConfig.rpID,
    userID: userId,
    userName: userEmail,
    userDisplayName: userName,
    timeout: webAuthnConfig.timeout,
    attestationType: 'none',
    excludeCredentials: existingAuthenticators.map((authenticator) => ({
      id: Buffer.from(authenticator.credentialID, 'base64url'),
      type: 'public-key',
      transports: authenticator.transports ? JSON.parse(authenticator.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })

  return options
}

export async function verifyRegistrationResponseForUser(
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<VerifiedRegistrationResponse> {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: webAuthnConfig.origin,
    expectedRPID: webAuthnConfig.rpID,
  })

  return verification
}

export async function generateAuthenticationOptionsForUser(
  authenticators: Array<{
    credentialID: string
    transports?: string
  }>
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const options = await generateAuthenticationOptions({
    rpID: webAuthnConfig.rpID,
    timeout: webAuthnConfig.timeout,
    allowCredentials: authenticators.map((authenticator) => ({
      id: Buffer.from(authenticator.credentialID, 'base64url'),
      type: 'public-key',
      transports: authenticator.transports ? JSON.parse(authenticator.transports) : undefined,
    })),
    userVerification: 'preferred',
  })

  return options
}

export async function verifyAuthenticationResponseForUser(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  authenticator: {
    credentialID: string
    credentialPublicKey: string
    counter: number
  }
): Promise<VerifiedAuthenticationResponse> {
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: webAuthnConfig.origin,
    expectedRPID: webAuthnConfig.rpID,
    authenticator: {
      credentialID: Buffer.from(authenticator.credentialID, 'base64url'),
      credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, 'base64'),
      counter: authenticator.counter,
    },
  })

  return verification
}
