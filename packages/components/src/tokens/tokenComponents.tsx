import { useState } from 'react'
import * as primitives from '@upskill/tokens/js/primitives'
import { hueColors } from './tokenHelpers'
import styles from './tokenComponents.module.css'

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
      className={styles.copyToken}
    >
      {children}
      {copied && <div className={styles.copyOverlay}>copied</div>}
    </div>
  )
}

// ─── Typography Tables ────────────────────────────────────────────────────────

const FONT_SIZE_STEPS: { key: PrimitivesKey; dotPath: string }[] = [
  { key: 'fontSize1',  dotPath: 'font.size.1'  },
  { key: 'fontSize2',  dotPath: 'font.size.2'  },
  { key: 'fontSize3',  dotPath: 'font.size.3'  },
  { key: 'fontSize4',  dotPath: 'font.size.4'  },
  { key: 'fontSize5',  dotPath: 'font.size.5'  },
  { key: 'fontSize6',  dotPath: 'font.size.6'  },
  { key: 'fontSize7',  dotPath: 'font.size.7'  },
  { key: 'fontSize8',  dotPath: 'font.size.8'  },
  { key: 'fontSize9',  dotPath: 'font.size.9'  },
  { key: 'fontSize10', dotPath: 'font.size.10' },
  { key: 'fontSize11', dotPath: 'font.size.11' },
]

export function FontSizeTable() {
  return (
    <table className={`${styles.colorScaleTable} sb-unstyled`}>
      <thead>
        <tr>
          <th>Token</th>
          <th>Preview</th>
          <th>Rem</th>
          <th>Px</th>
        </tr>
      </thead>
      <tbody>
        {FONT_SIZE_STEPS.map(({ key, dotPath }) => {
          const value = primitives[key] as string
          return (
            <tr key={key}>
              <td><code className="css-18ueaqc">{dotPath}</code></td>
              <td className={styles.typographyPreview} style={{ fontSize: value }}>The quick brown fox</td>
              <td className={styles.spacingMonoCell}>{value}</td>
              <td className={styles.spacingMonoCell}>{remToPx(value)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const FONT_WEIGHT_STEPS: { key: PrimitivesKey; dotPath: string }[] = [
  { key: 'fontWeightRegular',  dotPath: 'font.weight.regular'  },
  { key: 'fontWeightMedium',   dotPath: 'font.weight.medium'   },
  { key: 'fontWeightSemibold', dotPath: 'font.weight.semibold' },
  { key: 'fontWeightBold',     dotPath: 'font.weight.bold'     },
]

export function FontWeightTable() {
  return (
    <table className={`${styles.colorScaleTable} sb-unstyled`}>
      <thead>
        <tr>
          <th>Token</th>
          <th>Preview</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {FONT_WEIGHT_STEPS.map(({ key, dotPath }) => {
          const value = primitives[key] as string
          return (
            <tr key={key}>
              <td><code className="css-18ueaqc">{dotPath}</code></td>
              <td className={styles.typographyPreview} style={{ fontWeight: value }}>The quick brown fox jumps over the lazy dog</td>
              <td className={styles.spacingMonoCell}>{value}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const LINE_HEIGHT_STEPS: { key: PrimitivesKey; dotPath: string; usage: string }[] = [
  { key: 'fontLineHeightNone',    dotPath: 'font.line-height.none',    usage: 'Display / hero headings' },
  { key: 'fontLineHeightTight',   dotPath: 'font.line-height.tight',   usage: 'Large headings' },
  { key: 'fontLineHeightDefault', dotPath: 'font.line-height.default', usage: 'Subheadings, UI labels' },
  { key: 'fontLineHeightRelaxed', dotPath: 'font.line-height.relaxed', usage: 'Body copy (default)' },
  { key: 'fontLineHeightLoose',   dotPath: 'font.line-height.loose',   usage: 'Small print, captions' },
]

export function LineHeightTable() {
  return (
    <table className={`${styles.colorScaleTable} sb-unstyled`}>
      <thead>
        <tr>
          <th>Token</th>
          <th>Value</th>
          <th>Typical use</th>
        </tr>
      </thead>
      <tbody>
        {LINE_HEIGHT_STEPS.map(({ key, dotPath, usage }) => {
          const value = primitives[key]
          return (
            <tr key={key}>
              <td><code className="css-18ueaqc">{dotPath}</code></td>
              <td className={styles.spacingMonoCell}>{String(value)}</td>
              <td>{usage}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
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
    <div className={styles.borderRadiusGrid}>
      {BORDER_RADIUS_STEPS.map(({ key, label }) => {
        const value = primitives[key] as string
        return (
          <CopyToken key={key} value={key}>
            <div className={styles.borderRadiusItem}>
              <div className={styles.borderRadiusSwatch} style={{ borderRadius: value }} />
              <div className={styles.borderRadiusLabel}>{label}</div>
              <div className={styles.borderRadiusValue}>{value}</div>
            </div>
          </CopyToken>
        )
      })}
    </div>
  )
}

// ─── Color Palette Tables ─────────────────────────────────────────────────────

export function ColorScaleTable({
  title, prefix, basePath, stepPrefix,
}: {
  title: string
  prefix: string
  basePath: string
  stepPrefix?: string
}) {
  const entries = Object.entries(hueColors(prefix))
  const tokenName = (step: string) =>
    stepPrefix ? `${basePath}.${stepPrefix}.${step}` : `${basePath}.${step}`

  return (
    <div>
      <div className={styles.colorScaleTitle}>{title}</div>
      <table className={`${styles.colorScaleTable} sb-unstyled`}>
        <thead>
          <tr>
            <th>Token</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([step, hex]) => (
            <tr key={step}>
              <td><code className="css-18ueaqc">{tokenName(step)}</code></td>
              <td>
                <div className={styles.colorSwatchWrapper}>
                  <span className={styles.colorSwatch} style={{ backgroundColor: hex as string }} />
                  <span className={styles.colorHex}>{hex as string}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ColorScaleGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.colorScaleGroup}>
      {children}
    </div>
  )
}

// ─── Semantic Spacing ─────────────────────────────────────────────────────────

type SemanticSpacingStep = {
  token: string
  desktop: string
  tablet: string
  mobile: string
}

const INLINE_STEPS: SemanticSpacingStep[] = [
  { token: 'space.inline.xs',  desktop: '0.25rem', tablet: '0.25rem', mobile: '0.25rem' },
  { token: 'space.inline.sm',  desktop: '0.5rem',  tablet: '0.5rem',  mobile: '0.5rem'  },
  { token: 'space.inline.md',  desktop: '1rem',    tablet: '1rem',    mobile: '1rem'    },
  { token: 'space.inline.lg',  desktop: '1.5rem',  tablet: '1.5rem',  mobile: '1.5rem'  },
  { token: 'space.inline.xl',  desktop: '2rem',    tablet: '2rem',    mobile: '2rem'    },
  { token: 'space.inline.xxl', desktop: '3rem',    tablet: '3rem',    mobile: '3rem'    },
]

const STACK_STEPS: SemanticSpacingStep[] = [
  { token: 'space.stack.xs',  desktop: '0.25rem', tablet: '0.25rem', mobile: '0.25rem' },
  { token: 'space.stack.sm',  desktop: '0.5rem',  tablet: '0.5rem',  mobile: '0.5rem'  },
  { token: 'space.stack.md',  desktop: '1rem',    tablet: '1rem',    mobile: '0.75rem' },
  { token: 'space.stack.lg',  desktop: '1.5rem',  tablet: '1.5rem',  mobile: '1.5rem'  },
  { token: 'space.stack.xl',  desktop: '2rem',    tablet: '1.5rem',  mobile: '1rem'    },
  { token: 'space.stack.xxl', desktop: '2.5rem',  tablet: '2.5rem',  mobile: '2.5rem'  },
]

const INSET_STEPS: SemanticSpacingStep[] = [
  { token: 'space.inset.xxs',  desktop: '0.25rem', tablet: '0.25rem', mobile: '0.25rem' },
  { token: 'space.inset.xs',   desktop: '0.5rem',  tablet: '0.5rem',  mobile: '0.5rem'  },
  { token: 'space.inset.sm',   desktop: '0.75rem', tablet: '0.75rem', mobile: '0.75rem' },
  { token: 'space.inset.md',   desktop: '1rem',    tablet: '1rem',    mobile: '1rem'    },
  { token: 'space.inset.lg',   desktop: '1.25rem', tablet: '1.25rem', mobile: '1.25rem' },
  { token: 'space.inset.xl',   desktop: '1.5rem',  tablet: '1.5rem',  mobile: '1rem'    },
  { token: 'space.inset.xxl',  desktop: '2rem',    tablet: '1.5rem',  mobile: '1rem'    },
  { token: 'space.inset.xxxl', desktop: '3rem',    tablet: '1.5rem',  mobile: '1rem'    },
]

const SEMANTIC_STEPS = { inline: INLINE_STEPS, stack: STACK_STEPS, inset: INSET_STEPS }

function SemanticPreview({ category, value }: { category: 'inline' | 'stack' | 'inset'; value: string }) {
  if (category === 'inset') {
    return (
      <div className={styles.semanticPreviewInset} style={{ padding: value }}>
        <div className={styles.semanticPreviewFill} />
      </div>
    )
  }
  if (category === 'inline') {
    return (
      <div className={styles.semanticPreviewInline} style={{ paddingRight: value }}>
        <div className={styles.semanticPreviewFillInline} />
      </div>
    )
  }
  return (
    <div className={styles.semanticPreviewStack} style={{ paddingBottom: value }}>
      <div className={styles.semanticPreviewFillStack} />
    </div>
  )
}

export function SemanticSpacingTable({ category }: { category: 'inline' | 'stack' | 'inset' }) {
  const steps = SEMANTIC_STEPS[category]
  return (
    <table className={`${styles.colorScaleTable} sb-unstyled`}>
      <thead>
        <tr>
          <th>Token</th>
          <th>Preview</th>
          <th>Desktop</th>
          <th>Tablet</th>
          <th>Mobile</th>
        </tr>
      </thead>
      <tbody>
        {steps.map(({ token, desktop, tablet, mobile }) => (
          <tr key={token}>
            <td><code className="css-18ueaqc">{token}</code></td>
            <td><SemanticPreview category={category} value={desktop} /></td>
            <td className={styles.spacingMonoCell}>{desktop}</td>
            <td className={`${styles.spacingMonoCell} ${tablet !== desktop ? styles.semanticChanged : styles.semanticSame}`}>
              {tablet}
            </td>
            <td className={`${styles.spacingMonoCell} ${mobile !== desktop ? styles.semanticChanged : styles.semanticSame}`}>
              {mobile}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Spacing Table ────────────────────────────────────────────────────────────

const SPACE_STEPS: { key: PrimitivesKey; dotPath: string }[] = [
  { key: 'space000', dotPath: 'space.000' },
  { key: 'space050', dotPath: 'space.050' },
  { key: 'space100', dotPath: 'space.100' },
  { key: 'space150', dotPath: 'space.150' },
  { key: 'space200', dotPath: 'space.200' },
  { key: 'space250', dotPath: 'space.250' },
  { key: 'space300', dotPath: 'space.300' },
  { key: 'space400', dotPath: 'space.400' },
  { key: 'space500', dotPath: 'space.500' },
  { key: 'space600', dotPath: 'space.600' },
  { key: 'space700', dotPath: 'space.700' },
  { key: 'space800', dotPath: 'space.800' },
]

export function SpacingTable() {
  return (
    <table className={`${styles.colorScaleTable} sb-unstyled`}>
      <thead>
        <tr>
          <th>Token</th>
          <th>Preview</th>
          <th>Rem</th>
          <th>Px</th>
        </tr>
      </thead>
      <tbody>
        {SPACE_STEPS.map(({ key, dotPath }) => {
          const value = primitives[key] as string
          return (
            <tr key={key}>
              <td><code className="css-18ueaqc">{dotPath}</code></td>
              <td><div className={styles.spacingPreviewBar} style={{ width: value }} /></td>
              <td className={styles.spacingMonoCell}>{value}</td>
              <td className={styles.spacingMonoCell}>{remToPx(value)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
