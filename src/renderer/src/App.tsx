function App(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-surface-600 bg-surface-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            CS
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white">
              Cinematic Slideshow
            </h1>
            <p className="text-xs text-zinc-400">Professional video generator</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-full bg-surface-700 px-2 py-1">v0.1.0</span>
          <span className="rounded-full bg-surface-700 px-2 py-1 capitalize">
            {window.api?.platform ?? 'desktop'}
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-700 ring-1 ring-surface-600">
            <svg
              className="h-10 w-10 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-semibold text-white">
            Ready to build
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            Electron + React + TypeScript + Vite + Tailwind CSS scaffold is
            running. Features will be added incrementally across 12 commits.
          </p>
        </div>
      </main>

      <footer className="border-t border-surface-600 bg-surface-800 px-6 py-2 text-center text-xs text-zinc-500">
        Commit 1 of 12 — Project scaffold
      </footer>
    </div>
  )
}

export default App
