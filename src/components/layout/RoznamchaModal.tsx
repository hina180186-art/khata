'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { X, PlusCircle, ArrowDownLeft, ArrowUpRight, DollarSign } from 'lucide-react';

interface RoznamchaModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntryType?: 'customer_wasooli' | 'shop_expense' | 'supplier_payment';
}

export const RoznamchaModal: React.FC<RoznamchaModalProps> = ({
  isOpen,
  onClose,
  defaultEntryType = 'customer_wasooli',
}) => {
  const { parties, addPaymentOrExpense } = useStore();
  const [entryType, setEntryType] = useState<'customer_wasooli' | 'shop_expense' | 'supplier_payment'>(defaultEntryType);
  const [partyId, setPartyId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'bank' | 'online'>('cash');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const filteredParties = parties.filter(p => {
    if (entryType === 'customer_wasooli') return p.type === 'customer';
    if (entryType === 'supplier_payment') return p.type === 'supplier';
    return false;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    let desc = description.trim();
    if (!desc) {
      if (entryType === 'customer_wasooli') desc = 'Cash Wasooli received at shop';
      else if (entryType === 'shop_expense') desc = 'Shop daily expense';
      else desc = 'Payment to supplier';
    }

    addPaymentOrExpense({
      party_id: entryType !== 'shop_expense' ? partyId : null,
      entry_type: entryType,
      description: desc,
      amount: numAmount,
      payment_mode: paymentMode,
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      setAmount('');
      setDescription('');
      setPartyId('');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-floating border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Roznamcha Entry (روزنامچہ)
            </h2>
            <p className="text-xs text-slate-500">Record Cash In (Wasooli) or Cash Out (Kharcha)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selector Tabs */}
        <div className="grid grid-cols-3 p-2 bg-slate-100 gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setEntryType('customer_wasooli');
              setPartyId('');
            }}
            className={`py-2.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              entryType === 'customer_wasooli'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Wasooli (وصولی)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryType('shop_expense');
              setPartyId('');
            }}
            className={`py-2.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              entryType === 'shop_expense'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Kharcha (خرچہ)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryType('supplier_payment');
              setPartyId('');
            }}
            className={`py-2.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              entryType === 'supplier_payment'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Supplier Pay</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {entryType !== 'shop_expense' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Select {entryType === 'customer_wasooli' ? 'Customer / Fabricator' : 'Supplier'} *
              </label>
              <select
                required
                value={partyId}
                onChange={e => setPartyId(e.target.value)}
                className="w-full h-12 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose Party --</option>
                {filteredParties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.area_or_shop ? `(${p.area_or_shop})` : ''} - Bal: Rs. {p.current_balance.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Amount (Rs. / روپے) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">Rs.</span>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white border border-slate-300 rounded-xl text-slate-900 text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Description / Tafseel (تفصیل)
            </label>
            <input
              type="text"
              placeholder={
                entryType === 'customer_wasooli'
                  ? 'e.g., Cash received from Nadeem Bhai at shop'
                  : entryType === 'shop_expense'
                  ? 'e.g., Generator petrol, chai & nashta, mazdoori'
                  : 'e.g., Payment against invoice'
              }
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'bank', 'online'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`h-10 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    paymentMode === mode
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mode === 'cash' ? '💵 Cash / نقد' : mode === 'bank' ? '🏦 Bank' : '📱 Online'}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSuccess}
              className={`w-full h-12 rounded-xl text-white font-bold text-base shadow-md transition flex items-center justify-center gap-2 ${
                isSuccess
                  ? 'bg-emerald-600'
                  : entryType === 'customer_wasooli'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : entryType === 'shop_expense'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSuccess ? (
                <span>✓ Entry Recorded!</span>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5" />
                  <span>
                    Record {entryType === 'customer_wasooli' ? 'Wasooli' : entryType === 'shop_expense' ? 'Kharcha' : 'Payment'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
