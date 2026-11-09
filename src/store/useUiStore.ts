import { create } from 'zustand'
import type { DocumentFormat, ExportFormat, ManualRedaction, RedactionEdit } from '@/lib/files/types'

export interface ExportPayload {
  text: string
  title: string
  baseName: string
  preferred: ExportFormat
  /** Present only for the anonymized output, enables in-place PDF redaction. */
  edits?: RedactionEdit[]
  /** Original document format, `pdf` triggers the in-place export path. */
  sourceFormat?: DocumentFormat
  /** Regions marked by hand on the PDF preview. */
  manualRedactions?: ManualRedaction[]
}

interface UiStore {
  licenseModalOpen: boolean
  openLicenseModal: () => void
  closeLicenseModal: () => void

  exportPayload: ExportPayload | null
  openExport: (payload: ExportPayload) => void
  closeExport: () => void
}

export const useUiStore = create<UiStore>()((set) => ({
  licenseModalOpen: false,
  openLicenseModal: () => set({ licenseModalOpen: true }),
  closeLicenseModal: () => set({ licenseModalOpen: false }),

  exportPayload: null,
  openExport: (payload) => set({ exportPayload: payload }),
  closeExport: () => set({ exportPayload: null }),
}))
