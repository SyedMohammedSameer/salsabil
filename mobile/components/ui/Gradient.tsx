import { useState, type ReactNode } from 'react'
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg'

// Gradient surfaces without a native module.
//
// expo-linear-gradient would need a new dev-client build before it could be
// used, and the app is iterating over a hot-reloading JS bundle. react-native-svg
// is already compiled into the binary, so a gradient is drawn as an absolutely
// positioned SVG behind the children instead. Visually identical, and it stays
// pure JS.

export interface GradientProps extends ViewProps {
  /** Two or more colours, top-left to bottom-right by default. */
  colors: readonly string[]
  /** 0..1 start/end points. Defaults to a diagonal like Tailwind's `to-br`. */
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  /** Corner radius applied to the gradient layer; keep in sync with the container. */
  radius?: number
  /** Soft decorative circles, as on the web's hero surfaces. */
  orbs?: boolean
  /** A faint dot grid over the gradient, as on the web's header. */
  dots?: boolean
  children?: ReactNode
}

export function Gradient({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  radius = 0,
  orbs = false,
  dots = false,
  children,
  style,
  onLayout,
  ...rest
}: GradientProps) {
  // A unique id per colour set so two gradients on one screen never share defs.
  const id = `g-${colors.join('').replace(/[^a-z0-9]/gi, '')}`
  const step = colors.length > 1 ? 1 / (colors.length - 1) : 1

  // The SVG is sized in pixels from the container's measured layout, never
  // with "100%". On Android react-native-svg resolves percentages once, at
  // the first layout, so a container that grows afterwards (content that
  // loads, text that wraps) was left with a gradient covering only part of
  // it. Measuring keeps the layer exactly the size of the box, always.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const measure = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }))
    onLayout?.(e)
  }

  return (
    <View style={[{ overflow: 'hidden', borderRadius: radius }, style]} onLayout={measure} {...rest}>
      {size ? (
        <Svg
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0 }}
          width={size.w}
          height={size.h}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id={id} x1={start.x} y1={start.y} x2={end.x} y2={end.y}>
              {colors.map((c, i) => (
                <Stop key={c + i} offset={`${Math.round(i * step * 100)}%`} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={100} fill={`url(#${id})`} />
          {orbs ? (
            <>
              <Circle cx={88} cy={12} r={38} fill="#ffffff" fillOpacity={0.08} />
              <Circle cx={8} cy={96} r={30} fill="#ffffff" fillOpacity={0.06} />
              <Circle cx={70} cy={80} r={14} fill="#ffffff" fillOpacity={0.05} />
            </>
          ) : null}
        </Svg>
      ) : null}
      {size && dots ? (
        // A second layer in real pixels, so the dots stay round.
        <Svg pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0 }} width={size.w} height={size.h}>
          <Defs>
            <Pattern id="gradient-dots" width={14} height={14} patternUnits="userSpaceOnUse">
              <Circle cx={1} cy={1} r={1} fill="#ffffff" fillOpacity={0.07} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill="url(#gradient-dots)" />
        </Svg>
      ) : null}
      {children}
    </View>
  )
}

/** The brand hero surface: noor teal into the deep brand green of the icon. */
export const HERO_GRADIENT = ['#0d9488', '#0f766e', '#023728'] as const
/** Noor's orb, matching the web's `from-noor-400 to-noor-600`. */
export const NOOR_GRADIENT = ['#2dd4bf', '#0d9488'] as const
