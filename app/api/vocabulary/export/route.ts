import ExcelJS from "exceljs";
import { aoaFromRows } from "@/lib/vocabulary";
import { readVocabulary } from "@/lib/vocabularyFile";

export const runtime = "nodejs";

/** Builds an .xlsx from the stored vocabulary and returns it as a download. */
export async function GET() {
  const rows = await readVocabulary();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Vocabulary");
  const aoa = aoaFromRows(rows);
  aoa.forEach((r) => ws.addRow(r));
  ws.getRow(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Vocabulary.xlsx"',
    },
  });
}
