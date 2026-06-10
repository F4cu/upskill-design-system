import type { Meta, StoryObj } from '@storybook/react-vite'
import * as primitives from '@upskill/tokens/js/primitives'

const meta: Meta = {
  title: 'Tokens/Showcase',
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
}

export default meta
type Story = StoryObj

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLOR_HUES = [
  { name: 'Terracotta', prefix: 'colorTerracotta' },
  { name: 'Cyan',       prefix: 'colorCyan' },
  { name: 'Teal',       prefix: 'colorTeal' },
  { name: 'Gold',       prefix: 'colorGold' },
  { name: 'Sand',       prefix: 'colorSand' },
  { name: 'Grey',       prefix: 'colorGrey' },
  { name: 'Amber',      prefix: 'colorAmber' },
]

type PrimitivesKey = keyof typeof primitives

function SwatchRow({ name, prefix }: { name: string; prefix: string }) {
  const steps = Array.from({ length: 12 }, (_, i) => i + 1)
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={labelStyle}>{name}</div>
      <div style={{ display: 'flex', gap: 2 }}>
        {steps.map((step) => {
          const key = `${prefix}${step}` as PrimitivesKey
          const color = primitives[key] as string
          return (
            <div
              key={step}
              title={`${key}: ${color}`}
              style={{ flex: 1, height: 32, backgroundColor: color, borderRadius: 2 }}
            />
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
        {steps.map((step) => (
          <div key={step} style={{ flex: 1, textAlign: 'center', fontSize: 9, fontFamily: 'monospace', color: '#999' }}>
            {step}
          </div>
        ))}
      </div>
    </div>
  )
}

function ColorSection() {
  return (
    <Section title="Colors">
      {COLOR_HUES.map((hue) => (
        <SwatchRow key={hue.prefix} {...hue} />
      ))}
      <div style={{ marginTop: '0.75rem' }}>
        <div style={labelStyle}>Black Alpha / White Alpha</div>
        <div style={{ display: 'flex', gap: 2 }}>
          {Array.from({ length: 12 }, (_, i) => {
            const step = i + 1
            const key = `colorBlackAlpha${step}` as PrimitivesKey
            return (
              <div
                key={step}
                title={`colorBlackAlpha${step}: ${primitives[key]}`}
                style={{ flex: 1, height: 32, backgroundColor: primitives[key] as string, borderRadius: 2, border: '1px solid #e5e5e5' }}
              />
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, fontFamily: 'monospace', color: '#999' }}>
              {i + 1}
            </div>
          ))}
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
            <div style={{ width: 80, fontSize: 11, fontFamily: 'monospace', color: '#888', textAlign: 'right', flexShrink: 0 }}>
              {key}
            </div>
            <div
              style={{
                backgroundColor: 'var(--ds-color-brand-9, #d15d50)',
                height: 16,
                width: value,
                minWidth: value === '0rem' ? 2 : undefined,
                borderRadius: 2,
              }}
            />
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#aaa' }}>{value}</div>
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
            <div style={{ width: 80, fontSize: 10, fontFamily: 'monospace', color: '#aaa', flexShrink: 0 }}>
              {key}<br />{size}
            </div>
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
            <div key={key} style={{ fontSize: 16, fontWeight: primitives[key] as number, lineHeight: 2 }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#aaa', fontWeight: 400 }}>{key} · {primitives[key]}</span>
              <br />
              The quick brown fox
            </div>
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
            <div key={key} style={{ textAlign: 'center' }}>
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
          )
        })}
      </div>
    </Section>
  )
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'monospace',
  color: '#888',
  marginBottom: 6,
  letterSpacing: '0.02em',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: '1.5rem', borderBottom: '1px solid var(--ds-color-neutral-3, #f1f0ef)' }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#444', marginBottom: '1.25rem' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

// ─── Story ────────────────────────────────────────────────────────────────────

function TokenShowcase() {
  return (
    <div style={{ fontFamily: 'var(--ds-font-family-body, "Open Sans", sans-serif)', maxWidth: 900, margin: '0 auto' }}>
      <ColorSection />
      <SpacingSection />
      <TypographySection />
      <BorderRadiusSection />
    </div>
  )
}

export const Default: Story = {
  name: 'Token Showcase',
  render: () => <TokenShowcase />,
}
