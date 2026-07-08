// Single source of truth for Airtable base/table identity, imported by every
// script that talks to Airtable. Was previously copy-pasted across
// airtable-sync.js, airtable-pull.js and airtable-setup-governance.js — a table
// rename meant editing three files. See issue #34.

export const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID ?? "appBfY2arkReKQNit";

// Table IDs — used where the Airtable REST endpoint is called against a
// specific table (upserts, deletes) and an ID is more stable than a name.
export const AIRTABLE_TABLE_IDS = {
  primitives: "tblAl09uImcO1VPeb",
  semantic: "tblxMSyL7EFIXltqX",
  device: "tblQvDDo0EZoiYrdf",
  components: "tblT79kVwnCZJdlQE",
};

// Table names — used where the endpoint is called by name (listing/reading).
export const AIRTABLE_TABLE_NAMES = {
  primitives: "Primitive tokens",
  semantic: "Semantic tokens",
  components: "Components",
};

export function airtableTableUrl(tableIdOrName) {
  return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableIdOrName)}`;
}
