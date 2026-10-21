/**
 * Optional self-hosted Cloudflare Worker endpoints.
 * Deploy this separately if you want full control / branding.
 * Then point the frontend downloadApiUrl / uploadApiUrl to it.
 *
 * Accuracy note: Official speed.cloudflare.com endpoints include
 * precise Server-Timing headers. This Worker is extremely close
 * for bandwidth; latency may be 1-3 ms higher.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS for browser tests
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'no-store',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    // Download: stream zeros as fast as possible
    if (path === '/__down' || path === '/down') {
      let bytes = parseInt(url.searchParams.get('bytes') || '0', 10)
      if (isNaN(bytes) || bytes < 0) bytes = 0
      // Cap at 500 MB to protect the edge
      bytes = Math.min(bytes, 500 * 1024 * 1024)

      if (bytes === 0) {
        return new Response(null, {
          status: 200,
          headers: { ...cors, 'Content-Length': '0' },
        })
      }

      const CHUNK = 64 * 1024 // 64 KB
      const stream = new ReadableStream({
        start(controller) {
          let remaining = bytes
          const chunk = new Uint8Array(CHUNK)

          function push() {
            while (remaining > 0) {
              const size = Math.min(CHUNK, remaining)
              controller.enqueue(chunk.subarray(0, size))
              remaining -= size
              // Yield occasionally so the runtime can flush
              if (remaining > 0 && remaining % (CHUNK * 16) === 0) {
                queueMicrotask(push)
                return
              }
            }
            controller.close()
          }
          push()
        },
      })

      return new Response(stream, {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(bytes),
        },
      })
    }

    // Upload: drain body as fast as possible
    if (path === '/__up' || path === '/up') {
      // Consume the body without buffering the whole thing if possible
      try {
        await request.arrayBuffer()
      } catch (_) {}
      return new Response(null, {
        status: 200,
        headers: cors,
      })
    }

    // Meta – useful for the frontend
    if (path === '/meta' || path === '/') {
      const cf = request.cf || {}
      return Response.json(
        {
          clientIp: request.headers.get('CF-Connecting-IP'),
          colo: cf.colo,
          country: cf.country,
          city: cf.city,
          asOrganization: cf.asOrganization,
          latitude: cf.latitude,
          longitude: cf.longitude,
          httpProtocol: cf.httpProtocol,
          tlsVersion: cf.tlsVersion,
        },
        { headers: cors }
      )
    }

    return new Response('Cloudflare Edge Speed Test Worker\nUse /__down?bytes=N and /__up', {
      status: 200,
      headers: { ...cors, 'Content-Type': 'text/plain' },
    })
  },
}
