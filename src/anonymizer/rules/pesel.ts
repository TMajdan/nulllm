import { isValidPesel } from '../checksums'
import type { DetectionRule } from '../types'
import { collect } from './helpers'

const PESEL_PATTERN = /(?<!\d)\d{11}(?!\d)/gd

export const peselRule: DetectionRule = {
  id: 'pesel',
  label: 'PESEL',
  tokenLabel: 'PESEL',
  description: 'Numer PESEL z walidacją sumy kontrolnej i daty urodzenia.',
  category: 'identity',
  tier: 'pro',
  region: 'pl',
  priority: 84,
  defaultEnabled: true,
  detect: (text) => collect(text, PESEL_PATTERN, { accept: isValidPesel }),
}
