import { useMemo, useState, type KeyboardEvent } from 'react'
import { ChevronDown, Languages, Lock, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { Switch } from '@/components/ui/switch'
import { CATEGORY_ORDER, RULES } from '@/anonymizer/rules'
import { ruleIsVisible } from '@/anonymizer/rules/regions'
import type { DetectionRule, RuleCategory } from '@/anonymizer/types'
import { ruleText, useI18n } from '@/hooks/useI18n'
import { LOCALE_LABELS } from '@/i18n'
import { cn } from '@/lib/utils'
import { useIsPro } from '@/store/useLicenseStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useUiStore } from '@/store/useUiStore'

export function RulesSidebar() {
  const enabledIds = useSessionStore((state) => state.enabledRuleIds)
  const toggleRule = useSessionStore((state) => state.toggleRule)
  const setAllRules = useSessionStore((state) => state.setAllRules)
  const resetRules = useSessionStore((state) => state.resetRules)
  const showAllRegions = useSessionStore((state) => state.showAllRegions)
  const setShowAllRegions = useSessionStore((state) => state.setShowAllRegions)
  const isPro = useIsPro()
  const openLicenseModal = useUiStore((state) => state.openLicenseModal)
  const { t, locale } = useI18n()

  const [collapsed, setCollapsed] = useState<Set<RuleCategory>>(new Set())

  const visibleRules = useMemo(
    () => RULES.filter((rule) => ruleIsVisible(rule, locale, showAllRegions)),
    [locale, showAllRegions],
  )

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        rules: visibleRules.filter((rule) => rule.category === category),
      })).filter((group) => group.rules.length > 0),
    [visibleRules],
  )

  const availableRules = visibleRules.filter((rule) => isPro || rule.tier === 'free')
  const activeCount = availableRules.filter((rule) => enabledIds.includes(rule.id)).length

  function toggleCategory(category: RuleCategory) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="space-y-0.5">
          <CardTitle>{t('rules.title')}</CardTitle>
          <CardDescription>{t('rules.description')}</CardDescription>
        </div>
        <Badge variant="secondary" className="mt-0.5 tabular-nums">
          {t('rules.active', { active: activeCount, total: availableRules.length })}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-2.5 py-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium">
              <Languages className="size-3.5 text-muted-foreground" />
              {t('rules.languageFilter')}
            </p>
            <p className="truncate text-[10.5px] text-muted-foreground">
              {showAllRegions
                ? t('rules.allRegionsHint')
                : t('rules.languageHint', { language: LOCALE_LABELS[locale] })}
            </p>
          </div>
          <Switch
            checked={showAllRegions}
            onCheckedChange={setShowAllRegions}
            aria-label={t('rules.showAllRegions')}
            title={t('rules.showAllRegions')}
            className="shrink-0"
          />
        </div>

        {!isPro && (
          <Notice tone="info" title={t('rules.freeTitle')}>
            <p>{t('rules.freeBody')}</p>
            <button
              type="button"
              onClick={openLicenseModal}
              className="mt-1 text-[12px] font-medium text-primary underline-offset-2 hover:underline"
            >
              {t('rules.unlock')}
            </button>
          </Notice>
        )}

        <div className="space-y-1">
          {grouped.map(({ category, rules }) => {
            const isCollapsed = collapsed.has(category)
            const categoryActive = rules.filter(
              (rule) => (isPro || rule.tier === 'free') && enabledIds.includes(rule.id),
            ).length

            return (
              <section key={category}>
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center gap-2 rounded-lg py-1.5 text-left transition-colors hover:text-foreground"
                  title={t(`categories.${category}.description`)}
                >
                  <ChevronDown
                    className={cn(
                      'size-3.5 text-muted-foreground/70 transition-transform',
                      isCollapsed && '-rotate-90',
                    )}
                  />
                  <span className="text-[12px] font-medium text-foreground/80">
                    {t(`categories.${category}.label`)}
                  </span>
                  <span className="ml-auto text-[10.5px] tabular-nums text-muted-foreground/70">
                    {categoryActive}/{rules.length}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="space-y-px pb-1 pl-1">
                    {rules.map((rule) => (
                      <RuleRow
                        key={rule.id}
                        rule={rule}
                        enabled={enabledIds.includes(rule.id)}
                        locked={!isPro && rule.tier === 'pro'}
                        onToggle={() => toggleRule(rule.id)}
                        onLockedClick={openLicenseModal}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <div className="flex gap-1.5 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setAllRules(true, isPro)}
          >
            {t('rules.enableAll')}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={resetRules}
            title={t('rules.reset')}
            aria-label={t('rules.reset')}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RuleRow({
  rule,
  enabled,
  locked,
  onToggle,
  onLockedClick,
}: {
  rule: DetectionRule
  enabled: boolean
  locked: boolean
  onToggle: () => void
  onLockedClick: () => void
}) {
  const { t } = useI18n()
  const label = ruleText(t, rule.id, 'label', rule.label)
  const description = ruleText(t, rule.id, 'description', rule.description)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!locked) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onLockedClick()
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors',
        locked ? 'cursor-pointer hover:bg-secondary/60' : 'hover:bg-secondary/50',
      )}
      onClick={locked ? onLockedClick : undefined}
      role={locked ? 'button' : undefined}
      tabIndex={locked ? 0 : undefined}
      onKeyDown={locked ? handleKeyDown : undefined}
      title={description}
    >
      <Switch
        checked={enabled && !locked}
        disabled={locked}
        onCheckedChange={onToggle}
        aria-label={t('rules.ruleAria', { name: label })}
        className="mt-0.5"
        onClick={(event) => event.stopPropagation()}
      />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          className={cn(
            'truncate text-[12.5px] leading-5',
            locked ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {label}
        </span>
        {locked && <Lock className="size-3 shrink-0 text-muted-foreground/50" />}
      </div>
    </div>
  )
}
