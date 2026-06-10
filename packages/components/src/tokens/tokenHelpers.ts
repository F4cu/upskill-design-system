import * as primitives from '@upskill/tokens/js/primitives'

type PrimitivesKey = keyof typeof primitives

export function hueColors(prefix: string, count = 12): Record<string, string> {
  return Object.fromEntries(
    Array.from({ length: count }, (_, i) => i + 1)
      .map(n => [String(n), primitives[`${prefix}${n}` as PrimitivesKey] as string])
      .filter(([, v]) => v != null)
  )
}
