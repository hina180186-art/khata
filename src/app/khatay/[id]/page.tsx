'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Phone,
  MapPin,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Camera,
  Share2,
  Download,
  Calendar,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { RoznamchaModal } from '@/components/layout/RoznamchaModal';
import { Transaction } from '@/lib/types';

export default function PartyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const partyId = params.id as string;

  const { parties, transactions, paymentsAndExpenses, business } = useStore();

  const [isWasooliOpen, setIsWasooliOpen] = useState(false);
  const [selectedTxForModal, setSelectedTxForModal] = useState<Transaction | null>(null);
  const [balanceSlipDataUrl, setBalanceSlipDataUrl] = useState<string | null>(null);
  const [isGeneratingSlip, setIsGeneratingSlip] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const party = parties.find(p => p.id === partyId);

  // Collect chronological ledger items for this party
  const ledgerItems = useMemo(() => {
    if (!party) return [];

    const partyTxs = transactions
      .filter(t => t.party_id === partyId)
      .map(t => ({
        id: t.id,
        date: t.created_at,
        kind: 'transaction' as const,
        type: t.type,
        parchi_number: t.parchi_number,
        title:
          t.type === 'sale'
            ? `Sale Bill #${t.parchi_number || ''}`
            : t.type === 'sale_return'
            ? `Maal Wapsi #${t.parchi_number || ''}`
            : `Purchase #${t.parchi_number || ''}`,
        description: t.notes || `${(t.items || []).length} pipe item(s)`,
        debit: t.type === 'sale' ? t.total_amount : 0, // Debit increases customer Udhaar
        credit: t.type === 'sale_return' ? t.total_amount : t.paid_amount > 0 ? t.paid_amount : 0,
        tx: t,
      }));

    const partyPayments = paymentsAndExpenses
      .filter(p => p.party_id === partyId)
      .map(p => ({
        id: p.id,
        date: p.created_at,
        kind: 'payment' as const,
        type: p.entry_type,
        parchi_number: null,
        title: p.entry_type === 'customer_wasooli' ? 'Wasooli Received (نقد وصولی)' : 'Supplier Payment',
        description: p.description,
        debit: p.entry_type === 'supplier_payment' ? p.amount : 0,
        credit: p.entry_type === 'customer_wasooli' ? p.amount : 0,
        tx: null,
      }));

    const combined = [...partyTxs, ...partyPayments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return combined;
  }, [party, transactions, paymentsAndExpenses, partyId]);

  if (!party) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Khata Account Not Found</h2>
        <Link
          href="/khatay"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Khatay List
        </Link>
      </div>
    );
  }

  const owesUdhaar = party.current_balance > 0;
  const hasAdvance = party.current_balance < 0;

  // Generate crisp high-craft HTML5 Canvas Balance Slip (JPG)
  const generateBalanceSlip = () => {
    setIsGeneratingSlip(true);

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 750;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0F172A'; // Deep Navy brand header
    ctx.fillRect(0, 0, 600, 160);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 160, 600, 590);

    // Header Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(business.business_name.toUpperCase(), 300, 48);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${business.city || 'Gujranwala / Lahore'} • Ph: ${business.phone || '0300-9284711'}`, 300, 75);

    // Sub header badge
    ctx.fillStyle = '#059669';
    ctx.fillRect(200, 95, 200, 30);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('KHATA BALANCE SLIP (کھاتہ پرچی)', 300, 115);

    // Customer Card
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(30, 185, 540, 100);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(30, 185, 540, 100);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('ACCOUNT NAME (گاہک کا نام):', 50, 215);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(party.name, 50, 240);

    ctx.fillStyle = '#475569';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Area: ${party.area_or_shop || 'General Area'}  •  Date: ${new Date().toLocaleDateString('en-PK')}`, 50, 265);

    // Balance Display Box
    ctx.fillStyle = owesUdhaar ? '#FEF2F2' : '#ECFDF5';
    ctx.fillRect(30, 310, 540, 150);
    ctx.strokeStyle = owesUdhaar ? '#FCA5A5' : '#A7F3D0';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 310, 540, 150);

    ctx.textAlign = 'center';
    ctx.fillStyle = owesUdhaar ? '#991B1B' : '#065F46';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(
      owesUdhaar
        ? 'TOTAL UDHAAR BALANCE OWED (کل قابل ادائیگی رقم)'
        : 'ADVANCE DEPOSIT BALANCE (پیشگی جمع)',
      300,
      350
    );

    ctx.fillStyle = owesUdhaar ? '#DC2626' : '#059669';
    ctx.font = 'bold 38px monospace';
    ctx.fillText(`Rs. ${Math.abs(party.current_balance).toLocaleString()}`, 300, 405);

    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.fillText('(Rupees Pakistani Currency)', 300, 435);

    // Recent Statement Summary lines
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('LAST RECORDED TRANSACTIONS:', 40, 490);

    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(40, 505);
    ctx.lineTo(560, 505);
    ctx.stroke();

    let y = 535;
    const topItems = ledgerItems.slice(0, 3);
    for (const it of topItems) {
      ctx.fillStyle = '#334155';
      ctx.font = '12px sans-serif';
      ctx.fillText(`• ${new Date(it.date).toLocaleDateString()} - ${it.title}`, 45, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = it.debit > 0 ? '#B45309' : '#059669';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(it.debit > 0 ? `+ Rs. ${it.debit.toLocaleString()}` : `- Rs. ${it.credit.toLocaleString()}`, 555, y);
      ctx.textAlign = 'left';

      y += 28;
    }

    // Urdu Courtesy Footer Note
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(0, 670, 600, 80);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('براہ کرم بقایا رقم کی جلد ادائیگی فرما کر رسید حاصل کریں۔ شکریہ!', 300, 705);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Generated digitally by SteelKhata AI (Stainless Steel Store OS)', 300, 730);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setBalanceSlipDataUrl(dataUrl);
    setIsGeneratingSlip(false);
  };

  const handleDownloadSlip = () => {
    if (!balanceSlipDataUrl) return;
    const link = document.createElement('a');
    link.href = balanceSlipDataUrl;
    link.download = `Khata_Slip_${party.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.jpg`;
    link.click();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ----------------- TOP BREADCRUMB & ACTIONS ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/khatay"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Khatay List
        </Link>

        <div className="flex items-center gap-2">
          {/* Share Balance Slip Button */}
          <button
            type="button"
            onClick={generateBalanceSlip}
            className="h-10 px-3.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Balance Slip (JPG)</span>
          </button>

          {/* + Record Wasooli Button */}
          <button
            type="button"
            onClick={() => setIsWasooliOpen(true)}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Record Wasooli (وصولی)</span>
          </button>
        </div>
      </div>

      {/* ----------------- PARTY HEADER CARD ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {party.name}
            </h1>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                party.type === 'customer' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}
            >
              {party.type === 'customer' ? 'Customer / Fabricator' : 'Supplier'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
            {party.area_or_shop && (
              <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {party.area_or_shop}
              </span>
            )}
            {party.phone && (
              <span className="flex items-center gap-1 font-mono font-semibold text-slate-700">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {party.phone}
              </span>
            )}
          </div>
        </div>

        {/* Current Balance Display */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left md:text-right min-w-[200px]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            {owesUdhaar
              ? 'Current Udhaar Owed (باقیہ ادھار)'
              : hasAdvance
              ? 'Advance Deposit (پیشگی جمع)'
              : 'Nil Balance'}
          </span>
          <div
            className={`text-2xl md:text-3xl font-black tabular-nums mt-0.5 ${
              owesUdhaar ? 'text-amber-700' : hasAdvance ? 'text-emerald-700' : 'text-slate-800'
            }`}
          >
            Rs. {Math.abs(party.current_balance).toLocaleString()}
            {hasAdvance && <span className="text-xs font-semibold ml-1">(Advance)</span>}
          </div>
        </div>
      </div>

      {/* ----------------- CHRONOLOGICAL LEDGER STATEMENT ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle space-y-4">
        <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Chronological Ledger Statement (کھاتہ تفصیل)
            </h2>
            <p className="text-xs text-slate-500">
              Complete history of bills, returns, and cash wasooli with original parchi photos.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {ledgerItems.length} Entries
          </span>
        </div>

        {ledgerItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">No transactions recorded for this khata yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {ledgerItems.map(item => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
              >
                {/* Left: Date & Type icon & Title */}
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl flex-shrink-0 ${
                      item.debit > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {item.debit > 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">{item.title}</span>
                      {item.parchi_number && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                          {item.parchi_number}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.description}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Debit / Credit amount & Original Parchi inspect trigger */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {item.debit > 0 ? 'Bill (بنام / ادھار)' : 'Wasooli (جمع / وصولی)'}
                    </span>
                    <div
                      className={`text-base font-black tabular-nums ${
                        item.debit > 0 ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {item.debit > 0 ? `+ Rs. ${item.debit.toLocaleString()}` : `- Rs. ${item.credit.toLocaleString()}`}
                    </div>
                  </div>

                  {item.tx && item.tx.bill_image_url && (
                    <button
                      type="button"
                      onClick={() => setSelectedTxForModal(item.tx)}
                      title="Inspect original handwritten paper bill"
                      className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ----------------- BALANCE SLIP MODAL & PREVIEW ----------------- */}
      {balanceSlipDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <span className="font-bold text-sm">Balance Summary Slip (کھاتہ سلپ)</span>
              <button
                onClick={() => setBalanceSlipDataUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex justify-center bg-slate-100">
              <img
                src={balanceSlipDataUrl}
                alt="Balance Slip"
                className="max-h-[60vh] object-contain rounded-xl shadow-md border border-slate-200"
              />
            </div>

            <div className="p-4 border-t border-slate-200 bg-white flex items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadSlip}
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95"
              >
                <Download className="w-5 h-5" />
                <span>Save JPG Image to Device</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceSlipDataUrl(null)}
                className="h-12 px-5 rounded-xl border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- ORIGINAL PARCHI INSPECTION MODAL ----------------- */}
      {selectedTxForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <span className="font-bold text-sm">Original Handwritten Parchi</span>
                <span className="text-xs text-slate-400 block">Parchi #{selectedTxForModal.parchi_number}</span>
              </div>
              <button
                onClick={() => setSelectedTxForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {selectedTxForModal.bill_image_url && (
                <div className="flex justify-center p-2 rounded-xl bg-slate-100 border border-slate-200">
                  <img
                    src={selectedTxForModal.bill_image_url}
                    alt="Parchi"
                    className="max-h-60 rounded object-contain"
                  />
                </div>
              )}

              {/* Items Breakdown */}
              <div className="space-y-1.5 border border-slate-200 rounded-xl p-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Parchi Items:
                </span>
                {(selectedTxForModal.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <div>
                      <span className="font-bold text-slate-800">{it.matched_product?.name || it.raw_scanned_name}</span>
                      <span className="block text-[11px] text-slate-400 font-mono">
                        {it.quantity} {it.unit} @ Rs. {it.rate}
                      </span>
                    </div>
                    <span className="font-bold tabular-nums text-slate-900">
                      Rs. {it.amount.toLocaleString()}
                    </span>
                  </div>
                ))}

                {selectedTxForModal.extra_charges > 0 && (
                  <div className="flex justify-between text-xs pt-1 text-slate-600 font-semibold">
                    <span>Loading Mazdoori:</span>
                    <span>Rs. {selectedTxForModal.extra_charges.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Bill Amount:</span>
                  <span className="tabular-nums">Rs. {selectedTxForModal.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roznamcha Wasooli Modal */}
      <RoznamchaModal
        isOpen={isWasooliOpen}
        onClose={() => setIsWasooliOpen(false)}
        defaultEntryType="customer_wasooli"
      />
    </div>
  );
}
