'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Lock,
  Unlock,
  Calendar,
  TrendingUp,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { generateEODPdfReport } from '@/lib/pdfExport';
import { generateEODExcelReport } from '@/lib/excelExport';

export default function ReportsPage() {
  const {
    business,
    transactions,
    paymentsAndExpenses,
    products,
    parties,
    isLockedDate,
    lockDay,
    unlockDay,
  } = useStore();

  // Period Selector: 'today' | 'yesterday' | 'week' | 'custom'
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'custom'>('today');
  const [customStart, setCustomStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);

  // Lock Day PIN Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinAction, setPinAction] = useState<'lock' | 'unlock'>('lock');
  const [ownerPin, setOwnerPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Selected date key for locking
  const targetDateKey = useMemo(() => {
    if (period === 'yesterday') {
      const d = new Date(Date.now() - 86400000);
      return d.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  }, [period]);

  const isDayCurrentlyLocked = isLockedDate(targetDateKey);

  // Filter transactions and expenses by selected period
  const { filteredTx, filteredExpenses, dateLabel } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const sevenDaysAgoTime = Date.now() - 7 * 86400000;

    let txList = transactions;
    let expList = paymentsAndExpenses;
    let label = 'Today';

    if (period === 'today') {
      txList = transactions.filter(t => t.created_at.startsWith(todayStr));
      expList = paymentsAndExpenses.filter(e => e.created_at.startsWith(todayStr));
      label = `Today (${new Date().toLocaleDateString()})`;
    } else if (period === 'yesterday') {
      txList = transactions.filter(t => t.created_at.startsWith(yesterdayStr));
      expList = paymentsAndExpenses.filter(e => e.created_at.startsWith(yesterdayStr));
      label = `Yesterday (${new Date(Date.now() - 86400000).toLocaleDateString()})`;
    } else if (period === 'week') {
      txList = transactions.filter(t => new Date(t.created_at).getTime() >= sevenDaysAgoTime);
      expList = paymentsAndExpenses.filter(e => new Date(e.created_at).getTime() >= sevenDaysAgoTime);
      label = 'Last 7 Days';
    } else if (period === 'custom') {
      const startTime = new Date(customStart + 'T00:00:00').getTime();
      const endTime = new Date(customEnd + 'T23:59:59').getTime();
      txList = transactions.filter(t => {
        const time = new Date(t.created_at).getTime();
        return time >= startTime && time <= endTime;
      });
      expList = paymentsAndExpenses.filter(e => {
        const time = new Date(e.created_at).getTime();
        return time >= startTime && time <= endTime;
      });
      label = `${customStart} to ${customEnd}`;
    }

    return { filteredTx: txList, filteredExpenses: expList, dateLabel: label };
  }, [transactions, paymentsAndExpenses, period, customStart, customEnd]);

  // Compute detailed financial report metrics
  const reportMetrics = useMemo(() => {
    let totalSales = 0;
    let cashSales = 0;
    let udhaarSales = 0;
    let totalPurchases = 0;
    let totalReturns = 0;

    for (const t of filteredTx) {
      if (t.type === 'sale') {
        totalSales += t.total_amount;
        if (t.routing_mode === 'cash_sale' || t.payment_mode === 'cash') {
          cashSales += t.total_amount;
        } else {
          udhaarSales += t.total_amount;
        }
      } else if (t.type === 'purchase') {
        totalPurchases += t.total_amount;
      } else if (t.type === 'sale_return') {
        totalReturns += t.total_amount;
      }
    }

    let customerWasooli = 0;
    let shopExpenses = 0;

    for (const e of filteredExpenses) {
      if (e.entry_type === 'customer_wasooli') {
        customerWasooli += e.amount;
      } else if (e.entry_type === 'shop_expense') {
        shopExpenses += e.amount;
      }
    }

    const openingGalla = 15000;
    const netCashInGalla = openingGalla + cashSales + customerWasooli - shopExpenses;

    // Pipe sizes movement aggregation
    const pipeMap = new Map<string, { name: string; qty: number; unit: string; totalRevenue: number }>();
    for (const t of filteredTx) {
      if (t.type === 'sale') {
        for (const it of t.items || []) {
          const key = it.product_id || it.raw_scanned_name;
          const prev = pipeMap.get(key) || {
            name: it.matched_product?.name || it.raw_scanned_name,
            qty: 0,
            unit: it.unit,
            totalRevenue: 0,
          };
          prev.qty += it.quantity;
          prev.totalRevenue += it.amount;
          pipeMap.set(key, prev);
        }
      }
    }

    const topPipes = Array.from(pipeMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
    const lowStockItems = products.filter(p => p.current_stock <= p.low_stock_alert);

    return {
      totalSales,
      cashSales,
      udhaarSales,
      totalPurchases,
      totalReturns,
      customerWasooli,
      shopExpenses,
      openingGalla,
      netCashInGalla,
      topPipes,
      lowStockItems,
    };
  }, [filteredTx, filteredExpenses, products]);

  // Handle PDF Export
  const handleExportPdf = () => {
    generateEODPdfReport({
      businessName: business.business_name,
      city: business.city || 'Gujranwala / Lahore',
      phone: business.phone || '0300-9284711',
      dateRangeLabel: dateLabel,
      metrics: reportMetrics,
      transactions: filteredTx,
      expenses: filteredExpenses,
      topPipes: reportMetrics.topPipes,
      lowStockItems: reportMetrics.lowStockItems,
    });
  };

  // Handle Excel Export
  const handleExportExcel = () => {
    generateEODExcelReport({
      businessName: business.business_name,
      dateRangeLabel: dateLabel,
      metrics: reportMetrics,
      transactions: filteredTx,
      expenses: filteredExpenses,
      products,
      parties,
    });
  };

  // Handle PIN submission for Day Locking
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (pinAction === 'lock') {
      const ok = lockDay(targetDateKey, ownerPin);
      if (!ok) {
        setPinError('Incorrect Owner PIN. (Default demo PIN is 1234)');
        return;
      }
    } else {
      const ok = unlockDay(targetDateKey, ownerPin);
      if (!ok) {
        setPinError('Incorrect Owner PIN. (Default demo PIN is 1234)');
        return;
      }
    }

    setIsPinModalOpen(false);
    setOwnerPin('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ----------------- TITLE & EXPORT BUTTONS ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            End-of-Day Reports & Galla Audit (روزنامچہ و حساب)
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Reconcile physical cash drawer with sales, wasooli, and pipe stock movements.
          </p>
        </div>

        {/* 1-Click Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportPdf}
            className="h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download PDF Report</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="h-11 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* ----------------- DATE RANGE PICKER & DAY LOCK BAR ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Period Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Period:
          </span>

          {(['today', 'yesterday', 'week', 'custom'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold capitalize transition ${
                period === p
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p === 'today' ? 'Today (آج)' : p === 'yesterday' ? 'Yesterday (گزشتہ روز)' : p === 'week' ? 'This Week' : 'Custom'}
            </button>
          ))}
        </div>

        {/* Custom date range inputs */}
        {period === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
            />
          </div>
        )}

        {/* Day Lock Status & Button */}
        <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Day Lock Status
            </span>
            <span
              className={`text-xs font-bold ${
                isDayCurrentlyLocked ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {isDayCurrentlyLocked ? '🔒 Day Closed & Locked' : '🔓 Day Open for Edits'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setPinAction(isDayCurrentlyLocked ? 'unlock' : 'lock');
              setIsPinModalOpen(true);
            }}
            className={`h-10 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 ${
              isDayCurrentlyLocked
                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isDayCurrentlyLocked ? (
              <>
                <Unlock className="w-4 h-4" />
                <span>Unlock Day</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Close & Lock Day</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ----------------- GALLA RECONCILIATION & NET CASH FLOW ----------------- */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-850 text-white rounded-2xl p-5 md:p-6 shadow-floating space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              Galla Reconciliation (گلہ کا آڈٹ و موازنہ)
            </h2>
            <p className="text-xs text-slate-400">
              Audit for {dateLabel} • Verified cash in hand calculation
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Closing Physical Cash in Galla
            </span>
            <span className="text-2xl md:text-3xl font-black text-emerald-400 tabular-nums">
              Rs. {reportMetrics.netCashInGalla.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Audit Line Items Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-400 block">Opening Drawer Cash</span>
            <span className="text-base font-extrabold text-white tabular-nums mt-0.5 block">
              Rs. {reportMetrics.openingGalla.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[11px] font-bold text-emerald-400 block">+ Cash Sales (نقد فروخت)</span>
            <span className="text-base font-extrabold text-emerald-300 tabular-nums mt-0.5 block">
              Rs. {reportMetrics.cashSales.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[11px] font-bold text-emerald-400 block">+ Wasooli Recovered (وصولی)</span>
            <span className="text-base font-extrabold text-emerald-300 tabular-nums mt-0.5 block">
              Rs. {reportMetrics.customerWasooli.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[11px] font-bold text-red-400 block">- Shop Kharcha (روزنامچہ)</span>
            <span className="text-base font-extrabold text-red-300 tabular-nums mt-0.5 block">
              Rs. {reportMetrics.shopExpenses.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ----------------- FINANCIAL METRICS GRID ----------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Sales Breakdown */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Sales Volume
            </span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              Rs. {reportMetrics.totalSales.toLocaleString()}
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Cash Sales (Naqad):</span>
                <span className="font-bold text-emerald-700 tabular-nums">
                  Rs. {reportMetrics.cashSales.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Udhaar Sales (Khata):</span>
                <span className="font-bold text-amber-700 tabular-nums">
                  Rs. {reportMetrics.udhaarSales.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Purchases & Returns */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Purchases & Returns
            </span>
            <Coins className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              Rs. {reportMetrics.totalPurchases.toLocaleString()}
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Mill Stock Purchases:</span>
                <span className="font-bold tabular-nums">
                  Rs. {reportMetrics.totalPurchases.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Customer Returns (Wapsi):</span>
                <span className="font-bold text-red-700 tabular-nums">
                  Rs. {reportMetrics.totalReturns.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Status Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Day Audit & Security
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-3 h-3 rounded-full ${
                  isDayCurrentlyLocked ? 'bg-red-500' : 'bg-emerald-500'
                }`}
              />
              <span className="font-extrabold text-sm text-slate-900">
                {isDayCurrentlyLocked ? 'Locked (Staff Edits Blocked)' : 'Unlocked (Edits Allowed)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isDayCurrentlyLocked
                ? 'PIN is required to unlock and make any modifications.'
                : 'Click "Close & Lock Day" above once evening cash is counted.'}
            </p>
          </div>
        </div>
      </div>

      {/* ----------------- TOP SELLING PIPE SIZES ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Top Moving Steel Pipe Specifications ({reportMetrics.topPipes.length})
        </h3>

        {reportMetrics.topPipes.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No pipe sales in this period.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {reportMetrics.topPipes.map((p, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded bg-slate-100 font-bold text-slate-600 flex items-center justify-center text-[10px]">
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">{p.name}</span>
                    <span className="text-slate-400 block text-[11px]">
                      Sold: {p.qty} {p.unit}
                    </span>
                  </div>
                </div>

                <div className="font-black text-slate-900 tabular-nums">
                  Rs. {p.totalRevenue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ----------------- OWNER PIN MODAL ----------------- */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <span className="font-bold text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                {pinAction === 'lock' ? 'Lock Day Closing' : 'Unlock Day for Edits'}
              </span>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePinSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                {pinAction === 'lock'
                  ? 'Enter Owner PIN to lock this date against accidental staff edits.'
                  : 'Enter Owner PIN to unlock this date and allow edits.'}
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Owner Security PIN (Default Demo: 1234)
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="••••"
                  value={ownerPin}
                  onChange={e => setOwnerPin(e.target.value)}
                  className="w-full h-12 px-3 text-center text-2xl font-bold tracking-widest bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {pinError && (
                <div className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg">
                  {pinError}
                </div>
              )}

              <button
                type="submit"
                className={`w-full h-12 rounded-xl text-white font-bold text-sm shadow-md transition ${
                  pinAction === 'lock' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {pinAction === 'lock' ? 'Confirm & Lock Day' : 'Confirm & Unlock Day'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
