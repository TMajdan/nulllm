import type { DetectionRule, RuleCategory } from '../types'
import { bankAccountRule } from './bankAccount'
import { emailRule } from './email'
import { gbNinoRule, usSsnRule } from './englishIds'
import { deTaxIdRule, deUstIdRule } from './germanIds'
import { idCardRule } from './idCard'
import { ipv4Rule, ipv6Rule } from './ip'
import { moneyRule } from './money'
import { nipRule } from './nip'
import { paymentCardRule } from './paymentCard'
import { unixPathRule, windowsPathRule } from './paths'
import { personDeRule, personEnRule, personPlRule } from './personNames'
import { peselRule } from './pesel'
import { phoneRule } from './phone'
import { apiKeyRule, credentialsRule, hashRule, jwtRule, privateKeyRule, uuidRule } from './secrets'

export const RULES: DetectionRule[] = [
  // identity
  peselRule,
  nipRule,
  idCardRule,
  deUstIdRule,
  deTaxIdRule,
  usSsnRule,
  gbNinoRule,
  bankAccountRule,
  // contact
  emailRule,
  phoneRule,
  personPlRule,
  personDeRule,
  personEnRule,
  // technical
  ipv4Rule,
  ipv6Rule,
  jwtRule,
  apiKeyRule,
  credentialsRule,
  privateKeyRule,
  hashRule,
  uuidRule,
  unixPathRule,
  windowsPathRule,
  // finance
  paymentCardRule,
  moneyRule,
]

export const DEFAULT_ENABLED_RULE_IDS = RULES.filter((rule) => rule.defaultEnabled).map(
  (rule) => rule.id,
)

export const CATEGORY_ORDER: RuleCategory[] = [
  'identity',
  'technical',
  'contact',
  'finance',
  'custom',
]

export const CATEGORY_LABELS: Record<RuleCategory, string> = {
  identity: 'Identyfikacja',
  technical: 'Techniczne i logi',
  contact: 'Dane osobowe',
  finance: 'Finanse',
  custom: 'Własny słownik',
}

export const CATEGORY_DESCRIPTIONS: Record<RuleCategory, string> = {
  identity: 'PESEL, NIP, dowód, rachunek bankowy',
  technical: 'IP, klucze API, ścieżki, hashe',
  contact: 'E-mail, telefon, imiona i nazwiska',
  finance: 'Kwoty, karty płatnicze',
  custom: 'Frazy zdefiniowane przez Ciebie',
}

export function getRuleById(id: string): DetectionRule | undefined {
  return RULES.find((rule) => rule.id === id)
}
