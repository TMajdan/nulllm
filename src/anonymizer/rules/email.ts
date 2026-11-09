import type { DetectionRule } from '../types'
import { collect } from './helpers'

const EMAIL_PATTERN =
  /(?<![\p{L}\p{N}._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}(?![\p{L}\p{N}-])/gdu

export const emailRule: DetectionRule = {
  id: 'email',
  label: 'Adresy e-mail',
  tokenLabel: 'EMAIL',
  description: 'Wszystkie adresy e-mail, także w logach i nagłówkach.',
  category: 'contact',
  tier: 'free',
  priority: 72,
  defaultEnabled: true,
  detect: (text) => collect(text, EMAIL_PATTERN),
}
