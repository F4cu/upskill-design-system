import StyleDictionary from 'style-dictionary'
import fs from 'fs'
import { readdirSync } from 'fs'

const DEFAULT_BRAND = 'upskill'
const BRANDS = readdirSync('src/brands')
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', ''))

fs.rmSync('dist', { recursive: true, force: true })

// Theme files re-export border-radius tokens at the same path as primitives (Tokens Studio artifact).
// Stripping them before merge prevents circular self-references.
StyleDictionary.registerParser({
  name: 'upskill/clean-theme',
  pattern: /theme\/.+\.json$/,
  parser: ({ contents }) => {
    const tokens = JSON.parse(contents)
    delete tokens['border-radius']
    return tokens
  },
})

// Device files re-export font.weight tokens at the same path as primitives (Tokens Studio artifact).
StyleDictionary.registerParser({
  name: 'upskill/clean-device',
  pattern: /device\/.+\.json$/,
  parser: ({ contents }) => {
    const tokens = JSON.parse(contents)
    if (tokens.font) delete tokens.font.weight
    return tokens
  },
})

// Convert pixel number tokens to rem for dimension-like paths.
// Line-heights, grid columns, and screen-size are intentionally excluded (unitless).
StyleDictionary.registerTransform({
  name: 'upskill/number-to-rem',
  type: 'value',
  filter: (token) => {
    if (token.$type !== 'number') return false
    const p = token.path
    if (p[0] === 'space') return true
    if (p[0] === 'size') return true
    if (p[0] === 'font' && p[1] === 'size') return true
    if (p[0] === 'border-radius') return true
    if (p[0] === 'grid' && (p[1] === 'margin' || p[1] === 'gutter')) return true
    if (p[0] === 'layout') return true
    return false
  },
  transform: (token) => `${token.$value / 16}rem`,
})

StyleDictionary.registerTransform({
  name: 'upskill/font-weight',
  type: 'value',
  filter: (token) =>
    token.$type === 'string' && token.path.includes('weight'),
  transform: (token) => {
    const map = { Regular: '400', Medium: '500', SemiBold: '600', Bold: '700' }
    return map[token.$value] ?? token.$value
  },
})

StyleDictionary.registerTransformGroup({
  name: 'upskill/css',
  transforms: [
    ...StyleDictionary.hooks.transformGroups.css,
    'upskill/number-to-rem',
    'upskill/font-weight',
  ],
})

StyleDictionary.registerTransformGroup({
  name: 'upskill/js',
  transforms: [
    'attribute/cti',
    'name/camel',
    'color/css',
    'upskill/number-to-rem',
    'upskill/font-weight',
  ],
})

StyleDictionary.registerFormat({
  name: 'typescript/es6-declarations',
  format: ({ dictionary }) => {
    const lines = dictionary.allTokens.map(t => `export declare const ${t.name}: string;`)
    return '/**\n * Do not edit directly, this file was auto-generated.\n */\n\n' + lines.join('\n') + '\n'
  },
})

StyleDictionary.registerFormat({
  name: 'upskill/css-media-query',
  format: ({ dictionary, options }) => {
    const { mediaQuery } = options
    const vars = dictionary.allTokens
      .map(token => `    --${token.name}: ${token.$value};`)
      .join('\n')
    return [
      '/**',
      ' * Do not edit directly, this file was auto-generated.',
      ' */',
      '',
      `${mediaQuery} {`,
      '  :root {',
      vars,
      '  }',
      '}',
      '',
    ].join('\n')
  },
})

const shared = {
  usesDtcg: true,
  log: { warnings: 'error', verbosity: 'default' },
}

// ── Primitives ─────────────────────────────────────────────────
const primitivesSD = new StyleDictionary({
  ...shared,
  source: ['src/primitives.json'],
  platforms: {
    css: {
      transformGroup: 'upskill/css',
      prefix: 'ds',
      buildPath: 'dist/css/',
      files: [{
        destination: 'primitives.css',
        format: 'css/variables',
        options: { selector: ':root', outputReferences: false },
      }],
    },
    js: {
      transformGroup: 'upskill/js',
      buildPath: 'dist/js/',
      files: [
        {
          destination: 'primitives.js',
          format: 'javascript/es6',
        },
        {
          destination: 'primitives.d.ts',
          format: 'typescript/es6-declarations',
        },
      ],
    },
  },
})

// Brand and theme instances emit per-hop var() chains (outputReferences: true)
// with `include` + a filePath filter. SD v5 treats the filtered-out references
// as a warning ("filtered out token references"), so these instances must run
// warnings:'warn' — the two post-build gates below compensate.
const brandShared = { usesDtcg: true, log: { warnings: 'warn', verbosity: 'default' } }

// ── Brand layer ────────────────────────────────────────────────
const brandBuilds = BRANDS.map(brand => new StyleDictionary({
  ...brandShared,
  include: ['src/primitives.json'],
  source: [`src/brands/${brand}.json`],
  platforms: {
    css: {
      transformGroup: 'upskill/css',
      prefix: 'ds',
      buildPath: 'dist/css/',
      files: [{
        destination: `brand.${brand}.css`,
        format: 'css/variables',
        filter: (t) => t.filePath.includes(`brands/${brand}.json`),
        options: {
          selector: brand === DEFAULT_BRAND
            ? `:root, [data-brand="${brand}"]`
            : `[data-brand="${brand}"]`,
          outputReferences: true,
        },
      }],
    },
  },
}))

// ── Themes (shared, brand-agnostic) ────────────────────────────
const themeConfigs = { light: ':root, [data-theme="light"]', dark: '[data-theme="dark"]' }
const themeBuilds = Object.entries(themeConfigs).map(([mode, selector]) =>
  new StyleDictionary({
    ...brandShared,
    parsers: ['upskill/clean-theme'],
    include: ['src/primitives.json', `src/brands/${DEFAULT_BRAND}.json`],
    source: [`src/theme/${mode}.json`],
    platforms: {
      css: {
        transformGroup: 'upskill/css',
        prefix: 'ds',
        buildPath: 'dist/css/',
        files: [{
          destination: `theme.${mode}.css`,
          format: 'css/variables',
          filter: (t) => t.filePath.includes(`theme/${mode}.json`),
          options: { selector, outputReferences: true },
        }],
      },
    },
  })
)

// ── Device tokens ──────────────────────────────────────────────
const deviceConfigs = {
  desktop: {
    format: 'css/variables',
    options: { selector: ':root', outputReferences: false },
  },
  tablet: {
    format: 'upskill/css-media-query',
    options: { mediaQuery: '@media (max-width: 1439px)', outputReferences: false },
  },
  mobile: {
    format: 'upskill/css-media-query',
    options: { mediaQuery: '@media (max-width: 767px)', outputReferences: false },
  },
}

const deviceBuilds = Object.entries(deviceConfigs).map(
  ([device, { format, options }]) =>
    new StyleDictionary({
      ...shared,
      parsers: ['upskill/clean-device'],
      source: ['src/primitives.json', `src/device/${device}.json`],
      platforms: {
        css: {
          transformGroup: 'upskill/css',
          prefix: 'ds',
          buildPath: 'dist/css/',
          files: [{
            destination: `device.${device}.css`,
            format,
            filter: (token) => token.filePath.includes(device),
            options,
          }],
        },
      },
    })
)

await primitivesSD.buildAllPlatforms()
for (const build of brandBuilds) {
  await build.buildAllPlatforms()
}
for (const build of themeBuilds) {
  await build.buildAllPlatforms()
}
for (const build of deviceBuilds) {
  await build.buildAllPlatforms()
}

// Combine the three device files into a single device.css with media query blocks.
// desktop tokens go to :root, tablet and mobile are already wrapped in @media by their format.
const stripHeader = (css) => css.replace(/^\/\*\*[\s\S]*?\*\/\n\n/, '')
const desktop = fs.readFileSync('dist/css/device.desktop.css', 'utf8')
const tablet  = fs.readFileSync('dist/css/device.tablet.css', 'utf8')
const mobile  = fs.readFileSync('dist/css/device.mobile.css', 'utf8')
const combined = desktop.trimEnd() + '\n\n' + stripHeader(tablet).trimEnd() + '\n\n' + stripHeader(mobile)
fs.writeFileSync('dist/css/device.css', combined)

// ── Post-build gates ───────────────────────────────────────────
// These compensate for the warnings:'warn' downgrade on brand/theme instances.

// (a) Shape gate — every brand's leaf-path set must deep-equal the default brand's.
function leafPaths(obj, prefix = [], out = new Set()) {
  if (obj && typeof obj === 'object' && '$value' in obj) {
    out.add(prefix.join('.'))
    return out
  }
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      if (k.startsWith('$')) continue
      leafPaths(obj[k], [...prefix, k], out)
    }
  }
  return out
}
{
  const brandPaths = Object.fromEntries(
    BRANDS.map(b => [b, leafPaths(JSON.parse(fs.readFileSync(`src/brands/${b}.json`, 'utf8')))])
  )
  const ref = brandPaths[DEFAULT_BRAND]
  for (const b of BRANDS) {
    if (b === DEFAULT_BRAND) continue
    const set = brandPaths[b]
    const missing = [...ref].filter(p => !set.has(p))
    const extra = [...set].filter(p => !ref.has(p))
    if (missing.length || extra.length) {
      throw new Error(
        `Shape gate FAILED: brand '${b}' differs from '${DEFAULT_BRAND}'.` +
        (missing.length ? ` Missing: ${missing.join(', ')}.` : '') +
        (extra.length ? ` Extra: ${extra.join(', ')}.` : '')
      )
    }
  }
  console.log(`✓ Shape gate: ${BRANDS.length} brand(s) share an identical token shape.`)
}

// (b) No-inlined / no-dangling gate.
function parseVars(file) {
  const css = fs.readFileSync(`dist/css/${file}`, 'utf8')
  const map = {}
  const re = /(--ds-[\w-]+):\s*([^;]+);/g
  let m
  while ((m = re.exec(css)) !== null) map[m[1]] = m[2].trim()
  return map
}
function refsIn(value) {
  const out = []
  const re = /var\((--ds-[\w-]+)/g
  let m
  while ((m = re.exec(value)) !== null) out.push(m[1])
  return out
}
{
  const primitives = parseVars('primitives.css')
  const brandVars = Object.fromEntries(BRANDS.map(b => [b, parseVars(`brand.${b}.css`)]))
  const themeVars = { light: parseVars('theme.light.css'), dark: parseVars('theme.dark.css') }

  const primNames = new Set(Object.keys(primitives))
  // Intersection of all brand-defined names (a token any brand may resolve through).
  const brandDefSets = BRANDS.map(b => new Set(Object.keys(brandVars[b])))
  const brandIntersection = new Set(
    [...brandDefSets[0]].filter(n => brandDefSets.every(s => s.has(n)))
  )

  const varOnly = /^var\(--ds-[\w-]+\)(\s*,.*)?$/

  // No-inlined: every theme value must be a var() chain, never a raw color.
  for (const mode of ['light', 'dark']) {
    for (const [name, value] of Object.entries(themeVars[mode])) {
      if (!varOnly.test(value)) {
        throw new Error(
          `No-inlined gate FAILED: theme.${mode}.css ${name}: ${value} — SD inlined a value instead of a var() reference.`
        )
      }
    }
  }

  // No-dangling: every referenced var must be defined by its allowed set.
  for (const mode of ['light', 'dark']) {
    const selfNames = new Set(Object.keys(themeVars[mode]))
    for (const [name, value] of Object.entries(themeVars[mode])) {
      for (const ref of refsIn(value)) {
        if (primNames.has(ref) || brandIntersection.has(ref) || selfNames.has(ref)) continue
        throw new Error(
          `No-dangling gate FAILED: theme.${mode}.css ${name} references ${ref}, undefined in primitives ∪ brand-intersection ∪ self.`
        )
      }
    }
  }
  for (const b of BRANDS) {
    const selfNames = new Set(Object.keys(brandVars[b]))
    for (const [name, value] of Object.entries(brandVars[b])) {
      for (const ref of refsIn(value)) {
        if (primNames.has(ref) || selfNames.has(ref)) continue
        throw new Error(
          `No-dangling gate FAILED: brand.${b}.css ${name} references ${ref}, undefined in primitives ∪ self.`
        )
      }
    }
  }
  console.log('✓ No-inlined / no-dangling gate: theme output is fully referential and resolvable.')
}

console.log('\n✓ Token build complete → dist/css/ and dist/js/')
