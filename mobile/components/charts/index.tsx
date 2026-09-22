import { View, Text } from 'react-native'
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'
import { useColorScheme } from 'nativewind'

// Chart primitives.
//
// The web versions (src/views/analytics/AnalyticsView.tsx) are inline SVG using
// framer-motion and Tailwind fill-/stroke- classes. react-native-svg supports
// neither, so colour is passed explicitly and the entry animation is dropped
// rather than faked.
//
// Colour decisions, made against the validator rather than by eye:
//
//   * Every chart here plots a SINGLE series named by its card title, so there
//     is no categorical scale, no legend and no hue cycling — one brand hue
//     throughout.
//   * The brand teal #14b8a6 measures only 2.43:1 against the light surface,
//     under the 3:1 needed for a graphical object, so light mode steps down the
//     same ramp to noor-600 and dark mode steps up to noor-400. Both pass. The
//     dark value is chosen for its own surface, not flipped from the light one.
//   * Axis labels wear the muted text token, never the series colour.

const SERIES_LIGHT = '#0d9488' // noor-600 — 3:1+ on #fcfcfc
const SERIES_DARK = '#2dd4bf' // noor-400 — 3:1+ on #030505

export function useSeriesColor(): string {
  const { colorScheme } = useColorScheme()
  return colorScheme === 'dark' ? SERIES_DARK : SERIES_LIGHT
}

// ─── Bar chart ───────────────────────────────────────────────────────────────

export function BarChart({
  data,
  height = 96,
}: {
  data: { label: string; value: number }[]
  height?: number
}) {
  const color = useSeriesColor()
  const max = Math.max(...data.map((d) => d.value), 1)

  // Percentage-space viewBox keeps the geometry independent of screen width.
  const W = 100
  const H = 40
  const slot = W / data.length
  // A 2px surface gap between adjacent bars, expressed in viewBox units.
  const gap = slot * 0.22
  const barW = slot - gap

  return (
    <View className="gap-1.5">
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          // Zero stays zero — a stub bar would imply activity that did not happen.
          const h = d.value > 0 ? Math.max((d.value / max) * (H - 2), 1.5) : 0
          if (h === 0) return null
          return (
            <Rect
              key={d.label + i}
              x={i * slot + gap / 2}
              y={H - h}
              width={barW}
              height={h}
              // Rounded data-end, anchored to the baseline.
              rx={Math.min(barW / 2, 1.2)}
              fill={color}
            />
          )
        })}
      </Svg>

      <View className="flex-row">
        {data.map((d, i) => (
          <Text
            key={d.label + i}
            className="text-[9px] text-muted-foreground"
            style={{ width: `${100 / data.length}%`, textAlign: 'center' }}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  )
}

// ─── Line chart ──────────────────────────────────────────────────────────────

export function LineChart({
  data,
  height = 96,
}: {
  data: { value: number }[]
  height?: number
}) {
  const color = useSeriesColor()

  if (data.length < 2) {
    return (
      <View style={{ height }} className="items-center justify-center">
        <Text className="text-[11px] text-muted-foreground">Not enough data yet</Text>
      </View>
    )
  }

  const W = 100
  const H = 40
  const max = Math.max(...data.map((d) => d.value), 1)
  const step = W / (data.length - 1)

  const points = data.map((d, i) => ({
    x: i * step,
    y: H - (d.value / max) * (H - 4) - 2,
  }))

  // Smooth with horizontal control points so the curve cannot overshoot into
  // implying values the data never had.
  const path = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]
    const cx = (prev.x + p.x) / 2
    return `${acc} C ${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`
  }, '')

  const area = `${path} L ${points[points.length - 1].x} ${H} L 0 ${H} Z`

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#areaFill)" />
      <Path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        // preserveAspectRatio="none" stretches x more than y, which would
        // otherwise thin the stroke inconsistently.
        vectorEffect="non-scaling-stroke"
      />
    </Svg>
  )
}
