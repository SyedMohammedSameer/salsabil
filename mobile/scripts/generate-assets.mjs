// Derives every native app asset from the single brand source image.
//
// Committed and re-runnable rather than a one-off, so replacing the logo means
// editing SOURCE and running `npm run assets` — not hand-exporting eight files
// and hoping the store requirements were remembered.
//
// Store requirements this encodes, each of which is a real rejection or a
// visibly broken icon if missed:
//
//   * The iOS marketing icon must be 1024x1024 with NO alpha channel. App Store
//     Connect rejects the build outright if it has one.
//   * iOS applies its own corner mask, so the artwork must be full-bleed square
//     with square corners. Pre-rounding it produces a double-rounded icon.
//   * An Android adaptive icon is masked to a shape chosen by the launcher, and
//     only the centre ~66% is guaranteed visible. The mark is scaled into that
//     safe zone, so no launcher shape can clip it.
//   * The monochrome layer (Android 13 themed icons) is a silhouette; the
//     system supplies the colour, so shape is all that survives.

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ASSETS = path.join(here, '..', 'assets')
const SOURCE = path.join(here, '..', '..', 'public', 'salsabil-original.png')

/** Sampled from the source art. The splash and adaptive background must match
 *  it exactly, or a seam shows where the mark's canvas meets the screen. */
const BRAND_BG = { r: 2, g: 55, b: 40 } // #023728

/** Distance in RGB space under which a pixel counts as background. The gold
 *  mark is nowhere near the dark green, so this is a wide, safe margin. */
const KEY_TOLERANCE = 70

/**
 * Replace the flat background with transparency.
 *
 * The source is a gold mark on a solid dark green field. Compositing it onto a
 * transparent canvas as-is would keep the green square, which an adaptive icon
 * would then show as a visible tile behind the mask.
 */
async function markOnTransparent(size) {
  const { data, info } = await sharp(SOURCE)
    .resize(size, size, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const out = Buffer.from(data)
  for (let i = 0; i < out.length; i += info.channels) {
    const dr = out[i] - BRAND_BG.r
    const dg = out[i + 1] - BRAND_BG.g
    const db = out[i + 2] - BRAND_BG.b
    if (Math.sqrt(dr * dr + dg * dg + db * db) < KEY_TOLERANCE) {
      out[i + 3] = 0
    }
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer()
}

/** Trim the transparent margin so the mark can be positioned precisely. */
async function trimmedMark(size) {
  return sharp(await markOnTransparent(size)).trim().png().toBuffer()
}

/** Place the mark centred on a transparent canvas, at `coverage` of its width. */
async function markInCanvas(canvas, coverage) {
  const target = Math.round(canvas * coverage)
  const mark = await sharp(await trimmedMark(1024))
    .resize(target, target, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  return sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toBuffer()
}

async function main() {
  await mkdir(ASSETS, { recursive: true })
  const wrote = []
  const write = async (name, buf) => {
    await sharp(buf).toFile(path.join(ASSETS, name))
    const meta = await sharp(buf).metadata()
    wrote.push(`${name.padEnd(30)} ${meta.width}x${meta.height}  alpha=${!!meta.hasAlpha}`)
  }

  // ─── iOS / primary icon ────────────────────────────────────────────────────
  // Flattened onto the brand background so no alpha channel survives.
  await write(
    'icon.png',
    await sharp(SOURCE)
      .resize(1024, 1024, { fit: 'cover' })
      .flatten({ background: BRAND_BG })
      .removeAlpha()
      .png()
      .toBuffer(),
  )

  // ─── Android adaptive ──────────────────────────────────────────────────────
  // 0.58 keeps the mark inside the 66% safe circle with a little breathing room,
  // so a circular, squircle or teardrop mask all clear it.
  await write('android-icon-foreground.png', await markInCanvas(1024, 0.58))

  await write(
    'android-icon-background.png',
    await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: BRAND_BG },
    })
      .png()
      .toBuffer(),
  )

  // Monochrome: the system tints this, so only the silhouette matters. Every
  // visible pixel is forced opaque white; transparency carries the shape.
  {
    const base = await markInCanvas(1024, 0.58)
    const { data, info } = await sharp(base).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const out = Buffer.from(data)
    for (let i = 0; i < out.length; i += info.channels) {
      if (out[i + 3] > 12) {
        out[i] = 255
        out[i + 1] = 255
        out[i + 2] = 255
        out[i + 3] = 255
      } else {
        out[i + 3] = 0
      }
    }
    await write(
      'android-icon-monochrome.png',
      await sharp(out, {
        raw: { width: info.width, height: info.height, channels: info.channels },
      })
        .png()
        .toBuffer(),
    )
  }

  // ─── Splash ────────────────────────────────────────────────────────────────
  // Transparent mark; the surrounding colour comes from app.config.ts, which is
  // what lets the same file serve the light and dark splash.
  await write('splash-icon.png', await markInCanvas(1024, 0.42))

  // ─── Web favicon (Expo web target) ─────────────────────────────────────────
  await write(
    'favicon.png',
    await sharp(SOURCE)
      .resize(48, 48, { fit: 'cover' })
      .flatten({ background: BRAND_BG })
      .png()
      .toBuffer(),
  )

  console.log('Generated from', path.relative(process.cwd(), SOURCE))
  for (const line of wrote) console.log('  ' + line)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
