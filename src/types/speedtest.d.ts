declare module '@cloudflare/speedtest' {
  export interface Summary {
    download?: number
    upload?: number
    latency?: number
    jitter?: number
    downLoadedLatency?: number
    upLoadedLatency?: number
    downLoadedJitter?: number
    upLoadedJitter?: number
    packetLoss?: number
  }

  export interface Results {
    getSummary(): Summary
  }

  export interface SpeedTestConfig {
    autoStart?: boolean
    downloadApiUrl?: string
    uploadApiUrl?: string
    measurements?: any[]
    measureDownloadLoadedLatency?: boolean
    measureUploadLoadedLatency?: boolean
  }

  export default class SpeedTest {
    constructor(config?: SpeedTestConfig)
    results: Results
    isRunning: boolean
    isFinished: boolean
    play(): void
    pause(): void
    restart(): void
    onRunningChange?: (running: boolean) => void
    onResultsChange?: (info: { type: string }) => void
    onFinish?: (results: Results) => void
    onError?: (error: string) => void
  }
}
