import { useState } from 'react'
import * as primitives from '@upskill/tokens/js/primitives'

type PrimitivesKey = keyof typeof primitives

// ─── Shared utilities ─────────────────────────────────────────────────────────

export function remToPx(rem: string): string {
  const num = parseFloat(rem)
  return isNaN(num) ? '' : `${Math.round(num * 16)}px`
}

export function CopyToken({ value, children }: { value: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const handleClick = () => {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <div
      onClick={handleClick}
      title={`${value} — click to copy`}
      style={{ cursor: 'pointer', position: 'relative', userSelect: 'none' }}
    >
      {children}
      {copied && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 3,
          color: '#fff', fontSize: 9, fontFamily: 'monospace',
          pointerEvents: 'none',
        }}>
          copied
        </div>
      )}
    </div>
  )
}

// ─── Typography ───────────────────────────────────────────────────────────────

const FONT_SIZE_STEPS: PrimitivesKey[] = [
  'fontSize1', 'fontSize2', 'fontSize3', 'fontSize4',
  'fontSize5', 'fontSize6', 'fontSize7', 'fontSize8',
  'fontSize9', 'fontSize10', 'fontSize11',
]

export function TypographyRamp() {
  return (
    <div>
      {FONT_SIZE_STEPS.map((key) => {
        const size = primitives[key] as string
        return (
          <div
            key={key}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 20,
              marginBottom: 12, paddingBottom: 12,
              borderBottom: '1px solid var(--ds-color-neutral-4, #e9e8e6)',
            }}
          >
            <CopyToken value={key}>
              <div style={{ width: 130, fontSize: 10, fontFamily: 'monospace', color: '#aaa', flexShrink: 0, padding: '2px 4px', borderRadius: 3 }}>
                {key}<br />
                {size}
                <span style={{ color: '#ccc', marginLeft: 4 }}>({remToPx(size)})</span>
              </div>
            </CopyToken>
            <div style={{ fontSize: size, lineHeight: 1.4, fontFamily: 'var(--ds-font-family-body, "Open Sans", sans-serif)' }}>
              The quick brown fox
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Border Radius ────────────────────────────────────────────────────────────

const BORDER_RADIUS_STEPS: { key: PrimitivesKey; label: string }[] = [
  { key: 'borderRadiusNull', label: 'null' },
  { key: 'borderRadiusXs',   label: 'xs' },
  { key: 'borderRadiusSm',   label: 'sm' },
  { key: 'borderRadiusMd',   label: 'md' },
  { key: 'borderRadiusLg',   label: 'lg' },
]

export function BorderRadiusGrid() {
  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      {BORDER_RADIUS_STEPS.map(({ key, label }) => {
        const value = primitives[key] as string
        return (
          <CopyToken key={key} value={key}>
            <div style={{ textAlign: 'center', padding: '4px 8px', borderRadius: 3 }}>
              <div style={{
                width: 64, height: 64,
                backgroundColor: 'var(--ds-color-brand-9, #d15d50)',
                borderRadius: value,
                marginBottom: 8,
              }} />
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#666' }}>{label}</div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#aaa' }}>{value}</div>
            </div>
          </CopyToken>
        )
      })}
    </div>
  )
}
