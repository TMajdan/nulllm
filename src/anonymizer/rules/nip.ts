import { isValidNip } from '../checksums'
import type { DetectionRule } from '../types'
import { collect } from './helpers'

const NIP_PATTERN = /(?<![\p{L}\p{N}])(?:PL[\s-]?)?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?![\p{L}\p{N}])/gdu

export const nipRule: DetectionRule = {
  id: 'nip',
  label: 'NIP',
  tokenLabel: 'NIP',
  description: 'Numer NIP (także z prefiksem PL i separatorami) z sumą kontrolną.',
  category: 'identity',
  tier: 'pro',
  region: 'pl',
  priority: 82,
  defaultEnabled: true,
  detect: (text) => collect(text, NIP_PATTERN, { accept: isValidNip }),
}
