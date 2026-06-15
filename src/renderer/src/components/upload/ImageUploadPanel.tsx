import { useCallback, useState } from 'react'
import { useImageUpload } from '@renderer/hooks/useImageUpload'
import { useProjectStore } from '@renderer/stores/projectStore'
import { getEffect } from '@renderer/lib/effects'
import { getTransition } from '@renderer/lib/transitions'

export function ImageUploadPanel(): React.JSX.Element {
  const images = useProjectStore((s) => s.images)
  const removeImage = useProjectStore((s) => s.removeImage)
  const reorderImages = useProjectStore((s) => s.reorderImages)
  const randomizeEffects = useProjectStore((s) => s.randomizeEffects)
  const { browseImages, handleDrop } = useImageUpload()
  const [dragOver, setDragOver] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

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

  const onDragStart = (index: number) => setDragIndex(index)

  const onDragOverItem = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) {
      reorderImages(dragIndex, index)
      setDragIndex(index)
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Images</h2>
          <p className="text-sm text-zinc-400">
            {images.length} image{images.length !== 1 ? 's' : ''} loaded
          </p>
        </div>
        <div className="flex gap-2">
          {images.length > 0 && (
            <button
              type="button"
              onClick={randomizeEffects}
              className="rounded-lg bg-surface-700 px-3 py-2 text-sm text-zinc-300 hover:bg-surface-600"
            >
              Re-randomize Effects
            </button>
          )}
          <button
            type="button"
            onClick={browseImages}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Browse Images
          </button>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mb-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          dragOver
            ? 'border-accent bg-accent/10'
            : 'border-surface-600 bg-surface-800/50'
        }`}
      >
        <svg className="mb-3 h-10 w-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm font-medium text-zinc-300">Drag & drop images here</p>
        <p className="mt-1 text-xs text-zinc-500">JPG, JPEG, PNG, WEBP — hundreds supported</p>
      </div>

      {images.length > 0 && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {images.map((img, index) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragOver={(e) => onDragOverItem(e, index)}
                onDragEnd={() => setDragIndex(null)}
                className="group relative cursor-grab overflow-hidden rounded-lg bg-surface-800 ring-1 ring-surface-600 active:cursor-grabbing"
              >
                <img
                  src={img.thumbnailUrl}
                  alt={img.fileName}
                  className="aspect-square w-full object-cover"
                  draggable={false}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="truncate text-xs text-white">{img.fileName}</p>
                  {img.effectId && (
                    <p className="truncate text-[10px] text-zinc-400">
                      {getEffect(img.effectId).name}
                    </p>
                  )}
                  {img.transitionId && index < images.length - 1 && (
                    <p className="truncate text-[10px] text-accent-hover/80">
                      → {getTransition(img.transitionId).name}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
