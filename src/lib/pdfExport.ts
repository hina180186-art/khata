import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, PaymentAndExpense, Product, Party } from './types';

interface EODReportData {
  businessName: string;
  city: string;
  phone: string;
  dateRangeLabel: string;
  metrics: {
    totalSales: number;
    cashSales: number;
    udhaarSales: number;
    totalPurchases: number;
    totalReturns: number;
    customerWasooli: number;
    shopExpenses: number;
    openingGalla: number;
    netCashInGalla: number;
  };
  transactions: Transaction[];
  expenses: PaymentAndExpense[];
  topPipes: Array<{ name: string; qty: number; unit: string; totalRevenue: number }>;
  lowStockItems: Product[];
}

export function generateEODPdfReport(data: EODReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // Deep Slate Navy
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.businessName.toUpperCase(), 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Stainless Steel & Pipe Store OS • ${data.city} • Ph: ${data.phone}`, 14, 22);
  doc.text(`END-OF-DAY CLOSING REPORT (EOD) — Period: ${data.dateRangeLabel}`, 14, 28);

  doc.setFontSize(8);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 140, 28);

  // Section 1: Executive Financial Summary Table
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Financial Summary & Galla Audit', 14, 44);

  const summaryRows = [
    ['Total Sales (Cash + Udhaar)', `Rs. ${data.metrics.totalSales.toLocaleString()}`],
    ['Cash Sales (Galla Inflow)', `Rs. ${data.metrics.cashSales.toLocaleString()}`],
    ['Udhaar Sales (Debited to Fabricator Khatay)', `Rs. ${data.metrics.udhaarSales.toLocaleString()}`],
    ['Wasooli Recovered (Customer Debt Inflow)', `Rs. ${data.metrics.customerWasooli.toLocaleString()}`],
    ['Shop Expenses (Roznamcha Outflow)', `- Rs. ${data.metrics.shopExpenses.toLocaleString()}`],
    ['Total Stock Purchases (Mill Inflow)', `Rs. ${data.metrics.totalPurchases.toLocaleString()}`],
    ['Customer Returns (Maal Wapsi)', `Rs. ${data.metrics.totalReturns.toLocaleString()}`],
    ['Opening Cash in Drawer', `Rs. ${data.metrics.openingGalla.toLocaleString()}`],
    ['ASLI CLOSING CASH IN GALLA', `Rs. ${data.metrics.netCashInGalla.toLocaleString()}`],
  ];

  autoTable(doc, {
    startY: 48,
    head: [['Metric / Account Head', 'Amount (PKR)']],
    body: summaryRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // Section 2: Scanned Bills Log
  const finalY1 = (doc as any).lastAutoTable?.finalY || 110;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Scanned Bills & Transactions Log', 14, finalY1 + 10);

  const txRows = data.transactions.map(t => [
    new Date(t.created_at).toLocaleDateString(),
    t.parchi_number || '-',
    t.party?.name || 'Walk-in Cash Counter',
    t.type.toUpperCase(),
    t.routing_mode === 'cash_sale' ? 'Cash Counter' : 'Customer Khata',
    `Rs. ${t.total_amount.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: finalY1 + 14,
    head: [['Date', 'Parchi #', 'Party / Fabricator', 'Type', 'Routing', 'Total (PKR)']],
    body: txRows.length > 0 ? txRows : [['No bills in selected period', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    styles: { fontSize: 8 },
    columnStyles: {
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // Check if we need a new page for inventory section
  const finalY2 = (doc as any).lastAutoTable?.finalY || 180;
  if (finalY2 > 210) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Pipe Movement & Stock Alerts', 14, 20);
  } else {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Pipe Movement & Stock Alerts', 14, finalY2 + 10);
  }

  const startY3 = finalY2 > 210 ? 25 : finalY2 + 14;

  const stockRows = data.lowStockItems.map(p => [
    p.name,
    p.sku_code,
    `${p.current_stock} ${p.unit}`,
    `<= ${p.low_stock_alert} ${p.unit}`,
    `Rs. ${p.sale_rate.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: startY3,
    head: [['Product Name (Low Stock)', 'SKU Code', 'In Hand', 'Min Alert', 'Sale Rate']],
    body: stockRows.length > 0 ? stockRows : [['All steel pipe SKUs are adequately stocked', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [217, 119, 6], textColor: 255 }, // Amber
    styles: { fontSize: 8 },
    columnStyles: {
      2: { fontStyle: 'bold', halign: 'right' },
      4: { halign: 'right' },
    },
  });

  // Footer Note
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `SteelKhata AI SaaS • Page ${i} of ${pageCount} • Strictly Confidential Internal Shop Audit`,
      14,
      290
    );
  }

  // Save PDF to browser
  doc.save(`SteelKhata_EOD_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
