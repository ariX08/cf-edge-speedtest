# Cloudflare Edge Speedtest

Ultra-accurate internet speed test powered by **Cloudflare’s official measurement engine** (`@cloudflare/speedtest`) running against the Cloudflare anycast edge network (330+ cities).

Matches the look & feel of the classic Ookla Speedtest (dark theme, big GO button, live gauge, Multi/Single, quality indicators) while using the same progressive-payload + 90th-percentile methodology as [speed.cloudflare.com](https://speed.cloudflare.com).

## Why this is accurate

- Uses the **exact same JS engine** that powers Cloudflare’s public speed test.
- Hits real Cloudflare edge PoPs (BGP anycast, not geo-IP).
- Progressive file sizes, 90th-percentile bandwidth, proper TTFB latency + jitter.
- Loaded latency measured during transfer.
- Official endpoints include precise `Server-Timing` headers.

## Quick start (frontend)

```bash
cd cf-speedtest
npm install
npm run dev
```

Open http://localhost:5173

## Deploy frontend to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name=cf-edge-speedtest
```

Or connect the GitHub repo to Cloudflare Pages for continuous deploys.

## Optional: self-hosted endpoints (Worker)

If you want full control / custom domain / no dependency on speed.cloudflare.com:

```bash
cd worker
npx wrangler deploy
```

Then in `src/App.tsx` change the SpeedTest constructor:

```ts
new SpeedTest({
  downloadApiUrl: 'https://your-worker.workers.dev/__down',
  uploadApiUrl: 'https://your-worker.workers.dev/__up',
})
```

### Rust version (maximum edge performance)

For the absolute fastest data generation on Workers, rewrite the Worker in Rust with `workers-rs`.  
The JS Worker above is already extremely close for I/O-bound streaming; Rust mainly helps if you add heavy computation.

## Tech stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- `@cloudflare/speedtest` (official engine)
- Lucide icons
- Optional Cloudflare Worker (JS or Rust)

## Notes

- Multi/Single currently only changes the UI toggle (the official engine manages concurrency internally).  
  You can extend it by customizing the `measurements` array if needed.
- Results are not sent to Cloudflare analytics unless you keep the default endpoints.
- Cap large downloads at 500 MB in the self-hosted Worker to stay friendly to the platform.

Built for accuracy first.
