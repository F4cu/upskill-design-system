import { useId } from 'react'
import { Text, Heading } from '@upskill/components'
import styles from './SplitChart.module.css'

export type SplitTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'brand'
  | 'neutral'
  | 'neutralFaint'

export interface SplitDatum {
  label: string
  value: number
  tone: SplitTone
}

export interface SplitChartProps {
  data: SplitDatum[]
  title: string
  variant?: 'bar' | 'donut'
  centerLabel?: string
}

const toneClass: Record<SplitTone, string> = {
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  brand: styles.toneBrand,
  neutral: styles.toneNeutral,
  neutralFaint: styles.toneNeutralFaint,
}

const BAR_VIEWBOX_WIDTH = 1000
const BAR_VIEWBOX_HEIGHT = 12
const BAR_GAP_UNITS = 6

const DONUT_SIZE = 160
const DONUT_RADIUS = 64
const DONUT_STROKE = 16
const DONUT_GAP_UNITS = 2
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS

function formatPct(value: number, total: number) {
  if (total === 0) return '0'
  return ((value / total) * 100).toFixed(1)
}

function BarMarks({ data, total }: { data: SplitDatum[]; total: number }) {
  const nonZero = data.filter((d) => d.value > 0)
  const gapTotal = BAR_GAP_UNITS * Math.max(nonZero.length - 1, 0)
  const drawableWidth = BAR_VIEWBOX_WIDTH - gapTotal
  let x = 0
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={styles.barSvg}
      viewBox={`0 0 ${BAR_VIEWBOX_WIDTH} ${BAR_VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
    >
      {nonZero.map((d) => {
        const width = total > 0 ? (d.value / total) * drawableWidth : 0
        const rect = (
          <rect
            key={d.label}
            x={x}
            y={0}
            width={width}
            height={BAR_VIEWBOX_HEIGHT}
            className={toneClass[d.tone]}
          >
            <title>{`${d.label}: ${d.value} (${formatPct(d.value, total)}%)`}</title>
          </rect>
        )
        x += width + BAR_GAP_UNITS
        return rect
      })}
    </svg>
  )
}

function DonutMarks({ data, total }: { data: SplitDatum[]; total: number }) {
  const nonZero = data.filter((d) => d.value > 0)
  let offset = 0
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={styles.donutSvg}
      viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
    >
      <g transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}>
        {nonZero.map((d) => {
          const length = total > 0 ? (d.value / total) * DONUT_CIRCUMFERENCE : 0
          const dashLength = Math.max(length - DONUT_GAP_UNITS, 0)
          const circle = (
            <circle
              key={d.label}
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              r={DONUT_RADIUS}
              fill="none"
              strokeWidth={DONUT_STROKE}
              strokeDasharray={`${dashLength} ${DONUT_CIRCUMFERENCE - dashLength}`}
              strokeDashoffset={-offset}
              className={toneClass[d.tone]}
            >
              <title>{`${d.label}: ${d.value} (${formatPct(d.value, total)}%)`}</title>
            </circle>
          )
          offset += length
          return circle
        })}
      </g>
    </svg>
  )
}

export function SplitChart({ data, title, variant = 'bar', centerLabel }: SplitChartProps) {
  const captionId = useId()
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const isEmpty = total === 0

  return (
    <figure aria-labelledby={captionId} className={styles.splitChart}>
      <figcaption id={captionId}>
        <Text as="span" color="subtle">{title}</Text>
      </figcaption>
      {!isEmpty && variant === 'bar' && (
        <div className={styles.barWrap}>
          <BarMarks data={data} total={total} />
        </div>
      )}
      {!isEmpty && variant === 'donut' && (
        <div className={styles.donutWrap}>
          <DonutMarks data={data} total={total} />
          <div className={styles.donutCenter}>
            <Heading as="h3" size="title-small">{total}</Heading>
            {centerLabel && <Text as="span" color="subtle">{centerLabel}</Text>}
          </div>
        </div>
      )}
      {isEmpty && <Text color="subtle">No data in snapshot</Text>}
      <ul className={styles.legend}>
        {data.map((d) => (
          <li key={d.label} className={styles.legendItem}>
            <span aria-hidden="true" className={`${styles.swatch} ${toneClass[d.tone]}`} />
            <Text as="span">{d.label}</Text>
            <Text as="span" color="subtle">{d.value}</Text>
          </li>
        ))}
      </ul>
    </figure>
  )
}
