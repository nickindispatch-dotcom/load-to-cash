import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtMoney, fmtDate } from "./format";

export type Settings = {
  company_name?: string | null;
  sender_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  zelle?: string | null;
  cashapp?: string | null;
  bank_transfer?: string | null;
  logo_url?: string | null;
};

export type Carrier = {
  name?: string | null;
  mc_number?: string | null;
  address?: string | null;
  phone?: string | null;
};

export type LoadRow = {
  load_number?: string | null;
  broker?: string | null;
  pickup_date?: string | null;
  pickup_city?: string | null;
  pickup_state?: string | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  rate?: number | null;
};

export type Invoice = {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  gross: number;
  fee_pct: number;
  fee_amount: number;
  due: number;
  notes?: string | null;
};

export function buildInvoicePdf(invoice: Invoice, settings: Settings, carrier: Carrier, loads: LoadRow[]) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(settings.company_name || "Invoice", 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 16;
  if (settings.address) { doc.text(settings.address, 40, y); y += 12; }
  const cline = [settings.phone, settings.email].filter(Boolean).join("  ·  ");
  if (cline) { doc.text(cline, 40, y); y += 12; }

  // Invoice meta (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INVOICE", pw - 40, 50, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoice.invoice_number}`, pw - 40, 70, { align: "right" });
  doc.text(`Date: ${fmtDate(invoice.invoice_date)}`, pw - 40, 84, { align: "right" });
  doc.text(`Due: ${fmtDate(invoice.due_date)}`, pw - 40, 98, { align: "right" });

  // Bill to
  y = Math.max(y, 120);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 40, y);
  doc.setFont("helvetica", "normal");
  y += 14;
  doc.text(carrier.name || "—", 40, y); y += 12;
  if (carrier.mc_number) { doc.text(`MC# ${carrier.mc_number}`, 40, y); y += 12; }
  if (carrier.address) { doc.text(carrier.address, 40, y); y += 12; }
  if (carrier.phone) { doc.text(carrier.phone, 40, y); y += 12; }

  y += 10;
  autoTable(doc, {
    startY: y,
    head: [["Load #", "Broker", "Pickup", "Origin", "Destination", "Rate"]],
    body: loads.map((l) => [
      l.load_number || "",
      l.broker || "",
      fmtDate(l.pickup_date || ""),
      [l.pickup_city, l.pickup_state].filter(Boolean).join(", "),
      [l.delivery_city, l.delivery_state].filter(Boolean).join(", "),
      fmtMoney(Number(l.rate || 0)),
    ]),
    foot: [["", "", "", "", "Total", fmtMoney(invoice.gross)]],
    headStyles: { fillColor: [30, 41, 59] },
    footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: { 5: { halign: "right" } },
  });

  // @ts-expect-error jspdf-autotable lastAutoTable
  let ay = (doc.lastAutoTable?.finalY ?? y) + 20;

  // Totals block right-aligned
  const labelX = pw - 200;
  const valX = pw - 40;
  doc.setFont("helvetica", "normal");
  doc.text("Gross", labelX, ay); doc.text(fmtMoney(invoice.gross), valX, ay, { align: "right" }); ay += 14;
  doc.text(`Dispatch Fee (${invoice.fee_pct}%)`, labelX, ay); doc.text(`- ${fmtMoney(invoice.fee_amount)}`, valX, ay, { align: "right" }); ay += 14;
  doc.setFont("helvetica", "bold");
  doc.text("Net Due", labelX, ay); doc.text(fmtMoney(invoice.due), valX, ay, { align: "right" });

  // Payment info
  ay += 30;
  doc.setFont("helvetica", "bold"); doc.text("PAYMENT", 40, ay); doc.setFont("helvetica", "normal");
  ay += 14;
  if (settings.zelle) { doc.text(`Zelle: ${settings.zelle}`, 40, ay); ay += 12; }
  if (settings.cashapp) { doc.text(`CashApp: ${settings.cashapp}`, 40, ay); ay += 12; }
  if (settings.bank_transfer) {
    const lines = doc.splitTextToSize(`Bank Transfer: ${settings.bank_transfer}`, pw - 80);
    doc.text(lines, 40, ay); ay += lines.length * 12;
  }
  if (invoice.notes) {
    ay += 10;
    doc.setFont("helvetica", "bold"); doc.text("NOTES", 40, ay); doc.setFont("helvetica", "normal");
    ay += 14;
    const lines = doc.splitTextToSize(invoice.notes, pw - 80);
    doc.text(lines, 40, ay);
  }

  return doc;
}

export async function buildInvoiceXlsx(invoice: Invoice, settings: Settings, carrier: Carrier, loads: LoadRow[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Invoice");
  ws.columns = [
    { width: 16 }, { width: 26 }, { width: 14 }, { width: 22 }, { width: 22 }, { width: 14 },
  ];
  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = settings.company_name || "Invoice";
  ws.getCell("A1").font = { size: 18, bold: true };
  ws.getCell("A3").value = `Invoice #: ${invoice.invoice_number}`;
  ws.getCell("A4").value = `Date: ${invoice.invoice_date}   Due: ${invoice.due_date}`;
  ws.getCell("A6").value = "Bill To:"; ws.getCell("A6").font = { bold: true };
  ws.getCell("A7").value = carrier.name || "";
  if (carrier.mc_number) ws.getCell("A8").value = `MC# ${carrier.mc_number}`;
  const headerRow = ws.addRow([]); headerRow.getCell(1).value = "";
  const hr = ws.addRow(["Load #", "Broker", "Pickup", "Origin", "Destination", "Rate"]);
  hr.font = { bold: true };
  loads.forEach((l) => {
    ws.addRow([
      l.load_number || "",
      l.broker || "",
      l.pickup_date || "",
      [l.pickup_city, l.pickup_state].filter(Boolean).join(", "),
      [l.delivery_city, l.delivery_state].filter(Boolean).join(", "),
      Number(l.rate || 0),
    ]);
  });
  ws.addRow(["", "", "", "", "Gross", invoice.gross]);
  ws.addRow(["", "", "", "", `Fee ${invoice.fee_pct}%`, -invoice.fee_amount]);
  ws.addRow(["", "", "", "", "Net Due", invoice.due]).font = { bold: true };
  return wb.xlsx.writeBuffer();
}
