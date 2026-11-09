import { isPaymentCard } from '../checksums'
import type { DetectionRule } from '../types'
import { collect } from './helpers'

const CARD_PATTERN = /(?<![\d])(?:\d[ -]?){12,18}\d(?![\d])/gd

export const paymentCardRule: DetectionRule = {
  id: 'payment-card',
  label: 'Karty płatnicze',
  tokenLabel: 'KARTA',
  description: 'Numery kart 13-19 cyfr zweryfikowane algorytmem Luhna.',
  category: 'finance',
  tier: 'pro',
  priority: 70,
  defaultEnabled: true,
  detect: (text) => collect(text, CARD_PATTERN, { accept: isPaymentCard }),
}
