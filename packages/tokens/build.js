import StyleDictionary from 'style-dictionary'
import fs from 'fs'

fs.rmSync('dist', { recursive: true, force: true })

// Rename $root keys to root throughout the token tree and update alias references.
// $root is not a DTCG-reserved key but SD treats $ prefix specially, causing resolution failures.
function renameRoot(obj) {
  if (typeof obj !== 'object' || obj === null) return obj
  if (Array.isArray(obj)) return obj.map(renameRoot)
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      const newKey = k === '$root' ? 'root' : k
      if (newKey === '$value' && typeof v === 'string') {
        return [newKey, v.replace(/\.\$root\b/g, '.root')]
      }
      return [newKey, renameRoot(v)]
    })
  )
}

StyleDictionary.registerPreprocessor({
  name: 'upskill/rename-root',
  preprocessor: (tokens) => renameRoot(tokens),
})

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
    if (p[0] === 'layout' && p[1] !== 'headerLayout') return true
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

const shared = {
  usesDtcg: true,
  preprocessors: ['upskill/rename-root'],
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

// ── Light theme ────────────────────────────────────────────────
const lightSD = new StyleDictionary({
  ...shared,
  parsers: ['upskill/clean-theme'],
  source: ['src/primitives.json', 'src/theme/light.json'],
  platforms: {
    css: {
      transformGroup: 'upskill/css',
      prefix: 'ds',
      buildPath: 'dist/css/',
      files: [{
        destination: 'theme.light.css',
        format: 'css/variables',
        filter: (token) => token.filePath.includes('light'),
        options: { selector: ':root, [data-theme="light"]', outputReferences: false },
      }],
    },
  },
})

// ── Dark theme ─────────────────────────────────────────────────
const darkSD = new StyleDictionary({
  ...shared,
  parsers: ['upskill/clean-theme'],
  source: ['src/primitives.json', 'src/theme/dark.json'],
  platforms: {
    css: {
      transformGroup: 'upskill/css',
      prefix: 'ds',
      buildPath: 'dist/css/',
      files: [{
        destination: 'theme.dark.css',
        format: 'css/variables',
        filter: (token) => token.filePath.includes('dark'),
        options: { selector: '[data-theme="dark"]', outputReferences: false },
      }],
    },
  },
})

// ── Device tokens ──────────────────────────────────────────────
const deviceBuilds = ['desktop', 'tablet', 'mobile'].map(
  (device) =>
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
            format: 'css/variables',
            filter: (token) => token.filePath.includes(device),
            options: { selector: ':root', outputReferences: false },
          }],
        },
      },
    })
)

await primitivesSD.buildAllPlatforms()
await lightSD.buildAllPlatforms()
await darkSD.buildAllPlatforms()
for (const build of deviceBuilds) {
  await build.buildAllPlatforms()
}

console.log('\n✓ Token build complete → dist/css/ and dist/js/')
