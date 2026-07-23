import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { rowsFromAoa } from "@/lib/vocabulary";
import { writeVocabulary } from "@/lib/vocabularyFile";

export const runtime = "nodejs";

/**
 * Receives a raw .xlsx upload (request body = the file bytes), parses the first
 * worksheet into an array-of-arrays using each cell's rendered text, maps it to
 * vocabulary rows, replaces the stored table, and returns the new rows.
 */
export async function POST(request: Request) {
  let rows;
  try {
    const buffer = await request.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];
    if (!ws) {
      return NextResponse.json(
        { error: "empty_file", message: "That file has no worksheets." },
        { status: 422 },
      );
    }
    const aoa: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      const arr: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        arr[col - 1] = cell.text ?? "";
      });
      aoa.push(arr);
    });
    rows = rowsFromAoa(aoa);
  } catch {
    return NextResponse.json(
      { error: "parse_failed", message: "Couldn't read that Excel file." },
      { status: 422 },
    );
  }

  if (rows.length === 0) {
    return NextResponse.json(
      {
        error: "no_rows",
        message:
          "No rows found. The sheet needs a header row with a 'Name' column.",
      },
      { status: 422 },
    );
  }

  await writeVocabulary(rows);
  return NextResponse.json(rows);
}
