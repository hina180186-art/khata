'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Coins,
  CreditCard,
  AlertTriangle,
  Camera,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  X,
  Search,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { RoznamchaModal } from '@/components/layout/RoznamchaModal';
import { Transaction } from '@/lib/types';

export default function DashboardPage() {
  const { todayMetrics, transactions, paymentsAndExpenses, business } = useStore();
  const [selectedTxForModal, setSelectedTxForModal] = useState<Transaction | null>(null);
  const [isRoznamchaModalOpen, setIsRoznamchaModalOpen] = useState(false);
  const [roznamchaType, setRoznamchaType] = useState<'customer_wasooli' | 'shop_expense'>('customer_wasooli');
  const [filterMode, setFilterMode] = useState<'all' | 'sales' | 'purchases' | 'returns'>('all');

  const filteredTransactions = transactions.filter(t => {
    if (filterMode === 'sales') return t.type === 'sale';
    if (filterMode === 'purchases') return t.type === 'purchase';
    if (filterMode === 'returns') return t.type === 'sale_return';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ----------------- TOP GREETING & STORE STATUS ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Today's Live Galla & Sales Overview
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            {business.business_name} • Stainless Steel Pipe & Tube Store
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            Live Register Active
          </span>
          <span className="text-xs font-semibold text-slate-400">
            {new Date().toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ----------------- TOP SUMMARY CARDS (LIVE METRICS) ----------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Card 1: Total Sale */}
        <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Sale (کل فروخت)
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-slate-900 tabular-nums">
              Rs. {todayMetrics.totalSales.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 font-medium">
              <span className="text-emerald-600 font-bold">Cash: Rs. {todayMetrics.cashSales.toLocaleString()}</span>
              <span>•</span>
              <span className="text-amber-600 font-bold">Udhaar: Rs. {todayMetrics.udhaarSales.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Asli Cash in Galla */}
        <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Asli Cash in Galla (اصلی گلہ)
            </span>
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-emerald-800 tabular-nums">
              Rs. {todayMetrics.asliCashInGalla.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-700 mt-1 font-semibold flex items-center justify-between">
              <span>+ Wasooli: Rs. {todayMetrics.customerWasooli.toLocaleString()}</span>
              <span>- Kharcha: Rs. {todayMetrics.shopExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Today's Udhaar Given */}
        <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Today's Udhaar (آج کا ادھار)
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-amber-700 tabular-nums">
              Rs. {todayMetrics.todayUdhaarGiven.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Debited to fabricator khatay
            </div>
          </div>
        </div>

        {/* Card 4: Low Stock Alerts */}
        <Link
          href="/stock"
          className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle hover:border-amber-400 transition flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-600 transition">
              Low Stock Alerts (کم اسٹاک)
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-slate-900 tabular-nums flex items-baseline gap-2">
              <span>{todayMetrics.lowStockCount} SKUs</span>
              {todayMetrics.deadStockCount > 0 && (
                <span className="text-xs font-semibold text-red-600">
                  ({todayMetrics.deadStockCount} Dead)
                </span>
              )}
            </div>
            <div className="text-[11px] text-blue-600 font-bold mt-1 group-hover:underline">
              Tap to inspect pipe inventory →
            </div>
          </div>
        </Link>
      </div>

      {/* ----------------- QUICK ACTION GRID ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-subtle">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Zero-Typing Camera Actions (فوری ایکشنز)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* + Scan Sales Bill */}
          <Link
            href="/scan"
            className="h-14 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm flex items-center gap-3 shadow-md shadow-emerald-900/20 active:scale-[0.98] transition"
          >
            <div className="p-2 rounded-lg bg-white/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xs md:text-sm font-extrabold">+ Scan Sales Bill</div>
              <div className="text-[10px] text-emerald-100 font-normal">بیچا ہوا مال</div>
            </div>
          </Link>

          {/* + Scan Purchase / Stock */}
          <Link
            href="/scan"
            className="h-14 px-4 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm flex items-center gap-3 shadow-md shadow-blue-900/20 active:scale-[0.98] transition"
          >
            <div className="p-2 rounded-lg bg-white/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xs md:text-sm font-extrabold">+ Scan Purchase</div>
              <div className="text-[10px] text-blue-100 font-normal">آیا ہوا نیا مال</div>
            </div>
          </Link>

          {/* + Scan Return */}
          <Link
            href="/scan"
            className="h-14 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-3 shadow-md active:scale-[0.98] transition"
          >
            <div className="p-2 rounded-lg bg-white/20">
              <ArrowDownLeft className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-left">
              <div className="text-xs md:text-sm font-extrabold">+ Scan Wapsi</div>
              <div className="text-[10px] text-slate-300 font-normal">مال واپسی / ریٹرن</div>
            </div>
          </Link>

          {/* + Add Cash Kharcha / Wasooli */}
          <button
            type="button"
            onClick={() => {
              setRoznamchaType('customer_wasooli');
              setIsRoznamchaModalOpen(true);
            }}
            className="h-14 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-bold text-sm flex items-center gap-3 active:scale-[0.98] transition"
          >
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Plus className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-xs md:text-sm font-extrabold">+ Roznamcha</div>
              <div className="text-[10px] text-slate-600 font-normal">وصولی یا دکان خرچہ</div>
            </div>
          </button>
        </div>
      </div>

      {/* ----------------- RECENT SCANNED BILLS FEED ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Recent Scanned Bills Feed (حالیہ پرچیاں)
            </h2>
            <p className="text-xs text-slate-500">
              Showing paper bills parsed by camera with original katchi parchi previews.
            </p>
          </div>

          {/* Feed Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {(['all', 'sales', 'purchases', 'returns'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterMode(tab)}
                className={`py-1.5 px-3 rounded-lg capitalize transition ${
                  filterMode === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'all' ? 'All' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Camera className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">No bills found in this view.</p>
            <Link
              href="/scan"
              className="inline-block text-xs font-bold text-emerald-600 hover:underline"
            >
              Scan your first paper bill now →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map(tx => (
              <div
                key={tx.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl px-2.5 transition"
              >
                {/* Left: Party info & Parchi tag */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      tx.type === 'sale'
                        ? 'bg-emerald-100 text-emerald-800'
                        : tx.type === 'purchase'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {tx.type === 'sale' ? 'SALE' : tx.type === 'purchase' ? 'STK' : 'WAP'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {tx.party?.name || 'Walk-in Cash Customer'}
                      </span>
                      {tx.parchi_number && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                          {tx.parchi_number}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      {tx.party?.area_or_shop && (
                        <span>{tx.party.area_or_shop} •</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span className="text-slate-600 font-medium">
                        {(tx.items || []).length} item(s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Badges & Preview Trigger */}
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  {/* Routing Badge */}
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      tx.routing_mode === 'cash_sale'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {tx.routing_mode === 'cash_sale' ? '💵 Cash Sale' : '📒 Customer Khata'}
                  </span>

                  {/* Total Amount */}
                  <div className="text-right">
                    <div className="text-base font-extrabold text-slate-900 tabular-nums">
                      Rs. {tx.total_amount.toLocaleString()}
                    </div>
                    {tx.extra_charges > 0 && (
                      <div className="text-[10px] text-slate-400 font-medium">
                        + Rs. {tx.extra_charges} mazdoori
                      </div>
                    )}
                  </div>

                  {/* Bill Image / Details Preview Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedTxForModal(tx)}
                    title="Inspect handwritten bill & line items"
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ----------------- RECENT ROZNAMCHA TIMELINE ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-subtle space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Today's Roznamcha Cash Journal (روزنامچہ اندراج)
            </h3>
            <p className="text-xs text-slate-500">Direct cash in & out at shop drawer</p>
          </div>
          <button
            onClick={() => {
              setRoznamchaType('customer_wasooli');
              setIsRoznamchaModalOpen(true);
            }}
            className="text-xs font-bold text-emerald-600 hover:underline"
          >
            + Add Entry
          </button>
        </div>

        <div className="space-y-2">
          {paymentsAndExpenses.slice(0, 5).map(pe => (
            <div
              key={pe.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-lg ${
                    pe.entry_type === 'customer_wasooli'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {pe.entry_type === 'customer_wasooli' ? (
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{pe.description}</div>
                  <div className="text-[11px] text-slate-400">
                    {pe.party ? `${pe.party.name} • ` : ''}
                    {new Date(pe.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div
                className={`font-black text-sm tabular-nums ${
                  pe.entry_type === 'customer_wasooli' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {pe.entry_type === 'customer_wasooli' ? '+' : '-'} Rs. {pe.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ----------------- TRANSACTION INSPECTION MODAL ----------------- */}
      {selectedTxForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>Parchi {selectedTxForModal.parchi_number || 'Details'}</span>
                  <span className="text-xs uppercase font-normal text-slate-400">
                    ({selectedTxForModal.type})
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Party: {selectedTxForModal.party?.name || 'Walk-in Cash Counter'}
                </p>
              </div>
              <button
                onClick={() => setSelectedTxForModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Paper Bill Thumbnail */}
              {selectedTxForModal.bill_image_url && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex justify-center p-3">
                  <img
                    src={selectedTxForModal.bill_image_url}
                    alt="Paper Bill"
                    className="max-h-56 object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Items Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Extracted Line Items:
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {(selectedTxForModal.items || []).map((it, idx) => (
                    <div key={idx} className="p-3 text-xs flex items-center justify-between bg-white">
                      <div>
                        <div className="font-bold text-slate-900">
                          {it.matched_product?.name || it.raw_scanned_name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {it.quantity} {it.unit} @ Rs. {it.rate}
                        </div>
                      </div>
                      <div className="font-bold text-slate-900 tabular-nums">
                        Rs. {it.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold tabular-nums">
                    Rs. {selectedTxForModal.subtotal.toLocaleString()}
                  </span>
                </div>
                {selectedTxForModal.extra_charges > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Loading / Mazdoori:</span>
                    <span className="font-semibold tabular-nums">
                      Rs. {selectedTxForModal.extra_charges.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Bill Amount:</span>
                  <span className="tabular-nums">
                    Rs. {selectedTxForModal.total_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 font-bold">
                  <span>Routing Destination:</span>
                  <span>
                    {selectedTxForModal.routing_mode === 'cash_sale'
                      ? '💵 Cash Counter (No Ledger)'
                      : '📒 Added to Customer Udhaar'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roznamcha Modal */}
      <RoznamchaModal
        isOpen={isRoznamchaModalOpen}
        onClose={() => setIsRoznamchaModalOpen(false)}
        defaultEntryType={roznamchaType}
      />
    </div>
  );
}
