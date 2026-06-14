import { useState } from 'react'
import * as primitives from '@upskill/tokens/js/primitives'
import { hueColors } from './tokenHelpers'
import styles from './tokenComponents.module.css'
import desktopRaw from '../../../tokens/src/device/desktop.json'
import tabletRaw from '../../../tokens/src/device/tablet.json'
import mobileRaw from '../../../tokens/src/device/mobile.json'

type PrimitivesKey = keyof typeof primitives
type DeviceJSON = Record<string, unknown>

const desktopTokens = desktopRaw as DeviceJSON
const tabletTokens = tabletRaw as DeviceJSON
const mobileTokens = mobileRaw as DeviceJSON

// Navigate a nested object using a dot-path string.
function navJSON(obj: unknown, dotPath: string): unknown {
  return dotPath.split('.').reduce(
    (node: unknown, key: string) => (node as Record<string, unknown>)?.[key],
    obj
  )
}

// Resolve a DTCG alias like '{space.050}' to its built rem value via primitives.
function resolveDeviceAlias(alias: unknown): string {
  if (typeof alias === 'number') return `${alias / 16}rem`
  if (typeof alias !== 'string') return ''
  if (!alias.startsWith('{')) return alias
  const jsKey = alias.slice(1, -1).split('.').map((seg, i) =>
    i === 0 ? seg : seg.charAt(0).toUpperCase() + seg.slice(1)
  ).join('') as PrimitivesKey
  return (primitives[jsKey] as string) ?? alias
}

// Get a device token's resolved rem value, falling back to desktop if the
// breakpoint-specific file doesn't define it.
function deviceVal(device: unknown, dotPath: string): string {
  const node = navJSON(device, dotPath) ?? navJSON(desktopTokens, dotPath)
  return resolveDeviceAlias((node as { $value?: unknown })?.$value)
}

function toCSSVar(dotPath: string): string {
  return `var(--ds-${dotPath.replace(/\./g, '-')})`
}

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

// ─── Font Family Grid ─────────────────────────────────────────────────────────

const FONT_FAMILY_STEPS: { key: PrimitivesKey; dotPath: string; role: string }[] = [
  { key: 'fontFontFamilyPlayfairDisplay', dotPath: 'font.font-family.Playfair Display', role: 'Headline / Display' },
  { key: 'fontFontFamilyRoboto',          dotPath: 'font.font-family.Roboto',           role: 'Body / UI' },
]

export function FontFamilyGrid() {
  return (
    <div className={styles.fontFamilyGrid}>
      {FONT_FAMILY_STEPS.map(({ key, dotPath, role }) => {
        const value = primitives[key] as string
        return (
          <div key={key} className={styles.fontFamilyCard}>
            <div className={styles.fontFamilyPreviewLarge} style={{ fontFamily: `'${value}', sans-serif` }}>
              Aa
            </div>
            <div className={styles.fontFamilySample} style={{ fontFamily: `'${value}', sans-serif` }}>
              The quick brown fox jumps over the lazy dog
            </div>
            <div className={styles.fontFamilyMeta}>
              <span className={styles.fontFamilyName}>{value}</span>
              <span className={styles.fontFamilyRole}>{role}</span>
              <code className={styles.tokenCode}>{dotPath}</code>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Typescale Table ─────────────────────────────────────────────────────────

const FONT_SIZE_MAP: Record<string, string> = {
  'font.size.1':  primitives.fontSize1  as string,
  'font.size.2':  primitives.fontSize2  as string,
  'font.size.3':  primitives.fontSize3  as string,
  'font.size.4':  primitives.fontSize4  as string,
  'font.size.5':  primitives.fontSize5  as string,
  'font.size.6':  primitives.fontSize6  as string,
  'font.size.7':  primitives.fontSize7  as string,
  'font.size.8':  primitives.fontSize8  as string,
  'font.size.9':  primitives.fontSize9  as string,
  'font.size.10': primitives.fontSize10 as string,
  'font.size.11': primitives.fontSize11 as string,
}

type TypescaleRow = {
  label: string
  fontFamily: string
  fontFamilyLabel: string
  fontWeight: number
  fontWeightLabel: string
  desktop: string
  tablet: string
  mobile: string
}

// Extract the primitive font-size token name (e.g. 'font.size.8') that a
// device tier assigns to the given semantic size key (e.g. 'header').
function deviceFontSizeToken(device: unknown, key: string): string {
  const node = navJSON(device, `font.size.${key}`) as { $value?: string } | undefined
  const alias = node?.$value ?? ''
  return alias.startsWith('{') ? alias.slice(1, -1) : ''
}

const TYPESCALE_CONFIG: {
  key: string; label: string; fontFamily: string; fontFamilyLabel: string
  fontWeight: number; fontWeightLabel: string
}[] = [
  { key: 'body-small',    label: 'Body Small',    fontFamily: "'Roboto', sans-serif",      fontFamilyLabel: 'Roboto',           fontWeight: 400, fontWeightLabel: 'Regular'  },
  { key: 'body-default',  label: 'Body Default',  fontFamily: "'Roboto', sans-serif",      fontFamilyLabel: 'Roboto',           fontWeight: 400, fontWeightLabel: 'Regular'  },
  { key: 'title-small',   label: 'Title Small',   fontFamily: "'Roboto', sans-serif",      fontFamilyLabel: 'Roboto',           fontWeight: 500, fontWeightLabel: 'Medium'   },
  { key: 'subheader',     label: 'Subheader',     fontFamily: "'Roboto', sans-serif",      fontFamilyLabel: 'Roboto',           fontWeight: 600, fontWeightLabel: 'Semibold' },
  { key: 'header',        label: 'Header',        fontFamily: "'Roboto', sans-serif",      fontFamilyLabel: 'Roboto',           fontWeight: 700, fontWeightLabel: 'Bold'     },
  { key: 'header-styled', label: 'Header Styled', fontFamily: "'Playfair Display', serif", fontFamilyLabel: 'Playfair Display', fontWeight: 500, fontWeightLabel: 'Medium'   },
  { key: 'display',       label: 'Display',       fontFamily: "'Playfair Display', serif", fontFamilyLabel: 'Playfair Display', fontWeight: 500, fontWeightLabel: 'Medium'   },
]

const TYPESCALE_ROWS: TypescaleRow[] = TYPESCALE_CONFIG.map(({ key, ...rest }) => {
  const desktopToken = deviceFontSizeToken(desktopTokens, key)
  return {
    ...rest,
    desktop: desktopToken,
    tablet:  deviceFontSizeToken(tabletTokens, key) || desktopToken,
    mobile:  deviceFontSizeToken(mobileTokens, key) || desktopToken,
  }
})

function TypescaleSizeCell({ token, state }: { token: string; state: 'normal' | 'dimmed' | 'changed' }) {
  const value = FONT_SIZE_MAP[token]
  const cls = state === 'dimmed' ? styles.typescaleSizeDimmed
            : state === 'changed' ? styles.typescaleSizeChanged
            : styles.typescaleSize
  return (
    <div className={cls}>
      <code className={styles.tokenCode}>{token}</code>
      <span className={styles.typescaleSizeValue}> / {remToPx(value)}</span>
    </div>
  )
}

export function TypescaleTable() {
  return (
    <table className={`${styles.colorScaleTable} sb-unstyled`}>
      <thead>
        <tr>
          <th>Preview</th>
          <th>Font</th>
          <th>Desktop</th>
          <th>Tablet</th>
          <th>Mobile</th>
        </tr>
      </thead>
      <tbody>
        {TYPESCALE_ROWS.map(({ label, fontFamily, fontFamilyLabel, fontWeight, fontWeightLabel, desktop, tablet, mobile }) => {
          const desktopValue = FONT_SIZE_MAP[desktop]
          return (
            <tr key={label}>
              <td>
                <div
                  className={styles.typescalePreview}
                  style={{ fontFamily, fontWeight, fontSize: desktopValue, lineHeight: 1.2 }}
                >
                  {label}
                </div>
              </td>
              <td>
                <div className={styles.typescaleFont}>
                  <span className={styles.typescaleFontName}>{fontFamilyLabel}</span>
                  <span className={styles.typescaleFontWeight}>{fontWeightLabel}</span>
                </div>
              </td>
              <td><TypescaleSizeCell token={desktop} state="normal" /></td>
              <td><TypescaleSizeCell token={tablet}  state={tablet === desktop ? 'dimmed' : 'changed'} /></td>
              <td><TypescaleSizeCell token={mobile}  state={mobile === desktop ? 'dimmed' : 'changed'} /></td>
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
              <td><code className={styles.tokenCode}>{dotPath}</code></td>
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
              <td><code className={styles.tokenCode}>{dotPath}</code></td>
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
              <td><code className={styles.tokenCode}>{tokenName(step)}</code></td>
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

export function TintGroupRow({ title, prefix }: { title: string; prefix: string }) {
  const colors = hueColors(prefix)
  const steps = Array.from({ length: 12 }, (_, i) => String(i + 1))

  return (
    <div className={styles.tintGroupRow}>
      <div className={styles.tintGroupRowLabel}>{title}</div>
      <div className={styles.tintGroupMain}>
        <div className={styles.tintGroupSolidsArea}>
          <div className={styles.tintGroupSolidsEmpty} />
          <div className={styles.tintGroupSolidsLabel}>Solids</div>
          <div className={styles.tintGroupSolidsEmpty} />
        </div>
        <div className={styles.tintGroupNumbers}>
          {steps.map(step => (
            <div key={step} className={styles.tintGroupStepNumber}>
              {step.padStart(2, '0')}
            </div>
          ))}
        </div>
        <div className={styles.tintGroupSwatchRow}>
          {steps.map(step => (
            <div
              key={step}
              className={styles.tintGroupSwatch}
              style={{ backgroundColor: colors[step] as string }}
            />
          ))}
        </div>
        <div className={styles.tintGroupCategories}>
          <div className={styles.tintGroupCategoryBg}>Backgrounds</div>
          <div className={styles.tintGroupCategoryBorder}>Borders</div>
          <div className={styles.tintGroupCategoryHighContrast}>High contrast text</div>
        </div>
      </div>
    </div>
  )
}

export function ColorPaletteRow({ label, prefix }: { label: string; prefix: string }) {
  const colors = hueColors(prefix)
  const steps = Array.from({ length: 12 }, (_, i) => String(i + 1))

  return (
    <div className={styles.colorPaletteRow}>
      <div className={styles.colorPaletteRowLabel}>{label}</div>
      <div className={styles.colorPaletteSwatches}>
        {steps.map(step => (
          <div
            key={step}
            className={styles.colorPaletteSwatch}
            style={{ backgroundColor: colors[step] as string }}
          />
        ))}
      </div>
    </div>
  )
}

export function ColorPaletteGroup({ children }: { children: React.ReactNode }) {
  return <div className={styles.colorPaletteGroup}>{children}</div>
}

// ─── Semantic Spacing ─────────────────────────────────────────────────────────

type SemanticSpacingStep = {
  token: string
  cssVar: string
  desktop: string
  tablet: string
  mobile: string
}

function makeSpacingSteps(category: string, keys: string[]): SemanticSpacingStep[] {
  return keys.map(key => {
    const token = `space.${category}.${key}`
    return {
      token,
      cssVar: toCSSVar(token),
      desktop: deviceVal(desktopTokens, token),
      tablet:  deviceVal(tabletTokens,  token),
      mobile:  deviceVal(mobileTokens,  token),
    }
  })
}

const INLINE_STEPS = makeSpacingSteps('inline', ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'])
const STACK_STEPS  = makeSpacingSteps('stack',  ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'])
const INSET_STEPS  = makeSpacingSteps('inset',  ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'])

const SEMANTIC_STEPS = { inline: INLINE_STEPS, stack: STACK_STEPS, inset: INSET_STEPS }

function SemanticPreview({ category, cssVar }: { category: 'inline' | 'stack' | 'inset'; cssVar: string }) {
  if (category === 'inset') {
    return (
      <div className={styles.semanticPreviewInset} style={{ padding: cssVar }}>
        <div className={styles.semanticPreviewFill} />
      </div>
    )
  }
  if (category === 'inline') {
    return (
      <div className={styles.semanticPreviewInline} style={{ paddingRight: cssVar }}>
        <div className={styles.semanticPreviewFillInline} />
      </div>
    )
  }
  return (
    <div className={styles.semanticPreviewStack} style={{ paddingBottom: cssVar }}>
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
        {steps.map(({ token, cssVar, desktop, tablet, mobile }) => (
          <tr key={token}>
            <td><code className={styles.tokenCode}>{token}</code></td>
            <td><SemanticPreview category={category} cssVar={cssVar} /></td>
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
              <td><code className={styles.tokenCode}>{dotPath}</code></td>
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
