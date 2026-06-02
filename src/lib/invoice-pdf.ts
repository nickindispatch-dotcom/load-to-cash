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

export type InvoiceTemplate = {
  id: string;
  name: string;
  style: "professional" | "modern" | "minimal" | "advance-way";
};

export const TEMPLATE_STYLES = [
  { id: "professional", name: "Professional", style: "professional" as const },
  { id: "modern", name: "Modern", style: "modern" as const },
  { id: "minimal", name: "Minimal", style: "minimal" as const },
  { id: "advance-way", name: "Advance Way Logistics", style: "advance-way" as const },
];

export function buildInvoicePdf(invoice: Invoice, settings: Settings, carrier: Carrier, loads: LoadRow[], templateStyle: string = "professional") {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentW = pw - margin * 2;

  if (templateStyle === "advance-way") {
    return buildAdvanceWayTemplate(doc, pw, margin, contentW, invoice, settings, carrier, loads);
  } else if (templateStyle === "modern") {
    return buildModernTemplate(doc, pw, margin, contentW, invoice, settings, carrier, loads);
  } else if (templateStyle === "minimal") {
    return buildMinimalTemplate(doc, pw, margin, contentW, invoice, settings, carrier, loads);
  }

  // Default: Professional
  return buildProfessionalTemplate(doc, pw, margin, contentW, invoice, settings, carrier, loads);
}

function buildProfessionalTemplate(doc: jsPDF, pw: number, margin: number, contentW: number, invoice: Invoice, settings: Settings, carrier: Carrier, loads: LoadRow[]) {
  // ===== Title banner =====
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, 40, contentW, 44, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("DISPATCH FEE INVOICE", pw / 2, 68, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // ===== FROM / BILL TO table =====
  let y = 110;
  const colW = contentW / 2;

  // Header row
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, contentW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("FROM", margin + 10, y + 15);
  doc.text("BILL TO", margin + colW + 10, y + 15);
  doc.setTextColor(0, 0, 0);

  // Body rows
  const boxY = y + 22;
  const boxH = 90;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(margin, boxY, colW, boxH);
  doc.rect(margin + colW, boxY, colW, boxH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(settings.sender_name || settings.company_name || "—", margin + 10, boxY + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let fy = boxY + 32;
  if (settings.company_name && settings.sender_name) { doc.text(settings.company_name, margin + 10, fy); fy += 12; }
  if (settings.address) { doc.text(settings.address, margin + 10, fy); fy += 12; }
  if (settings.phone) { doc.text(`Phone: ${settings.phone}`, margin + 10, fy); fy += 12; }
  if (settings.email) { doc.text(settings.email, margin + 10, fy); fy += 12; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text((carrier.name || "—").toUpperCase(), margin + colW + 10, boxY + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let by = boxY + 32;
  if (carrier.address) { doc.text(carrier.address, margin + colW + 10, by); by += 12; }
  if (carrier.phone) { doc.text(`Phone: ${carrier.phone}`, margin + colW + 10, by); by += 12; }
  if (carrier.mc_number) { doc.text(`MC: ${carrier.mc_number}`, margin + colW + 10, by); by += 12; }

  // Invoice meta line
  y = boxY + boxH + 16;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice #: ${invoice.invoice_number}    Date: ${fmtDate(invoice.invoice_date)}    Due: ${fmtDate(invoice.due_date)}`, margin, y);
  y += 10;

  // ===== Loads table =====
  autoTable(doc, {
    startY: y,
    head: [["Load #", "Broker", "Pickup & Delivery", "Gross Amount"]],
    body: loads.map((l) => [
      l.load_number || "",
      l.broker || "",
      `${[l.pickup_city, l.pickup_state].filter(Boolean).join(", ")} -> ${[l.delivery_city, l.delivery_state].filter(Boolean).join(", ")}`,
      fmtMoney(Number(l.rate || 0)),
    ]),
    theme: "grid",
    headStyles: { fillColor: [0, 0, 0], textColor: 255, halign: "center", fontStyle: "bold" },
    bodyStyles: { halign: "center", textColor: 20 },
    columnStyles: { 3: { halign: "right" } },
    styles: { fontSize: 10, cellPadding: 8, lineColor: [0, 0, 0], lineWidth: 0.5 },
    margin: { left: margin, right: margin },
  });

  // @ts-expect-error jspdf-autotable
  let ay = (doc.lastAutoTable?.finalY ?? y) + 20;

  // ===== Totals =====
  const labelW = contentW * 0.65;
  const valW = contentW - labelW;
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, ay, labelW, 24, "F");
  doc.setDrawColor(0); doc.setLineWidth(0.5);
  doc.rect(margin + labelW, ay, valW, 24);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Total Weekly Gross", margin + 10, ay + 16);
  doc.setTextColor(0, 0, 0);
  doc.text(fmtMoney(invoice.gross), margin + contentW - 10, ay + 16, { align: "right" });
  ay += 24;

  doc.setFillColor(0, 0, 0);
  doc.rect(margin, ay, labelW, 24, "F");
  doc.rect(margin + labelW, ay, valW, 24);
  doc.setTextColor(255, 255, 255);
  doc.text(`Dispatch Fee (${invoice.fee_pct}%)`, margin + 10, ay + 16);
  doc.setTextColor(0, 0, 0);
  doc.text(fmtMoney(invoice.fee_amount), margin + contentW - 10, ay + 16, { align: "right" });
  ay += 40;

  // ===== Payment details =====
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Payment Details", margin, ay);
  ay += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  if (settings.zelle) { doc.text(`Zelle: ${settings.zelle}`, margin, ay); ay += 12; }
  if (settings.cashapp) { doc.text(`CashApp: ${settings.cashapp}`, margin, ay); ay += 12; }
  if (settings.bank_transfer) {
    const lines = doc.splitTextToSize(`Bank Transfer: ${settings.bank_transfer}`, contentW);
    doc.text(lines, margin, ay); ay += lines.length * 12;
  }
  if (invoice.notes) {
    ay += 8;
    doc.setFont("helvetica", "bold"); doc.text("Notes", margin, ay); ay += 14;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(invoice.notes, contentW);
    doc.text(lines, margin, ay);
  }

  return doc;
}

function buildModernTemplate(doc: jsPDF, pw: number, margin: number, contentW: number, invoice: Invoice, settings: Settings, carrier: Carrier, loads: LoadRow[]) {
  const primaryColor = [15, 23, 42];
  const accentColor = [16, 185, 129];

  // ===== Header =====
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pw, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("INVOICE", margin, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`#${invoice.invoice_number}`, margin, 68);

  // ===== Invoice details =====
  let y = 110;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("INVOICE DETAILS", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Date: ${fmtDate(invoice.invoice_date)}`, margin, y); y += 10;
  doc.text(`Due: ${fmtDate(invoice.due_date)}`, margin, y); y += 10;
  doc.text(`Carrier: ${carrier.name || "—"}`, margin, y); y += 10;

  // ===== FROM section =====
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("FROM", margin, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (settings.sender_name) { doc.text(settings.sender_name, margin, y); y += 10; }
  if (settings.company_name) { doc.text(settings.company_name, margin, y); y += 10; }
  if (settings.phone) { doc.text(settings.phone, margin, y); y += 10; }

  // ===== Loads table =====
  y += 8;
  autoTable(doc, {
    startY: y,
    head: [["Load #", "Broker", "Route", "Amount"]],
    body: loads.map((l) => [
      l.load_number || "",
      l.broker || "",
      `${[l.pickup_city, l.pickup_state].filter(Boolean).join(", ")} → ${[l.delivery_city, l.delivery_state].filter(Boolean).join(", ")}`,
      fmtMoney(Number(l.rate || 0)),
    ]),
    theme: "grid",
    headStyles: { fillColor: accentColor, textColor: 255, halign: "center", fontStyle: "bold" },
    bodyStyles: { halign: "center" },
    columnStyles: { 3: { halign: "right" } },
    styles: { fontSize: 9, cellPadding: 6, lineColor: [200, 200, 200] },
    margin: { left: margin, right: margin },
  });

  // @ts-expect-error jspdf-autotable
  let ay = (doc.lastAutoTable?.finalY ?? y) + 16;

  // ===== Summary =====
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(2);
  doc.line(margin, ay, margin + contentW, ay);
  ay += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("SUMMARY", margin, ay);
  ay += 12;

  const labelW = contentW * 0.5;
  doc.setFontSize(9);
  doc.text("Gross Amount:", margin, ay); doc.text(fmtMoney(invoice.gross), margin + labelW, ay, { align: "right" }); ay += 10;
  doc.text(`Dispatch Fee (${invoice.fee_pct}%):`, margin, ay); doc.text(`- ${fmtMoney(invoice.fee_amount)}`, margin + labelW, ay, { align: "right" }); ay += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("NET DUE:", margin, ay + 4); doc.text(fmtMoney(invoice.due), margin + labelW, ay + 4, { align: "right" });

  return doc;
}

function buildMinimalTemplate(doc: jsPDF, pw: number, margin: number, contentW: number, invoice: Invoice, settings: Settings, carrier: Carrier, loads: LoadRow[]) {
  // ===== Title =====
  let y = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("INVOICE", margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`#${invoice.invoice_number}`, margin, y);

  // ===== Details row =====
  y += 20;
  const col1 = margin;
  const col2 = margin + contentW / 2;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${fmtDate(invoice.invoice_date)}`, col1, y);
  doc.text(`Carrier: ${carrier.name || "—"}`, col2, y);
  y += 10;
  doc.text(`Due: ${fmtDate(invoice.due_date)}`, col1, y);

  // ===== Divider =====
  y += 8;
  doc.setDrawColor(100);
  doc.line(margin, y, margin + contentW, y);

  // ===== Loads table =====
  y += 8;
  autoTable(doc, {
    startY: y,
    head: [["Load #", "Broker", "Route", "Amount"]],
    body: loads.map((l) => [
      l.load_number || "",
      l.broker || "",
      `${[l.pickup_city, l.pickup_state].filter(Boolean).join(", ")} → ${[l.delivery_city, l.delivery_state].filter(Boolean).join(", ")}`,
      fmtMoney(Number(l.rate || 0)),
    ]),
    theme: "plain",
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: "bold" },
    bodyStyles: { textColor: 0 },
    columnStyles: { 3: { halign: "right" } },
    styles: { fontSize: 9, cellPadding: 6 },
    margin: { left: margin, right: margin },
  });

  // @ts-expect-error jspdf-autotable
  let ay = (doc.lastAutoTable?.finalY ?? y) + 12;

  // ===== Totals =====
  doc.setDrawColor(100);
  doc.line(margin, ay, margin + contentW, ay);
  ay += 8;

  const labelW = contentW * 0.6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Gross:", margin, ay); doc.text(fmtMoney(invoice.gross), margin + labelW, ay, { align: "right" }); ay += 8;
  doc.text(`Fee (${invoice.fee_pct}%):`, margin, ay); doc.text(`- ${fmtMoney(invoice.fee_amount)}`, margin + labelW, ay, { align: "right" }); ay += 8;

  doc.setDrawColor(100);
  doc.line(margin, ay, margin + contentW, ay);
  ay += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DUE:", margin, ay); doc.text(fmtMoney(invoice.due), margin + labelW, ay, { align: "right" });

  return doc;
}

function buildAdvanceWayTemplate(doc: jsPDF, pw: number, margin: number, contentW: number, invoice: Invoice, settings: Settings, carrier: Carrier, loads: LoadRow[]) {
  const primaryColor = [55, 126, 184]; // Blue
  const accentColor = [255, 192, 0]; // Gold/Yellow

  // ===== Header with logo area =====
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pw, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("ADVANCE WAY", margin, 30);
  doc.setFontSize(16);
  doc.setFillColor(...accentColor);
  doc.rect(margin, 35, 20, 4, "F");
  doc.setFontSize(14);
  doc.text("LOGISTICS LLC", margin + 25, 38);

  // Invoice title on right
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("INVOICE", pw - margin - 100, 30);

  // Company info
  let y = 75;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("912 Haldemann Ave. Joliet, IL 60636", margin, y);
  y += 8;
  doc.text("Phone: (602) 345-1528", margin, y);

  // Invoice details on right
  y = 75;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Invoice# ${invoice.invoice_number}`, pw - margin - 80, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Date: ${fmtDate(invoice.invoice_date)}`, pw - margin - 80, y);
  y += 8;
  doc.text(`Due: ${fmtDate(invoice.due_date)}`, pw - margin - 80, y);

  // ===== Bill To section =====
  y = 115;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Bill To:", margin, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(carrier.name?.toUpperCase() || "—", margin, y); y += 8;
  if (carrier.address) { doc.text(carrier.address, margin, y); y += 8; }
  if (carrier.phone) { doc.text(`Phone: ${carrier.phone}`, margin, y); y += 8; }

  // ===== Payment section header =====
  y = 115;
  doc.setFillColor(...primaryColor);
  doc.rect(pw - margin - 100, y, 100, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ACCEPTED PAYMENT OPTIONS", pw - margin - 95, y + 12, { align: "center" });

  y += 22;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ZELLE DETAILS:", pw - margin - 100, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("ACCOUNT TITLE:", pw - margin - 100, y);
  y += 6;
  doc.text("PHONE NUMBER:", pw - margin - 100, y);

  // ===== Main table header =====
  y = 170;
  doc.setFillColor(...primaryColor);
  doc.rect(margin, y, contentW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  
  const colWidths = [contentW * 0.15, contentW * 0.2, contentW * 0.3, contentW * 0.15, contentW * 0.2];
  let xPos = margin;
  ["DISPATCHER NAME", "JOB", "PAYMENT TERMS", "DUE DATE"].forEach((header) => {
    doc.text(header, xPos + 5, y + 12);
    xPos += colWidths[0] + 5;
  });

  // ===== Loads table =====
  y += 18;
  autoTable(doc, {
    startY: y,
    head: [["LOAD NUMBER", "DESCRIPTION", "AMOUNT", "SERVICE FEE"]],
    body: loads.map((l) => [
      l.load_number || "",
      `${[l.pickup_city, l.pickup_state].filter(Boolean).join(", ")} to ${[l.delivery_city, l.delivery_state].filter(Boolean).join(", ")}`,
      fmtMoney(Number(l.rate || 0)),
      fmtMoney(Number(l.rate || 0) * (invoice.fee_pct / 100)),
    ]),
    theme: "grid",
    headStyles: { fillColor: [200, 200, 200], textColor: 0, halign: "center", fontStyle: "bold" },
    bodyStyles: { halign: "center" },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
    styles: { fontSize: 9, cellPadding: 6, lineColor: [0, 0, 0] },
    margin: { left: margin, right: margin },
  });

  // @ts-expect-error jspdf-autotable
  let ay = (doc.lastAutoTable?.finalY ?? y) + 8;

  // ===== Summary section =====
  doc.setFillColor(200, 200, 200);
  doc.rect(margin + contentW * 0.5, ay, contentW * 0.5, 16, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL", margin + contentW * 0.55, ay + 10);
  doc.text(fmtMoney(invoice.gross), margin + contentW - 10, ay + 10, { align: "right" });
  ay += 16;

  doc.setFillColor(200, 200, 200);
  doc.rect(margin + contentW * 0.5, ay, contentW * 0.5, 16, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`SERVICE FEE (${invoice.fee_pct}%)`, margin + contentW * 0.55, ay + 10);
  doc.text(fmtMoney(invoice.fee_amount), margin + contentW - 10, ay + 10, { align: "right" });
  ay += 16;

  doc.setFillColor(...primaryColor);
  doc.rect(margin + contentW * 0.5, ay, contentW * 0.5, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PAYABLE AMOUNT", margin + contentW * 0.55, ay + 10);
  doc.text(fmtMoney(invoice.due), margin + contentW - 10, ay + 10, { align: "right" });

  ay += 24;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const noteLines = doc.splitTextToSize("Note: This is an INVOICE for the loads mentioned above, subject to the condition noted below: All loads have been delivered, payment due upon receipt. If you have any questions concerning this invoice, contact: Accounts Department at (602) 345-1528.", contentW);
  doc.text(noteLines, margin, ay);

  return doc;
}

export async function buildInvoiceXlsx(invoice: Invoice, settings: Settings, carrier: Carrier, loads: LoadRow[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Invoice");
  ws.columns = [
    { width: 16 }, { width: 26 }, { width: 38 }, { width: 16 },
  ];
  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = "DISPATCH FEE INVOICE";
  ws.getCell("A1").font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
  ws.getRow(1).height = 28;

  ws.getCell("A3").value = "FROM"; ws.getCell("C3").value = "BILL TO";
  ["A3", "C3"].forEach((c) => {
    ws.getCell(c).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
  });
  ws.getCell("A4").value = settings.sender_name || settings.company_name || "";
  ws.getCell("A5").value = settings.address || "";
  ws.getCell("A6").value = settings.phone ? `Phone: ${settings.phone}` : "";
  ws.getCell("C4").value = carrier.name || "";
  ws.getCell("C5").value = carrier.address || "";
  ws.getCell("C6").value = carrier.phone ? `Phone: ${carrier.phone}` : "";
  ws.getCell("C7").value = carrier.mc_number ? `MC: ${carrier.mc_number}` : "";

  ws.addRow([]);
  ws.addRow([`Invoice #: ${invoice.invoice_number}`, `Date: ${invoice.invoice_date}`, `Due: ${invoice.due_date}`]);
  ws.addRow([]);
  const hr = ws.addRow(["Load #", "Broker", "Pickup & Delivery", "Gross Amount"]);
  hr.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
    c.alignment = { horizontal: "center" };
  });
  loads.forEach((l) => {
    ws.addRow([
      l.load_number || "",
      l.broker || "",
      `${[l.pickup_city, l.pickup_state].filter(Boolean).join(", ")} -> ${[l.delivery_city, l.delivery_state].filter(Boolean).join(", ")}`,
      Number(l.rate || 0),
    ]);
  });
  ws.addRow([]);
  const g = ws.addRow(["Total Weekly Gross", "", "", invoice.gross]);
  const f = ws.addRow([`Dispatch Fee (${invoice.fee_pct}%)`, "", "", invoice.fee_amount]);
  [g, f].forEach((row) => {
    row.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
  });

  ws.addRow([]);
  const p = ws.addRow(["Payment Details"]); p.getCell(1).font = { bold: true };
  if (settings.zelle) ws.addRow([`Zelle: ${settings.zelle}`]);
  if (settings.cashapp) ws.addRow([`CashApp: ${settings.cashapp}`]);
  if (settings.bank_transfer) ws.addRow([`Bank Transfer: ${settings.bank_transfer}`]);

  return wb.xlsx.writeBuffer();
}
