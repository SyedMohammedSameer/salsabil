import type { Handler, HandlerEvent } from '@netlify/functions'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

interface AladhanTimings {
  Fajr: string
  Sunrise: string
  Dhuhr: string
  Asr: string
  Sunset: string
  Maghrib: string
  Isha: string
  Midnight: string
  [key: string]: string
}

interface AladhanResponse {
  code: number
  status: string
  data: {
    timings: AladhanTimings
    date: { readable: string; timestamp: string; hijri: { date: string; month: { en: string } } }
    meta: { latitude: number; longitude: number; timezone: string }
  }
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' }
  }

  const params = event.queryStringParameters ?? {}
  const { lat, lng, method = '2', date } = params

  if (!lat || !lng) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ error: 'lat and lng query params are required' }),
    }
  }

  const dateParam = date ?? new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
  const url = `https://api.aladhan.com/v1/timings/${dateParam}?latitude=${lat}&longitude=${lng}&method=${method}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Aladhan returned ${res.status}`)

    const json = (await res.json()) as AladhanResponse

    // Normalize to our prayer names
    const { timings, date: dateInfo } = json.data
    const prayers = {
      fajr: timings.Fajr,
      sunrise: timings.Sunrise,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
    }

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'max-age=3600' },
      body: JSON.stringify({
        prayers,
        hijri: dateInfo.hijri,
        gregorian: dateInfo.readable,
      }),
    }
  } catch (err) {
    console.error('Prayer times error:', err)
    return {
      statusCode: 502,
      headers: cors,
      body: JSON.stringify({ error: 'Could not fetch prayer times' }),
    }
  }
}
