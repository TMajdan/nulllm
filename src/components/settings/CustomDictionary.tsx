import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { sanitizeTokenLabel } from '@/anonymizer/customRules'
import { useI18n } from '@/hooks/useI18n'
import { useIsPro } from '@/store/useLicenseStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useUiStore } from '@/store/useUiStore'

export function CustomDictionary() {
  const entries = useSessionStore((state) => state.customEntries)
  const addCustomEntry = useSessionStore((state) => state.addCustomEntry)
  const removeCustomEntry = useSessionStore((state) => state.removeCustomEntry)

  const isPro = useIsPro()
  const openLicenseModal = useUiStore((state) => state.openLicenseModal)
  const { t } = useI18n()

  const [phrase, setPhrase] = useState('')
  const [label, setLabel] = useState('KLIENT')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isPro) {
      openLicenseModal()
      return
    }

    const entry = addCustomEntry(phrase, label)
    if (!entry) {
      toast.error(t('dictionary.duplicate'))
      return
    }

    toast.success(t('dictionary.added', { phrase: entry.phrase }))
    setPhrase('')
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="space-y-0.5">
          <CardTitle>{t('dictionary.title')}</CardTitle>
          <CardDescription>{t('dictionary.description')}</CardDescription>
        </div>
        {!isPro && (
          <Badge variant="pro" className="mt-0.5">
            {t('common.pro')}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="space-y-1">
            <Label htmlFor="custom-phrase">{t('dictionary.phrase')}</Label>
            <Input
              id="custom-phrase"
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              placeholder={t('dictionary.phrasePlaceholder')}
              disabled={!isPro}
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="custom-label">{t('dictionary.prefix')}</Label>
              <Input
                id="custom-label"
                value={label}
                onChange={(event) => setLabel(event.target.value.toUpperCase())}
                placeholder="KLIENT"
                disabled={!isPro}
                className="font-mono"
                maxLength={24}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              aria-label={t('dictionary.add')}
              title={t('dictionary.add')}
              variant={isPro ? 'default' : 'outline'}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <p className="font-mono text-[10.5px] text-muted-foreground">
            [{sanitizeTokenLabel(label)}_1], [{sanitizeTokenLabel(label)}_2]…
          </p>
        </form>

        {entries.length > 0 && (
          <ul className="space-y-1">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-2 rounded-lg bg-secondary/50 py-1.5 pl-2.5 pr-1"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px]" title={entry.phrase}>
                    {entry.phrase}
                  </p>
                  <p className="font-mono text-[10px] text-pink-600 dark:text-pink-300">
                    [{entry.tokenLabel}_N]
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    removeCustomEntry(entry.id)
                    toast.success(t('dictionary.removed'))
                  }}
                  aria-label={`${t('common.delete')} ${entry.phrase}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!isPro && (
          <Notice tone="info">
            <p>{t('dictionary.proOnly')}</p>
            <button
              type="button"
              onClick={openLicenseModal}
              className="mt-1 text-[12px] font-medium text-primary underline-offset-2 hover:underline"
            >
              {t('dictionary.activate')}
            </button>
          </Notice>
        )}
      </CardContent>
    </Card>
  )
}
