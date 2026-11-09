import type { DetectionRule } from '../types'
import { collect } from './helpers'

const OCTET = String.raw`(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)`

const IPV4_PATTERN = new RegExp(
  String.raw`(?<![\d.])${OCTET}(?:\.${OCTET}){3}(?![\d.])`,
  'gd',
)

/** Full and compressed IPv6 forms (including `::1` and mapped addresses). */
const IPV6_PATTERN = new RegExp(
  String.raw`(?<![:.\w])(?:` +
    String.raw`(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}` +
    String.raw`|(?:[a-fA-F0-9]{1,4}:){1,7}:` +
    String.raw`|(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}` +
    String.raw`|(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}` +
    String.raw`|(?:[a-fA-F0-9]{1,4}:){1,4}(?::[a-fA-F0-9]{1,4}){1,3}` +
    String.raw`|(?:[a-fA-F0-9]{1,4}:){1,3}(?::[a-fA-F0-9]{1,4}){1,4}` +
    String.raw`|(?:[a-fA-F0-9]{1,4}:){1,2}(?::[a-fA-F0-9]{1,4}){1,5}` +
    String.raw`|[a-fA-F0-9]{1,4}:(?::[a-fA-F0-9]{1,4}){1,6}` +
    String.raw`|:(?:(?::[a-fA-F0-9]{1,4}){1,7}|:)` +
    String.raw`)(?![:.\w])`,
  'gd',
)

export const ipv4Rule: DetectionRule = {
  id: 'ipv4',
  label: 'Adresy IPv4',
  tokenLabel: 'IP_ADDRESS',
  description: 'Adresy IPv4, np. 192.168.10.42.',
  category: 'technical',
  tier: 'free',
  priority: 74,
  defaultEnabled: true,
  detect: (text) => collect(text, IPV4_PATTERN),
}

export const ipv6Rule: DetectionRule = {
  id: 'ipv6',
  label: 'Adresy IPv6',
  tokenLabel: 'IPV6',
  description: 'Adresy IPv6 w formacie pełnym i skróconym (::1, fe80::1).',
  category: 'technical',
  tier: 'free',
  priority: 76,
  defaultEnabled: true,
  detect: (text) => collect(text, IPV6_PATTERN),
}
