import { useState, useRef, useEffect, useCallback } from 'react'
import SpeedTest from '@cloudflare/speedtest'
import {
  Download,
  Upload,
  Activity,
  Wifi,
  Server,
  Settings,
  Play,
  RotateCcw,
  Gauge
} from 'lucide-react'

type Phase = 'idle' | 'running' | 'finished'
type ConnMode = 'multi' | 'single'

interface Results {
  download: number | null
  upload: number | null
  latency: number | null
  jitter: number | null
  downLoadedLatency?: number | null
  upLoadedLatency?: number | null
}

function formatMbps(bps: number | null | undefined) {
  if (bps == null || isNaN(bps)) return '—'
  return (bps / 1_000_000).toFixed(2)
}

function formatMs(ms: number | null | undefined) {
  if (ms == null || isNaN(ms)) return '—'
  return Math.round(ms).toString()
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [results, setResults] = useState<Results>({
    download: null,
    upload: null,
    latency: null,
    jitter: null,
  })
  const [liveSpeed, setLiveSpeed] = useState(0)
  const [liveDirection, setLiveDirection] = useState<'download' | 'upload' | null>(null)
  const [connMode, setConnMode] = useState<ConnMode>('multi')
  const [meta, setMeta] = useState<{
    ip?: string
    colo?: string
    city?: string
    isp?: string
    country?: string
  }>({})
  const engineRef = useRef<SpeedTest | null>(null)
  const [progress, setProgress] = useState(0)

  // Fetch Cloudflare edge meta on load
  useEffect(() => {
    fetch('https://speed.cloudflare.com/meta')
      .then((r) => r.json())
      .then((d) => {
        setMeta({
          ip: d.clientIp || d.ip,
          colo: d.colo,
          city: d.city || d.colo,
          isp: d.asOrganization || d.isp,
          country: d.country,
        })
      })
      .catch(() => {
        // fallback
        fetch('https://1.1.1.1/cdn-cgi/trace')
          .then((r) => r.text())
          .then((t) => {
            const lines = Object.fromEntries(
              t
                .trim()
                .split('\n')
                .map((l) => l.split('='))
            )
            setMeta({
              ip: lines.ip,
              colo: lines.colo,
              country: lines.loc,
            })
          })
          .catch(() => {})
      })
  }, [])

  const startTest = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause()
    }

    setPhase('running')
    setResults({ download: null, upload: null, latency: null, jitter: null })
    setLiveSpeed(0)
    setLiveDirection(null)
    setProgress(0)

    const engine = new SpeedTest({
      autoStart: true,
      // Official endpoints – most accurate
      // To use your own Worker, change to your domain + /__down and /__up
      // downloadApiUrl: 'https://your-worker.workers.dev/__down',
      // uploadApiUrl: 'https://your-worker.workers.dev/__up',
    })

    engineRef.current = engine

    engine.onRunningChange = (running) => {
      if (!running && engine.isFinished) {
        setPhase('finished')
      }
    }

    engine.onResultsChange = ({ type }) => {
      const summary = engine.results.getSummary()
      setResults({
        download: summary.download ?? null,
        upload: summary.upload ?? null,
        latency: summary.latency ?? null,
        jitter: summary.jitter ?? null,
        downLoadedLatency: summary.downLoadedLatency,
        upLoadedLatency: summary.upLoadedLatency,
      })

      if (type === 'download') {
        setLiveDirection('download')
        if (summary.download) setLiveSpeed(summary.download / 1e6)
      } else if (type === 'upload') {
        setLiveDirection('upload')
        if (summary.upload) setLiveSpeed(summary.upload / 1e6)
      }

      setProgress((p) => Math.min(p + 8, 95))
    }

    engine.onFinish = (res) => {
      const summary = res.getSummary()
      setResults({
        download: summary.download ?? null,
        upload: summary.upload ?? null,
        latency: summary.latency ?? null,
        jitter: summary.jitter ?? null,
        downLoadedLatency: summary.downLoadedLatency,
        upLoadedLatency: summary.upLoadedLatency,
      })
      setLiveDirection(null)
      setLiveSpeed(0)
      setProgress(100)
      setPhase('finished')
    }

    engine.onError = (err) => {
      console.error(err)
      setPhase('idle')
    }
  }, [])

  const restart = () => {
    engineRef.current?.restart()
    startTest()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-lg">EDGE SPEEDTEST</span>
          <span className="text-xs text-cyan-400/80 font-medium px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20">
            Cloudflare
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/60">
          <button className="hover:text-white transition flex items-center gap-1.5">
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 relative">
        <div className="relative mb-10">
          <div
            className={`w-56 h-56 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
              phase === 'running'
                ? 'border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.25)]'
                : phase === 'finished'
                ? 'border-emerald-400/60'
                : 'border-white/20 hover:border-cyan-400/60'
            }`}
          >
            {phase === 'running' && (
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(from -90deg, #22d3ee ${progress}%, transparent ${progress}%)`,
                  mask: 'radial-gradient(transparent 62%, black 63%)',
                  WebkitMask: 'radial-gradient(transparent 62%, black 63%)',
                }}
              />
            )}

            {phase === 'idle' && (
              <button
                onClick={startTest}
                className="w-full h-full rounded-full flex flex-col items-center justify-center gap-1 group cursor-pointer"
              >
                <span className="text-5xl font-light tracking-widest group-hover:scale-105 transition-transform">
                  GO
                </span>
                <span className="text-xs text-white/40 mt-1">Start Test</span>
              </button>
            )}

            {phase === 'running' && (
              <div className="flex flex-col items-center">
                <div className="text-4xl font-mono font-medium tabular-nums">
                  {liveSpeed > 0 ? liveSpeed.toFixed(1) : '…'}
                </div>
                <div className="text-sm text-white/50 mt-1 uppercase tracking-wider">
                  {liveDirection === 'download' ? 'Download' : liveDirection === 'upload' ? 'Upload' : 'Connecting'}
                </div>
                <div className="text-xs text-cyan-400/70 mt-0.5">Mbps</div>
              </div>
            )}

            {phase === 'finished' && (
              <div className="flex flex-col items-center gap-1">
                <Play className="w-8 h-8 text-emerald-400 mb-1" />
                <span className="text-sm text-white/60">Done</span>
                <button
                  onClick={restart}
                  className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Test again
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-12 w-full max-w-2xl">
          <Metric
            icon={<Download className="w-4 h-4 text-cyan-400" />}
            label="Download"
            value={formatMbps(results.download)}
            unit="Mbps"
          />
          <Metric
            icon={<Upload className="w-4 h-4 text-fuchsia-400" />}
            label="Upload"
            value={formatMbps(results.upload)}
            unit="Mbps"
          />
          <Metric
            icon={<Activity className="w-4 h-4 text-amber-400" />}
            label="Ping"
            value={formatMs(results.latency)}
            unit="ms"
          />
          <Metric
            icon={<Wifi className="w-4 h-4 text-emerald-400" />}
            label="Jitter"
            value={formatMs(results.jitter)}
            unit="ms"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-8 text-sm text-white/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="text-white/90 font-medium">{meta.isp || 'Cloudflare Edge'}</div>
              <div className="text-xs">
                {meta.colo ? `${meta.colo}` : '—'}
                {meta.city ? ` · ${meta.city}` : ''}
                {meta.country ? ` · ${meta.country}` : ''}
              </div>
              <div className="text-xs text-white/40 font-mono">{meta.ip || 'detecting…'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-white/40">Connections</span>
            <div className="flex rounded-full bg-white/5 p-0.5 border border-white/10">
              <button
                onClick={() => setConnMode('multi')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                  connMode === 'multi' ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/50 hover:text-white'
                }`}
              >
                Multi
              </button>
              <button
                onClick={() => setConnMode('single')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                  connMode === 'single' ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/50 hover:text-white'
                }`}
              >
                Single
              </button>
            </div>
          </div>
        </div>

        {phase === 'finished' && results.download != null && (
          <div className="mt-12 flex flex-wrap justify-center gap-4 text-xs">
            <QualityPill label="Browsing" good={(results.download ?? 0) > 10e6} />
            <QualityPill label="Gaming" good={(results.latency ?? 999) < 40 && (results.jitter ?? 999) < 10} />
            <QualityPill label="Streaming" good={(results.download ?? 0) > 25e6} />
            <QualityPill label="Video Calls" good={(results.upload ?? 0) > 3e6 && (results.latency ?? 999) < 80} />
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-xs text-white/30 border-t border-white/5">
        Powered by Cloudflare Edge · Official measurement engine · Results use 90th percentile
      </footer>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-1.5 text-white/50 mb-1">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-3xl font-light tabular-nums tracking-tight">
        {value}
        <span className="text-sm text-white/40 ml-1">{unit}</span>
      </div>
    </div>
  )
}

function QualityPill({ label, good }: { label: string; good: boolean }) {
  return (
    <div
      className={`px-3 py-1.5 rounded-full border text-xs font-medium ${
        good
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          : 'border-white/10 bg-white/5 text-white/40'
      }`}
    >
      {label} {good ? '✓' : '—'}
    </div>
  )
}
