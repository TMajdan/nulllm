import type { DetectionRule } from '../types'
import { collect } from './helpers'

/** JWT: `eyJ...` header, payload and signature. */
const JWT_PATTERN =
  /(?<![\p{L}\p{N}._-])eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}(?![\p{L}\p{N}])/gdu

/** Authorization headers - only the credential itself is masked. */
const AUTHORIZATION_PATTERN =
  /(?<![\p{L}\p{N}])(?:Bearer|Basic|Token)\s+([A-Za-z0-9\-._~+/]{12,}=*)/gdu

const OPENAI_PATTERN = /(?<![\p{L}\p{N}])sk-(?:ant-|proj-|or-)?[A-Za-z0-9_-]{16,}(?![\p{L}\p{N}])/gdu

const STRIPE_PATTERN = /(?<![\p{L}\p{N}])(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{10,}(?![\p{L}\p{N}])/gdu

const AWS_PATTERN = /(?<![\p{L}\p{N}])(?:AKIA|ASIA)[0-9A-Z]{16}(?![\p{L}\p{N}])/gdu

const GITHUB_PATTERN = /(?<![\p{L}\p{N}])gh[pousr]_[A-Za-z0-9]{20,}(?![\p{L}\p{N}])/gdu

const SLACK_PATTERN = /(?<![\p{L}\p{N}])xox[baprs]-[A-Za-z0-9-]{10,}(?![\p{L}\p{N}])/gdu

const GOOGLE_PATTERN = /(?<![\p{L}\p{N}])AIza[0-9A-Za-z_-]{20,}(?![\p{L}\p{N}])/gdu

/** `api_key = "..."`, `password: ...`, `token=...` - masks only the value. */
const ASSIGNMENT_PATTERN =
  /(?<![\p{L}\p{N}_])(?:api[_-]?key|apikey|secret[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|auth[_-]?token|private[_-]?key|token|password|passwd|pwd)\s*[:=]\s*["'`]?([^\s"'`,;)}]{6,})["'`]?/gidu

/** `user=jdoe`, `login: jdoe` - account identifiers found in logs. */
const CREDENTIALS_PATTERN =
  /(?<![\p{L}\p{N}_])(?:user|username|login|uid)\s*[:=]\s*["'`]?([^\s"'`,;)}]{3,})["'`]?/gidu

const HEX_PATTERN = /(?<![\p{L}\p{N}])(?:[A-Fa-f0-9]{64}|[A-Fa-f0-9]{40}|[A-Fa-f0-9]{32})(?![\p{L}\p{N}])/gdu

const UUID_PATTERN =
  /(?<![\p{L}\p{N}])[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![\p{L}\p{N}])/gdu

const PRIVATE_KEY_PATTERN =
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g

const PLACEHOLDER_VALUES = new Set([
  'null',
  'true',
  'false',
  'undefined',
  'none',
  'string',
  'number',
  'password',
  'secret',
  'example',
  'changeme',
  'redacted',
  '********',
  'xxxxxx',
])

export const jwtRule: DetectionRule = {
  id: 'jwt',
  label: 'Tokeny JWT',
  tokenLabel: 'JWT',
  description: 'Tokeny JWT (nagłówek.payload.signature), także po `Bearer`.',
  category: 'technical',
  tier: 'pro',
  priority: 90,
  defaultEnabled: true,
  detect: (text) => collect(text, JWT_PATTERN),
}

export const apiKeyRule: DetectionRule = {
  id: 'api-key',
  label: 'Klucze API i sekrety',
  tokenLabel: 'API_KEY',
  description: 'Bearer/Basic, klucze OpenAI, Stripe, AWS, GitHub, Slack oraz `password=`.',
  category: 'technical',
  tier: 'pro',
  priority: 88,
  defaultEnabled: true,
  detect: (text) => {
    const authorization = collect(text, AUTHORIZATION_PATTERN, { group: 1 })
    const providers = collect(text, OPENAI_PATTERN)
      .concat(collect(text, STRIPE_PATTERN))
      .concat(collect(text, AWS_PATTERN))
      .concat(collect(text, GITHUB_PATTERN))
      .concat(collect(text, SLACK_PATTERN))
      .concat(collect(text, GOOGLE_PATTERN))
    const assignments = collect(text, ASSIGNMENT_PATTERN, {
      group: 1,
      accept: (value) => !PLACEHOLDER_VALUES.has(value.toLowerCase()),
    })

    return [...authorization, ...providers, ...assignments]
  },
}

export const credentialsRule: DetectionRule = {
  id: 'credentials',
  label: 'Loginy w logach',
  tokenLabel: 'LOGIN',
  description: 'Identyfikatory kont z logów: `user=`, `username=`, `login:`, `uid=`.',
  category: 'technical',
  tier: 'pro',
  priority: 87,
  defaultEnabled: true,
  detect: (text) =>
    collect(text, CREDENTIALS_PATTERN, {
      group: 1,
      accept: (value) => !PLACEHOLDER_VALUES.has(value.toLowerCase()),
    }),
}

export const privateKeyRule: DetectionRule = {
  id: 'private-key',
  label: 'Klucze prywatne (PEM)',
  tokenLabel: 'PRIVATE_KEY',
  description: 'Bloki `-----BEGIN ... PRIVATE KEY-----` wraz z zawartością.',
  category: 'technical',
  tier: 'pro',
  priority: 95,
  defaultEnabled: true,
  detect: (text) => collect(text, PRIVATE_KEY_PATTERN),
}

export const hashRule: DetectionRule = {
  id: 'hash',
  label: 'Hashe (MD5/SHA)',
  tokenLabel: 'HASH',
  description: 'Ciągi hex 32/40/64 znaków - hashe haseł, sumy kontrolne, identyfikatory.',
  category: 'technical',
  tier: 'pro',
  priority: 40,
  defaultEnabled: true,
  detect: (text) => collect(text, HEX_PATTERN),
}

export const uuidRule: DetectionRule = {
  id: 'uuid',
  label: 'UUID',
  tokenLabel: 'UUID',
  description: 'Identyfikatory UUID, np. identyfikatory sesji w logach.',
  category: 'technical',
  tier: 'pro',
  priority: 38,
  defaultEnabled: false,
  detect: (text) => collect(text, UUID_PATTERN),
}
