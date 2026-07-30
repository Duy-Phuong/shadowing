export interface VocabRow {
  id: string;
  name: string;
  ipa: string;
  type: string;
  description: string;
  unit: string;
}

/** Column order used for export and as the canonical field list. */
export const VOCAB_COLUMNS = [
  "ID",
  "Name",
  "IPA",
  "Type",
  "Description",
  "Unit",
] as const;

const FIELD_BY_HEADER: Record<string, keyof VocabRow> = {
  id: "id",
  name: "name",
  ipa: "ipa",
  type: "type",
  description: "description",
  unit: "unit",
};

type Cell = string | number | boolean | null | undefined;

const cellText = (c: Cell): string =>
  c === null || c === undefined ? "" : String(c).trim();

/**
 * Maps a sheet's array-of-arrays into vocabulary rows. Locates the header row
 * (the first row containing a "Name" column) so it tolerates leading blank
 * rows/columns, then reads columns by header name in any order. Rows without a
 * name are skipped.
 */
export function rowsFromAoa(aoa: Cell[][]): VocabRow[] {
  let headerIndex = -1;
  let colMap: Partial<Record<keyof VocabRow, number>> = {};

  for (let i = 0; i < aoa.length; i++) {
    const map: Partial<Record<keyof VocabRow, number>> = {};
    aoa[i].forEach((cell, col) => {
      const field = FIELD_BY_HEADER[cellText(cell).toLowerCase()];
      if (field && map[field] === undefined) map[field] = col;
    });
    if (map.name !== undefined) {
      headerIndex = i;
      colMap = map;
      break;
    }
  }
  if (headerIndex === -1) return [];

  const at = (row: Cell[], field: keyof VocabRow): string => {
    const col = colMap[field];
    return col === undefined ? "" : cellText(row[col]);
  };

  const rows: VocabRow[] = [];
  for (let i = headerIndex + 1; i < aoa.length; i++) {
    const row = aoa[i];
    const name = at(row, "name");
    if (name === "") continue;
    rows.push({
      id: at(row, "id"),
      name,
      ipa: at(row, "ipa"),
      type: at(row, "type"),
      description: at(row, "description"),
      unit: at(row, "unit"),
    });
  }
  return rows;
}

/** Builds an array-of-arrays (header + rows) for writing to a spreadsheet. */
export function aoaFromRows(rows: VocabRow[]): string[][] {
  return [
    [...VOCAB_COLUMNS],
    ...rows.map((r) => [r.id, r.name, r.ipa, r.type, r.description, r.unit]),
  ];
}
