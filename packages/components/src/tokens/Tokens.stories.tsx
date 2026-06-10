import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import * as primitives from '@upskill/tokens/js/primitives'

const meta: Meta = {
  title: 'Tokens',
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
}

export default meta
type Story = StoryObj

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PrimitivesKey = keyof typeof primitives

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'monospace',
  color: '#888',
  marginBottom: 6,
  letterSpacing: '0.02em',
}

function remToPx(rem: string): string {
  const num = parseFloat(rem)
  return isNaN(num) ? '' : `${Math.round(num * 16)}px`
}

function CopyToken({ value, children }: { value: string; children: React.ReactNode }) {
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#444', marginBottom: '1.25rem' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function StoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--ds-font-family-body, "Open Sans", sans-serif)', maxWidth: 900, margin: '0 auto' }}>
      {children}
    </div>
  )
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLOR_HUES: {
  name: string
  prefix: string
  darkPrefix?: string
  alphaPrefix?: string
}[] = [
  { name: 'Terracotta', prefix: 'colorTerracotta', darkPrefix: 'colorTerracottaDark', alphaPrefix: 'colorTerracottaAlpha' },
  { name: 'Cyan',       prefix: 'colorCyan' },
  { name: 'Teal',       prefix: 'colorTeal',       darkPrefix: 'colorTealDark' },
  { name: 'Gold',       prefix: 'colorGold',       darkPrefix: 'colorGoldDark' },
  { name: 'Sand',       prefix: 'colorSand',       darkPrefix: 'colorSandDark' },
  { name: 'Grey',       prefix: 'colorGrey',       darkPrefix: 'colorGreyDark' },
  { name: 'Amber',      prefix: 'colorAmber',      darkPrefix: 'colorAmberDark' },
]

function SwatchGrid({ prefix, border, invertText }: { prefix: string; border?: boolean; invertText?: boolean }) {
  const steps = Array.from({ length: 12 }, (_, i) => i + 1)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
      {steps.map((step) => {
        const key = `${prefix}${step}` as PrimitivesKey
        const color = primitives[key] as string
        return (
          <CopyToken key={step} value={key}>
            <div style={{ height: 40, backgroundColor: color, borderRadius: 3, border: border ? '1px solid #e5e5e5' : undefined }} />
            <div style={{ fontSize: 9, fontFamily: 'monospace', color: invertText ? '#ccc' : '#999', marginTop: 3 }}>{step}</div>
            <div style={{ fontSize: 9, fontFamily: 'monospace', color: invertText ? '#aaa' : '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{color}</div>
          </CopyToken>
        )
      })}
    </div>
  )
}

function HueGroup({ name, prefix, darkPrefix, alphaPrefix }: {
  name: string
  prefix: string
  darkPrefix?: string
  alphaPrefix?: string
}) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={labelStyle}>{name}</div>
      <SwatchGrid prefix={prefix} />
      {darkPrefix && (
        <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: '2px solid #e5e5e5' }}>
          <div style={{ ...labelStyle, color: '#bbb', fontSize: 10, marginBottom: 4 }}>↳ Dark</div>
          <SwatchGrid prefix={darkPrefix} />
        </div>
      )}
      {alphaPrefix && (
        <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: '2px solid #e5e5e5' }}>
          <div style={{ ...labelStyle, color: '#bbb', fontSize: 10, marginBottom: 4 }}>↳ Alpha</div>
          <SwatchGrid prefix={alphaPrefix} border />
        </div>
      )}
    </div>
  )
}

function ColorSection() {
  return (
    <Section title="Colors">
      {COLOR_HUES.map((hue) => (
        <HueGroup key={hue.prefix} {...hue} />
      ))}
      <div style={{ marginBottom: '1rem' }}>
        <div style={labelStyle}>Black / White Alpha</div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ ...labelStyle, color: '#bbb', fontSize: 10, marginBottom: 4 }}>Black Alpha</div>
          <SwatchGrid prefix="colorBlackAlpha" border />
        </div>
        <div>
          <div style={{ ...labelStyle, color: '#bbb', fontSize: 10, marginBottom: 4 }}>White Alpha</div>
          <div style={{ background: '#1a1a1a', padding: '6px 4px', borderRadius: 4 }}>
            <SwatchGrid prefix="colorWhiteAlpha" invertText />
          </div>
        </div>
      </div>
    </Section>
  )
}

// ─── Spacing ──────────────────────────────────────────────────────────────────

const SPACE_STEPS: PrimitivesKey[] = [
  'space000', 'space050', 'space100', 'space150',
  'space200', 'space250', 'space300', 'space400',
  'space500', 'space600', 'space700', 'space800',
]

function SpacingSection() {
  return (
    <Section title="Spacing Scale">
      {SPACE_STEPS.map((key) => {
        const value = primitives[key] as string
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <CopyToken value={key}>
              <div style={{ width: 80, fontSize: 11, fontFamily: 'monospace', color: '#888', textAlign: 'right', padding: '2px 4px', borderRadius: 3 }}>
                {key}
              </div>
            </CopyToken>
            <div
              style={{
                backgroundColor: 'var(--ds-color-brand-9, #d15d50)',
                height: 16,
                width: value,
                minWidth: value === '0rem' ? 2 : undefined,
                borderRadius: 2,
              }}
            />
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#888' }}>
              {value}
              <span style={{ color: '#bbb', marginLeft: 6 }}>({remToPx(value)})</span>
            </div>
          </div>
        )
      })}
    </Section>
  )
}

// ─── Typography ───────────────────────────────────────────────────────────────

const FONT_SIZE_STEPS: PrimitivesKey[] = [
  'fontSize1', 'fontSize2', 'fontSize3', 'fontSize4',
  'fontSize5', 'fontSize6', 'fontSize7', 'fontSize8',
  'fontSize9', 'fontSize10', 'fontSize11',
]

function TypographySection() {
  return (
    <Section title="Typography — Font Size Ramp">
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
            <div style={{ fontSize: size, lineHeight: 1.4 }}>
              The quick brown fox
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: '1rem' }}>
        <div style={labelStyle}>Font Weights</div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {(['fontWeightRegular', 'fontWeightMedium', 'fontWeightSemibold', 'fontWeightBold'] as PrimitivesKey[]).map((key) => (
            <CopyToken key={key} value={key}>
              <div style={{ fontSize: 16, fontWeight: primitives[key] as number, lineHeight: 2, padding: '2px 4px', borderRadius: 3 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#aaa', fontWeight: 400 }}>{key} · {primitives[key]}</span>
                <br />
                The quick brown fox
              </div>
            </CopyToken>
          ))}
        </div>
      </div>
    </Section>
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

function BorderRadiusSection() {
  return (
    <Section title="Border Radius">
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {BORDER_RADIUS_STEPS.map(({ key, label }) => {
          const value = primitives[key] as string
          return (
            <CopyToken key={key} value={key}>
              <div style={{ textAlign: 'center', padding: '4px 8px', borderRadius: 3 }}>
                <div
                  style={{
                    width: 64, height: 64,
                    backgroundColor: 'var(--ds-color-brand-9, #d15d50)',
                    borderRadius: value,
                    marginBottom: 8,
                  }}
                />
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#666' }}>{label}</div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#aaa' }}>{value}</div>
              </div>
            </CopyToken>
          )
        })}
      </div>
    </Section>
  )
}

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => <StoryLayout><ColorSection /></StoryLayout>,
}

export const Spacing: Story = {
  render: () => <StoryLayout><SpacingSection /></StoryLayout>,
}

export const Typography: Story = {
  render: () => <StoryLayout><TypographySection /></StoryLayout>,
}

export const BorderRadius: Story = {
  name: 'Border Radius',
  render: () => <StoryLayout><BorderRadiusSection /></StoryLayout>,
}
