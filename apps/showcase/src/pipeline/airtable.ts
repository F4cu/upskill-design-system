// Single copy of the Airtable base/table links used by the pipeline DAG and the
// dashboard — was previously duplicated between model.ts and dashboardData.ts.
// The showcase app can't import scripts/airtable-ids.js (different rootDir), so
// this is the app-side counterpart; see issue #34.
const AIRTABLE_BASE = 'https://airtable.com/appBfY2arkReKQNit'

export const AIRTABLE_TABLES = {
  primitives: `${AIRTABLE_BASE}/tblAl09uImcO1VPeb`,
  semantic: `${AIRTABLE_BASE}/tblxMSyL7EFIXltqX`,
  device: `${AIRTABLE_BASE}/tblQvDDo0EZoiYrdf`,
  components: `${AIRTABLE_BASE}/tblT79kVwnCZJdlQE`,
} as const
