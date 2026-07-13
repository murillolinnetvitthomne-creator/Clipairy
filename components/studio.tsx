'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Clock3,
  FileVideo,
  Gauge,
  Infinity as InfinityIcon,
  Loader2,
  Lock,
  Monitor,
  Play,
  RotateCcw,
  Smartphone,
  Sparkles,
  Type,
  Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type AccountState } from '@/app/actions/account'
import { startGeneration, getGeneration, type GenerationState } from '@/app/actions/generate'
import { useI18n } from '@/components/i18n-provider'
import { MediaUploader, type UploadedAsset } from '@/components/media-uploader'
import {
  CHARACTER_PRESETS,
  getCreditsRequired,
  QUALITY_TIERS,
  QUALITY_TIER_IDS,
  type CharacterPresetId,
  type QualityTier,
} from '@/lib/video-options'
import { VIDEO_LANGUAGES, type VideoLanguage } from '@/lib/video-languages'
import {
  allowsCharacterReference,
  PRODUCT_AUDIENCE_IDS,
  type ProductAudience,
} from '@/lib/product-audiences'

type StepState = 'pending' | 'processing' | 'done'
type Status = 'idle' | 'running' | 'done' | 'error'
type Step = { title: string; desc: string; tools: string[] }

const STEP_COUNT = 12
const POLL_INTERVAL = 2500

export function Studio({
  isAuthed,
  userId,
  account,
}: {
  isAuthed: boolean
  userId: string | null
  account: AccountState | null
}) {
  const { t } = useI18n()
  const [status, setStatus] = useState<Status>('idle')
  const [gen, setGen] = useState<GenerationState | null>(null)
  const [sellingPoints, setSellingPoints] = useState('')
  const [productAudience, setProductAudience] = useState<ProductAudience | ''>('')
  const [referenceVideo, setReferenceVideo] = useState<UploadedAsset[]>([])
  const [productImages, setProductImages] = useState<UploadedAsset[]>([])
  const [characterImages, setCharacterImages] = useState<UploadedAsset[]>([])
  const [characterPresetId, setCharacterPresetId] = useState<CharacterPresetId>('ava')
  const [qualityTier, setQualityTier] = useState<QualityTier>('standard')
  const [videoLanguage, setVideoLanguage] = useState<VideoLanguage | ''>('')
  const [duration, setDuration] = useState<GenerationState['duration']>(8)
  const [aspectRatio, setAspectRatio] = useState<GenerationState['aspectRatio']>('9:16')
  const [credits, setCredits] = useState<number>(account?.credits ?? 0)
  const [unlimited] = useState<boolean>(account?.unlimited ?? false)
  const poller = useRef<ReturnType<typeof setInterval> | null>(null)

  const creditsRequired = getCreditsRequired(duration, qualityTier)
  const hasPlan = !!account?.planId
  const canTrial = isAuthed && hasPlan && (unlimited || credits >= creditsRequired)

  const stopPolling = () => {
    if (poller.current) {
      clearInterval(poller.current)
      poller.current = null
    }
  }

  // Clean up the poller when the component unmounts.
  useEffect(() => stopPolling, [])

  // Derive the completed-step count from the server-reported step. The pipeline
  // reports 1,3,4,7,10,11,12 — we treat `step` as "steps completed".
  const currentStep = gen?.step ?? 0
  const stepStates: StepState[] = Array.from({ length: STEP_COUNT }, (_, i) => {
    if (i < currentStep) return 'done'
    if (i === currentStep && status === 'running') return 'processing'
    return 'pending'
  })
  const progress = Math.round((Math.min(currentStep, STEP_COUNT) / STEP_COUNT) * 100)

  const run = async () => {
    if (!canTrial || !videoLanguage || !productAudience) return
    stopPolling()
    setStatus('running')
    setGen(null)

    let job: GenerationState
    try {
      job = await startGeneration(
        sellingPoints,
        duration,
        aspectRatio,
        referenceVideo[0]?.pathname,
        productImages.map((asset) => asset.pathname),
        qualityTier,
        allowsCharacterReference(productAudience) && characterImages.length === 0 ? characterPresetId : undefined,
        allowsCharacterReference(productAudience) ? characterImages[0]?.pathname : undefined,
        videoLanguage,
        productAudience,
      )
    } catch {
      // Gate errors (NO_PLAN / NO_CREDITS) — the banner already covers these.
      setStatus('idle')
      return
    }

    // Reflect the server-side duration charge locally.
    if (!unlimited) setCredits((current) => Math.max(0, current - creditsRequired))
    setGen(job)

    // Poll the job until it finishes or errors.
    poller.current = setInterval(async () => {
      try {
        const latest = await getGeneration(job.id)
        if (!latest) return
        setGen(latest)
        if (latest.status === 'done') {
          stopPolling()
          setStatus('done')
        } else if (latest.status === 'error') {
          stopPolling()
          if (!unlimited) setCredits((current) => current + creditsRequired)
          setStatus('error')
        }
      } catch {
        // Transient error — keep polling.
      }
    }, POLL_INTERVAL)
  }

  const reset = () => {
    stopPolling()
    setStatus('idle')
    setGen(null)
  }

  return (
    <section id="studio" className="mx-auto max-w-6xl px-3 py-12 sm:px-6 sm:py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t.studio.title}
        </h2>
        <p className="mt-4 text-pretty text-muted-foreground">{t.studio.subtitle}</p>
      </div>

      {/* Upload area */}
      <div className="mt-8 grid gap-3 sm:mt-10 sm:gap-4 md:mt-12 md:grid-cols-3">
        <MediaUploader
          userId={userId}
          kind="video"
          label={t.studio.upload1Label}
          hint={`${t.studio.upload1Hint} · MP4/MOV/WebM · 100 MB`}
          value={referenceVideo}
          onChange={setReferenceVideo}
          disabled={status === 'running'}
        />
        <MediaUploader
          userId={userId}
          kind="image"
          label={t.studio.upload2Label}
          hint={`${t.studio.upload2Hint} · JPG/PNG/WebP · 最多 6 张`}
          value={productImages}
          onChange={setProductImages}
          disabled={status === 'running'}
          maxFiles={6}
        />
        <div className="flex flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
              <Type className="size-5" />
            </span>
            {t.studio.upload3Label}
          </div>
          <label htmlFor="selling-points" className="sr-only">
            {t.studio.upload3Label}
          </label>
          <textarea
            id="selling-points"
            value={sellingPoints}
            onChange={(e) => setSellingPoints(e.target.value)}
            placeholder={t.studio.sellingPlaceholder}
            className="mt-4 h-[104px] w-full resize-none rounded-xl border border-input bg-background/50 p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/60"
          />
        </div>
      </div>

      <fieldset disabled={status === 'running'} className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold text-foreground">
          {t.studio.creator.audienceTitle}
        </legend>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t.studio.creator.audienceDesc}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {PRODUCT_AUDIENCE_IDS.map((audienceId) => (
            <button
              key={audienceId}
              type="button"
              aria-pressed={productAudience === audienceId}
              onClick={() => {
                setProductAudience(audienceId)
                if (!allowsCharacterReference(audienceId)) setCharacterImages([])
              }}
              className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors ${
                productAudience === audienceId
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary/60'
              }`}
            >
              {t.studio.creator.audienceNames[audienceId]}
            </button>
          ))}
        </div>
        {!productAudience && (
          <p className="mt-2 text-xs font-medium text-primary">{t.studio.creator.audienceRequired}</p>
        )}
        {productAudience && !allowsCharacterReference(productAudience) && (
          <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {t.studio.creator.audienceCharacterDisabled}
          </p>
        )}
      </fieldset>

      <div className={`mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5 ${
        productAudience && !allowsCharacterReference(productAudience) ? 'opacity-55' : ''
      }`}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t.studio.creator.characterTitle}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t.studio.creator.characterDesc}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{t.studio.creator.characterDrift}</span>
        </div>
        <fieldset disabled={status === 'running' || (!!productAudience && !allowsCharacterReference(productAudience))} className="mt-4">
          <legend className="sr-only">{t.studio.creator.characterSelect}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {CHARACTER_PRESETS.map((character) => {
              const selected = characterImages.length === 0 && characterPresetId === character.id
              return (
                <button
                  key={character.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setCharacterImages([])
                    setCharacterPresetId(character.id)
                  }}
                  className={`overflow-hidden rounded-xl border text-left transition-colors ${
                    selected ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/60'
                  }`}
                >
                  <Image
                    src={character.image}
                    alt={`${character.name} ${t.studio.creator.characterAlt}`}
                    width={240}
                    height={300}
                    className="aspect-[4/5] w-full object-cover"
                  />
                  <span className="flex items-center justify-between gap-1 px-2 py-2">
                    <span className="text-xs font-semibold text-foreground">{character.name}</span>
                    {selected && <Check className="size-3.5 text-primary" aria-hidden="true" />}
                  </span>
                  <span className="block px-2 pb-2 text-[11px] text-muted-foreground">
                    {t.studio.creator.characterTitle}
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>
        <div className="mt-4 max-w-sm">
          <MediaUploader
            userId={userId}
            kind="image"
            label={t.studio.creator.uploadCharacter}
            hint={t.studio.creator.authorization}
            value={characterImages}
            onChange={(assets) => setCharacterImages(assets.slice(0, 1))}
            disabled={status === 'running' || (!!productAudience && !allowsCharacterReference(productAudience))}
            maxFiles={1}
          />
        </div>
      </div>

      <fieldset disabled={status === 'running'} className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-foreground">
          <Gauge className="size-4 text-primary" aria-hidden="true" />
          {t.studio.creator.qualityTitle}
        </legend>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {QUALITY_TIER_IDS.map((tierId) => {
            const quality = QUALITY_TIERS[tierId]
            const selected = qualityTier === tierId
            return (
              <button
                key={tierId}
                type="button"
                onClick={() => setQualityTier(tierId)}
                aria-pressed={selected}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  selected ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/60'
                }`}
              >
                <span className="font-semibold text-foreground">{t.studio.creator.qualityNames[tierId]}</span>
                <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                  {t.studio.creator.qualityDescriptions[tierId]}
                </span>
                <span className="mt-3 block text-xs font-medium text-foreground">
                  {t.studio.creator.per8} {quality.creditMultiplier} {t.studio.creator.credits}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {duration}{t.studio.secondsUnit} · {creditsRequired} {t.studio.creator.credits}
        </p>
      </fieldset>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <label htmlFor="video-language" className="text-sm font-semibold text-foreground">
          {t.studio.creator.videoLanguageTitle}
        </label>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t.studio.creator.videoLanguageDesc}
        </p>
        <select
          id="video-language"
          value={videoLanguage}
          onChange={(event) => setVideoLanguage(event.target.value as VideoLanguage | '')}
          disabled={status === 'running'}
          required
          aria-describedby={!videoLanguage ? 'video-language-error' : undefined}
          className="mt-3 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-md"
        >
          <option value="">{t.studio.creator.videoLanguagePlaceholder}</option>
          {VIDEO_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.nativeName} · {language.name}
            </option>
          ))}
        </select>
        {!videoLanguage && (
          <p id="video-language-error" className="mt-2 text-xs font-medium text-primary">
            {t.studio.creator.videoLanguageRequired}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
        <fieldset disabled={status === 'running'}>
          <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock3 className="size-4 text-primary" aria-hidden="true" />
            {t.studio.durationLabel}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {([8, 16, 24, 30] as const).map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => setDuration(seconds)}
                aria-pressed={duration === seconds}
                className={`min-w-16 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  duration === seconds
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/60'
                }`}
              >
                {seconds}{t.studio.secondsUnit}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {duration}{t.studio.secondsUnit} · {creditsRequired} {t.studio.creator.credits}
          </p>
        </fieldset>

        <fieldset disabled={status === 'running'}>
          <legend className="text-sm font-semibold text-foreground">{t.studio.aspectRatioLabel}</legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {([
              { value: '9:16' as const, label: t.studio.portrait, icon: Smartphone },
              { value: '16:9' as const, label: t.studio.landscape, icon: Monitor },
            ]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAspectRatio(value)}
                aria-pressed={aspectRatio === value}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  aspectRatio === value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/60'
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label} {value}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Gate banner — shown when the user cannot trial */}
      {!canTrial && (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Lock className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                {!isAuthed ? t.studio.gateAnonTitle : t.studio.gateNoPlanTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {!isAuthed ? t.studio.gateAnonDesc : t.studio.gateNoPlanDesc}
              </p>
            </div>
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            {!isAuthed ? (
              <>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/sign-in" />}
                  className="flex-1 sm:flex-none"
                >
                  {t.header.signIn}
                </Button>
                <Button
                  nativeButton={false}
                  render={<Link href="/sign-up" />}
                  className="flex-1 font-medium sm:flex-none"
                >
                  {t.header.signUp}
                </Button>
              </>
            ) : (
              <Button
                nativeButton={false}
                render={<Link href="/account" />}
                className="flex-1 font-medium sm:flex-none"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                {t.studio.buyPlan}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Action bar — shown when the user can trial */}
      {canTrial && (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              {status === 'idle' && t.studio.statusIdle}
              {status === 'running' && `${t.studio.statusRunning} ${progress}%`}
              {status === 'done' && t.studio.statusDone}
              {status === 'error' && t.studio.statusError}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium text-foreground">
              {t.studio.creditsLabel}
              {unlimited ? (
                <span className="flex items-center gap-1 text-primary">
                  <InfinityIcon className="size-3.5" aria-hidden="true" />
                  {t.studio.unlimited}
                </span>
              ) : (
                <span className="text-primary">{credits}</span>
              )}
            </span>
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            {status === 'done' ? (
              <Button variant="outline" onClick={reset} className="flex-1 sm:flex-none">
                <RotateCcw className="size-4" aria-hidden="true" />
                {t.studio.regenerate}
              </Button>
            ) : status === 'error' ? (
              <Button onClick={run} className="flex-1 font-medium sm:flex-none" size="lg">
                <RotateCcw className="size-4" aria-hidden="true" />
                {t.studio.retry}
              </Button>
            ) : (
              <Button
                onClick={run}
                disabled={status === 'running' || !videoLanguage || !productAudience}
                className="flex-1 font-medium sm:flex-none"
                size="lg"
              >
                {status === 'running' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t.studio.generating}
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4" aria-hidden="true" />
                    {t.studio.generate}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {status !== 'idle' && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Workflow steps */}
      <div id="workflow" className="mt-12 scroll-mt-20">
        <h3 className="mb-6 text-center font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t.studio.workflowHeading}
        </h3>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {t.studio.steps.map((step, i) => (
            <StepItem
              key={i}
              index={i}
              step={step}
              state={stepStates[i]}
              stateLabels={STATE_LABELS(t)}
            />
          ))}
        </ol>
      </div>

      {/* Results */}
      <div id="preview" className="mt-16 scroll-mt-20">
        {status === 'done' && gen ? (
          <ResultPreview gen={gen} />
        ) : status === 'error' ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">{t.studio.errorTitle}</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground text-pretty">
              {gen?.error || t.studio.errorDesc}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
            <Play className="size-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="mt-4 text-sm text-muted-foreground">{t.studio.resultsPlaceholder}</p>
          </div>
        )}
      </div>
    </section>
  )
}

type StateLabels = { done: string; processing: string; waiting: string }

function STATE_LABELS(t: ReturnType<typeof useI18n>['t']): StateLabels {
  return {
    done: t.studio.stepStatus.done,
    processing: t.studio.stepStatus.processing,
    waiting: t.studio.stepStatus.waiting,
  }
}

function StepItem({
  index,
  step,
  state,
  stateLabels,
}: {
  index: number
  step: Step
  state: StepState
  stateLabels: StateLabels
}) {
  return (
    <li
      className={`flex items-start gap-3 rounded-xl border p-4 transition-all duration-300 ${
        state === 'processing'
          ? 'border-primary/60 bg-primary/5'
          : state === 'done'
            ? 'border-border bg-card'
            : 'border-border/60 bg-card/40'
      }`}
    >
      <span
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
          state === 'done'
            ? 'bg-primary text-primary-foreground'
            : state === 'processing'
              ? 'bg-primary/15 text-primary'
              : 'bg-secondary text-muted-foreground'
        }`}
      >
        {state === 'done' ? (
          <Check className="size-4" aria-hidden="true" />
        ) : state === 'processing' ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          index + 1
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{step.title}</p>
          <span
            className={`shrink-0 text-[11px] font-medium ${
              state === 'done'
                ? 'text-primary'
                : state === 'processing'
                  ? 'text-primary/80'
                  : 'text-muted-foreground/60'
            }`}
          >
            {state === 'done'
              ? stateLabels.done
              : state === 'processing'
                ? stateLabels.processing
                : stateLabels.waiting}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {step.tools.map((tool) => (
            <span
              key={tool}
              className="rounded border border-border/70 bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    </li>
  )
}

function ResultPreview({ gen }: { gen: GenerationState }) {
  const { t } = useI18n()
  const frames = gen.imageUrls ?? []
  return (
    <div className="animate-in fade-in duration-700">
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Check className="size-3.5" aria-hidden="true" />
          {t.studio.resultBadge}
        </span>
        <h3 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t.studio.resultTitle}
        </h3>
      </div>

      <div className={`grid gap-6 ${gen.aspectRatio === '16:9' ? 'lg:grid-cols-2' : 'lg:grid-cols-[1fr_340px]'}`}>
        <div className="space-y-6">
          {/* Script */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Type className="size-4 text-primary" aria-hidden="true" />
              {t.studio.scriptHeading}
            </h4>
            <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
              {gen.script}
            </pre>
          </div>

          {/* Storyboard */}
          {gen.storyboard && gen.storyboard.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <FileVideo className="size-4 text-primary" aria-hidden="true" />
                {t.studio.storyboardHeading}
              </h4>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {gen.storyboard.map((s, i) => (
                  <li key={i} className="overflow-hidden rounded-xl border border-border">
                    {frames[i] && (
                      // Blob-hosted generated frame; not statically known so use a plain img.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={frames[i] || '/placeholder.svg'}
                        alt={`${t.studio.sceneLabel}${i + 1}`}
                        className={`${gen.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'} w-full object-cover`}
                      />
                    )}
                    <div className="p-3">
                      <p className="text-xs font-medium text-primary">
                        {t.studio.sceneLabel}
                        {i + 1}
                      </p>
                      <p className="mt-1 text-sm text-foreground text-pretty">{s.scene}</p>
                      <p className="mt-1 text-xs text-muted-foreground text-pretty">
                        {t.studio.captionLabel}
                        {s.caption}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Voiceover */}
          {gen.audioUrl && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <Play className="size-4 text-primary" aria-hidden="true" />
                {t.studio.voiceoverHeading}
              </h4>
              <audio controls src={gen.audioUrl} className="mt-4 w-full">
                <track kind="captions" />
              </audio>
            </div>
          )}
        </div>

        {/* Video preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            {gen.videoUrl ? (
              <video
                controls
                playsInline
                poster={frames[0]}
                src={gen.videoUrl}
                className={`${gen.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'} h-auto w-full bg-black object-cover`}
              >
                <track kind="captions" />
              </video>
            ) : (
              <div className="flex aspect-[9/16] items-center justify-center bg-secondary">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs backdrop-blur">
              <span className="font-medium">product_ad_final.mp4</span>
              <span className="text-primary">9:16</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {['TikTok', 'Reels', 'Shorts'].map((p) => (
              <Button key={p} variant="outline" size="sm" className="text-xs">
                {p}
              </Button>
            ))}
          </div>
          <Button
            className="mt-3 w-full font-medium"
            nativeButton={false}
            render={
              gen.videoUrl ? (
                <a href={gen.videoUrl} download target="_blank" rel="noopener noreferrer" />
              ) : (
                <span />
              )
            }
            disabled={!gen.videoUrl}
          >
            {t.studio.exportButton}
          </Button>
        </div>
      </div>
    </div>
  )
}
