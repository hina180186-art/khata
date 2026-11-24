import * as XLSX from 'xlsx';
import { Transaction, PaymentAndExpense, Product, Party } from './types';

interface EODExcelData {
  businessName: string;
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
  products: Product[];
  parties: Party[];
}

export function generateEODExcelReport(data: EODExcelData) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Financial & Galla Summary
  const summarySheetData = [
    ['SteelKhata AI - End of Day Closing Summary'],
    ['Business:', data.businessName],
    ['Report Period:', data.dateRangeLabel],
    ['Export Date:', new Date().toLocaleString()],
    [''],
    ['Account Head / Metric', 'Amount (PKR)'],
    ['Total Sales (Cash + Udhaar)', data.metrics.totalSales],
    ['Cash Sales (Galla Inflow)', data.metrics.cashSales],
    ['Udhaar Sales (Debited to Khata)', data.metrics.udhaarSales],
    ['Customer Wasooli (Debt Recovered)', data.metrics.customerWasooli],
    ['Shop Expenses (Roznamcha Outflow)', data.metrics.shopExpenses],
    ['Stock Purchases (Mill Inflow)', data.metrics.totalPurchases],
    ['Customer Returns (Maal Wapsi)', data.metrics.totalReturns],
    ['Opening Cash in Drawer', data.metrics.openingGalla],
    ['ASLI CASH IN GALLA (CLOSING)', data.metrics.netCashInGalla],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'EOD Summary');

  // Sheet 2: Transactions Log
  const txSheetData = [
    ['Date', 'Parchi #', 'Party / Fabricator', 'Type', 'Routing Mode', 'Subtotal', 'Mazdoori', 'Total Amount', 'Paid Amount'],
    ...data.transactions.map(t => [
      new Date(t.created_at).toLocaleDateString(),
      t.parchi_number || '-',
      t.party?.name || 'Walk-in Cash Counter',
      t.type,
      t.routing_mode,
      t.subtotal,
      t.extra_charges,
      t.total_amount,
      t.paid_amount,
    ]),
  ];

  const wsTx = XLSX.utils.aoa_to_sheet(txSheetData);
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');

  // Sheet 3: Steel Inventory
  const stockSheetData = [
    ['Product Name', 'SKU Code', 'Grade', 'Size', 'Gauge', 'Shape', 'Current Stock', 'Unit', 'Purchase Rate', 'Sale Rate', 'Stock Value (Sale)'],
    ...data.products.map(p => [
      p.name,
      p.sku_code,
      p.attributes.grade,
      p.attributes.size,
      p.attributes.gauge,
      p.attributes.shape,
      p.current_stock,
      p.unit,
      p.purchase_rate,
      p.sale_rate,
      p.current_stock * p.sale_rate,
    ]),
  ];

  const wsStock = XLSX.utils.aoa_to_sheet(stockSheetData);
  XLSX.utils.book_append_sheet(wb, wsStock, 'Pipe Inventory');

  // Sheet 4: Customer Khatay Balances
  const khataSheetData = [
    ['Party Name', 'Area / Shop Tag', 'Phone', 'Type', 'Current Balance (PKR)', 'Status'],
    ...data.parties.map(p => [
      p.name,
      p.area_or_shop || '-',
      p.phone || '-',
      p.type,
      p.current_balance,
      p.current_balance > 0 ? 'Owes Udhaar' : p.current_balance < 0 ? 'Advance Deposit' : 'Clear',
    ]),
  ];

  const wsKhata = XLSX.utils.aoa_to_sheet(khataSheetData);
  XLSX.utils.book_append_sheet(wb, wsKhata, 'Khatay Balances');

  // Download
  XLSX.writeFile(wb, `SteelKhata_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
}
