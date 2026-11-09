import type { DetectionRule } from '../types'
import { collect } from './helpers'

const UNIX_PATH =
  /(?<![\p{L}\p{N}_])\/(?:home|Users|root|var|etc|opt|usr|srv|mnt|media|tmp|data|app|workspace|srv)\/[^\s"'`<>|,;:)\]}]*/gdu

const WINDOWS_PATH =
  /(?<![\p{L}\p{N}_])(?:[A-Za-z]:\\|\\\\)(?:[^\s"'`<>|,;:*?\\]+\\)*[^\s"'`<>|,;:*?\\]+/gdu

export const unixPathRule: DetectionRule = {
  id: 'path-unix',
  label: 'Ścieżki Unix',
  tokenLabel: 'SCIEZKA',
  description: 'Ścieżki systemowe typu /home/..., /var/log/..., /etc/...',
  category: 'technical',
  tier: 'pro',
  priority: 60,
  defaultEnabled: true,
  detect: (text) => collect(text, UNIX_PATH, { trimTrailingJunk: true }),
}

export const windowsPathRule: DetectionRule = {
  id: 'path-windows',
  label: 'Ścieżki Windows',
  tokenLabel: 'SCIEZKA',
  description: 'Ścieżki typu C:\\Users\\..., D:\\..., \\\\serwer\\udział.',
  category: 'technical',
  tier: 'pro',
  priority: 61,
  defaultEnabled: true,
  detect: (text) => collect(text, WINDOWS_PATH, { trimTrailingJunk: true }),
}
