import { generateKeyPairSync, createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const directoryPath = 'public/.well-known/http-message-signatures-directory'

const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const pubJwk = publicKey.export({ format: 'jwk' })
const privJwk = privateKey.export({ format: 'jwk' })

function jwkThumbprint({ crv, kty, x }) {
  const canonical = JSON.stringify({ crv, kty, x })
  return createHash('sha256').update(canonical).digest('base64url')
}

const kid = jwkThumbprint(pubJwk)
const directory = {
  keys: [
    {
      kty: 'OKP',
      crv: 'Ed25519',
      kid,
      x: pubJwk.x,
      use: 'sig',
    },
  ],
}

if ('d' in directory.keys[0]) {
  throw new Error('refusing to write a private key into the public directory')
}

writeFileSync(directoryPath, `${JSON.stringify(directory, null, 2)}\n`)

const privatePath = '/tmp/web-bot-auth-private.jwk.json'
writeFileSync(
  privatePath,
  `${JSON.stringify(
    {
      kty: privJwk.kty,
      crv: privJwk.crv,
      kid,
      x: privJwk.x,
      d: privJwk.d,
      use: 'sig',
    },
    null,
    2,
  )}\n`,
  { mode: 0o600 },
)

console.log(`wrote public directory ${directoryPath}`)
console.log(`kid (JWK thumbprint): ${kid}`)
console.log(`wrote private JWK to ${privatePath} (not in git; do not publish)`)
console.log('Rotate with this script before signing outbound bot requests.')
