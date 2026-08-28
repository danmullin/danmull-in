import { readFileSync } from 'node:fs'

const path = 'public/.well-known/http-message-signatures-directory'
const dir = JSON.parse(readFileSync(path, 'utf8'))

if (!Array.isArray(dir.keys) || dir.keys.length < 1) {
  throw new Error('Web Bot Auth directory must contain at least one public key')
}

for (const [i, key] of dir.keys.entries()) {
  if (!key || typeof key !== 'object' || Array.isArray(key)) {
    throw new Error(`Web Bot Auth directory keys[${i}] is not a JWK object`)
  }
  if ('d' in key) {
    throw new Error('refusing to publish a private key in the Web Bot Auth directory')
  }
  if (key.kty !== 'OKP' || key.crv !== 'Ed25519' || typeof key.x !== 'string' || key.x.length < 1) {
    throw new Error(`Web Bot Auth directory keys[${i}] must be an Ed25519 OKP public key`)
  }
}

console.log(`web-bot-auth directory ok (${dir.keys.length} key(s))`)
