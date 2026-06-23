import { useCallback, useState } from 'react'
import type { Scene } from '@renderer/types'
import {
  fitClipsToSceneDuration,
  formatMinutesSeconds,
  getSceneSpanSeconds,
  parseMinutesSeconds,
  splitMinutesSeconds
} from '@shared/lib/duration'
import { useSceneMediaUpload } from '@renderer/hooks/useSceneMediaUpload'
import { useProjectStore } from '@renderer/stores/projectStore'
import { useUiStore } from '@renderer/stores/uiStore'

function formatSpanLabel(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

interface TimeFieldsProps {
  label: string
  totalSeconds: number
  disabled?: boolean
  onChange: (seconds: number) => void
}

function TimeFields({ label, totalSeconds, disabled, onChange }: TimeFieldsProps): React.JSX.Element {
  const { minutes, seconds } = splitMinutesSeconds(totalSeconds)

  const update = (m: number, s: number): void => {
    onChange(parseMinutesSeconds(m, s))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 text-xs text-zinc-500">{label}</span>
      <input
        type="number"
        min={0}
        disabled={disabled}
        value={minutes}
        onChange={(e) => update(parseInt(e.target.value, 10) || 0, seconds)}
        className="w-14 rounded-lg border border-surface-600 bg-surface-700 px-2 py-1 text-center text-sm text-white disabled:opacity-50"
      />
      <span className="text-xs text-zinc-500">min</span>
      <input
        type="number"
        min={0}
        max={59}
        disabled={disabled}
        value={seconds}
        onChange={(e) => update(minutes, parseInt(e.target.value, 10) || 0)}
        className="w-14 rounded-lg border border-surface-600 bg-surface-700 px-2 py-1 text-center text-sm text-white disabled:opacity-50"
      />
      <span className="text-xs text-zinc-500">sec</span>
      <span className="text-xs text-zinc-600">({formatMinutesSeconds(totalSeconds)})</span>
    </div>
  )
}

interface SceneCardProps {
  scene: Scene
  sceneIndex: number
  scenes: Scene[]
  endTimeSeconds: number
  transitionSeconds: number
}

function SceneCard({
  scene,
  sceneIndex,
  scenes,
  endTimeSeconds,
  transitionSeconds
}: SceneCardProps): React.JSX.Element {
  const setSceneName = useProjectStore((s) => s.setSceneName)
  const setSceneStartTime = useProjectStore((s) => s.setSceneStartTime)
  const removeMediaFromScene = useProjectStore((s) => s.removeMediaFromScene)
  const imageThumbMin = useUiStore((s) => s.imageThumbMin)

  const {
    browseMedia,
    handleDrop,
    onFileInputChange,
    fileInputRef,
    mediaAccept,
    error,
    clearError,
    isLoading
  } = useSceneMediaUpload(scene.id)
  const [dragOver, setDragOver] = useState(false)

  const span = getSceneSpanSeconds(sceneIndex, scenes, endTimeSeconds)
  const perClip =
    scene.media.length > 0
      ? fitClipsToSceneDuration(scene.media.length, span, transitionSeconds)
      : 0

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        await handleDrop(e.dataTransfer.files)
      }
    },
    [handleDrop]
  )

  return (
    <div className="rounded-xl bg-surface-800 p-4 ring-1 ring-surface-600">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={scene.name}
          onChange={(e) => setSceneName(scene.id, e.target.value)}
          className="min-w-[120px] flex-1 rounded-lg border border-surface-600 bg-surface-700 px-3 py-1.5 text-sm font-semibold text-white"
        />
        <button
          type="button"
          onClick={browseMedia}
          disabled={isLoading}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {isLoading ? 'Loading…' : 'Load images or videos'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={mediaAccept}
          className="hidden"
          onChange={onFileInputChange}
        />
      </div>

      <TimeFields
        label="Start"
        totalSeconds={scene.startTimeSeconds}
        disabled={sceneIndex === 0}
        onChange={(seconds) => setSceneStartTime(sceneIndex, seconds)}
      />

      <p className="mt-2 text-xs text-zinc-500">
        Duration: {formatSpanLabel(span)}
        {scene.media.length > 0 && (
          <>
            {' '}
            · {scene.media.length} clip{scene.media.length !== 1 ? 's' : ''} · {perClip.toFixed(1)}s each
          </>
        )}
        {scene.media.length === 0 && span > 0 && ' · Load media for this scene'}
      </p>

      {error && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <span>{error}</span>
          <button type="button" onClick={clearError} className="ml-2 text-red-300 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mt-3 rounded-lg border-2 border-dashed px-3 py-3 transition-colors ${
          dragOver ? 'border-accent bg-accent/10' : 'border-surface-600 bg-surface-900/50'
        }`}
      >
        {scene.media.length === 0 ? (
          <p className="text-center text-xs text-zinc-500">Drop images or videos here</p>
        ) : (
          <div
            className="grid max-h-40 gap-2 overflow-y-auto"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${Math.min(imageThumbMin, 80)}px, 1fr))`
            }}
          >
            {scene.media.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-lg bg-surface-900 ring-1 ring-surface-600"
                title={item.fileName}
              >
                <img
                  src={item.thumbnailUrl}
                  alt={item.fileName}
                  className="aspect-square w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeMediaFromScene(scene.id, item.id)}
                  className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1 text-[10px] text-white opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
                <p className="truncate px-1 py-0.5 text-[9px] text-zinc-400">
                  {item.mediaType === 'video' ? 'VID' : 'IMG'} · {item.baseName}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function validateScenes(
  scenes: Scene[],
  endTimeSeconds: number
): string[] {
  const issues: string[] = []
  for (let i = 1; i < scenes.length; i++) {
    if (scenes[i].startTimeSeconds <= scenes[i - 1].startTimeSeconds) {
      issues.push(
        `"${scenes[i].name}" must start after "${scenes[i - 1].name}" (${formatMinutesSeconds(scenes[i - 1].startTimeSeconds)})`
      )
    }
  }
  const lastStart = scenes[scenes.length - 1]?.startTimeSeconds ?? 0
  if (endTimeSeconds <= lastStart) {
    issues.push(`End time must be after the last scene start (${formatMinutesSeconds(lastStart)})`)
  }
  for (const scene of scenes) {
    if (scene.media.length === 0) {
      issues.push(`"${scene.name}" has no media loaded`)
    }
  }
  return issues
}

export function ScenesModePanel(): React.JSX.Element {
  const scenesConfig = useProjectStore((s) => s.scenesConfig)
  const transitionSeconds = useProjectStore((s) => s.transitionSeconds)
  const setSceneCount = useProjectStore((s) => s.setSceneCount)
  const setScenesEndTime = useProjectStore((s) => s.setScenesEndTime)
  const clips = useProjectStore((s) => s.clips)

  const [countInput, setCountInput] = useState(scenesConfig?.scenes.length ?? 1)

  const applyCount = (): void => {
    setSceneCount(countInput)
  }

  if (!scenesConfig) {
    return (
      <div className="flex h-full flex-col p-4">
        <h2 className="mb-1 text-lg font-semibold text-white">Scenes</h2>
        <p className="mb-4 text-sm text-zinc-400">
          Divide your slideshow into named scenes with start timestamps. Images and videos in each
          scene are timed equally within that scene&apos;s span.
        </p>
        <section className="max-w-md rounded-xl bg-surface-800 p-4 ring-1 ring-surface-600">
          <label className="mb-2 block text-sm font-medium text-white">How many scenes?</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={20}
              value={countInput}
              onChange={(e) => setCountInput(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
              className="w-20 rounded-lg border border-surface-600 bg-surface-700 px-2 py-1.5 text-center text-white"
            />
            <button
              type="button"
              onClick={applyCount}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Create scenes
            </button>
          </div>
        </section>
      </div>
    )
  }

  const issues = validateScenes(scenesConfig.scenes, scenesConfig.endTimeSeconds)

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Scenes</h2>
          <p className="text-sm text-zinc-400">
            {scenesConfig.scenes.length} scene{scenesConfig.scenes.length !== 1 ? 's' : ''}
            {clips.length > 0 && ` · ${clips.length} clips on timeline`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Scenes</label>
          <input
            type="number"
            min={1}
            max={20}
            value={countInput}
            onChange={(e) => setCountInput(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
            onBlur={applyCount}
            className="w-14 rounded-lg border border-surface-600 bg-surface-700 px-2 py-1 text-center text-sm text-white"
          />
        </div>
      </div>

      <section className="mb-3 shrink-0 rounded-xl bg-surface-800 p-4 ring-1 ring-surface-600">
        <h3 className="mb-2 text-sm font-semibold text-white">Last scene end time</h3>
        <TimeFields
          label="End"
          totalSeconds={scenesConfig.endTimeSeconds}
          onChange={setScenesEndTime}
        />
        <p className="mt-2 text-xs text-zinc-500">
          Total length: {formatMinutesSeconds(scenesConfig.endTimeSeconds)} (
          {formatSpanLabel(scenesConfig.endTimeSeconds)})
        </p>
      </section>

      {issues.length > 0 && (
        <div className="mb-3 shrink-0 rounded-lg bg-amber-500/10 px-4 py-3 text-xs text-amber-300 ring-1 ring-amber-500/30">
          <ul className="list-inside list-disc space-y-1">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
        {scenesConfig.scenes.map((scene, index) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            sceneIndex={index}
            scenes={scenesConfig.scenes}
            endTimeSeconds={scenesConfig.endTimeSeconds}
            transitionSeconds={transitionSeconds}
          />
        ))}
      </div>
    </div>
  )
}
