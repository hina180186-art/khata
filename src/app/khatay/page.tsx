'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  MapPin,
  TrendingUp,
  CreditCard,
  UserCheck,
  Building,
  X,
  Share2,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { Party } from '@/lib/types';
import { RoznamchaModal } from '@/components/layout/RoznamchaModal';

export default function KhatayPage() {
  const { parties, addParty } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [partyTypeTab, setPartyTypeTab] = useState<'all' | 'customer' | 'supplier'>('customer');
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [wasooliModalParty, setWasooliModalParty] = useState<Party | null>(null);

  // New Party Form
  const [newName, setNewName] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState<'customer' | 'supplier'>('customer');
  const [newBalance, setNewBalance] = useState('0');

  // Filter parties: default exclude walk_in_cash from customer ledger view unless searched
  const filteredParties = useMemo(() => {
    return parties.filter(p => {
      // Exclude walk_in_cash from the ledger list
      if (p.type === 'walk_in_cash' && !searchQuery.trim()) {
        return false;
      }

      // Tab filter
      if (partyTypeTab !== 'all' && p.type !== partyTypeTab) {
        return false;
      }

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchArea = (p.area_or_shop || '').toLowerCase().includes(q);
        const matchPhone = (p.phone || '').toLowerCase().includes(q);
        return matchName || matchArea || matchPhone;
      }

      return true;
    });
  }, [parties, partyTypeTab, searchQuery]);

  // Financial aggregates
  const summary = useMemo(() => {
    let totalCustomerUdhaar = 0;
    let totalSupplierPayable = 0;
    let totalAdvance = 0;
    let customerCount = 0;

    for (const p of parties) {
      if (p.type === 'customer') {
        customerCount++;
        if (p.current_balance > 0) {
          totalCustomerUdhaar += p.current_balance;
        } else if (p.current_balance < 0) {
          totalAdvance += Math.abs(p.current_balance);
        }
      } else if (p.type === 'supplier') {
        if (p.current_balance < 0) {
          totalSupplierPayable += Math.abs(p.current_balance);
        }
      }
    }

    return {
      totalCustomerUdhaar,
      totalSupplierPayable,
      totalAdvance,
      customerCount,
    };
  }, [parties]);

  const handleAddPartySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    addParty({
      name: newName.trim(),
      area_or_shop: newArea.trim() || undefined,
      phone: newPhone.trim() || undefined,
      type: newType,
      current_balance: parseFloat(newBalance) || 0,
    });

    setIsAddPartyModalOpen(false);
    setNewName('');
    setNewArea('');
    setNewPhone('');
    setNewBalance('0');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ----------------- TITLE & ACTION BUTTONS ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Customer & Supplier Khatay (کھاتے و ادھار)
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Fabricator ledgers with area tags to prevent same-name confusion. Shareable balance slips.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddPartyModalOpen(true)}
          className="h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>+ Add New Khata (نیا کھاتہ)</span>
        </button>
      </div>

      {/* ----------------- SUMMARY CARDS ----------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Card 1: Total Udhaar Owed to Store */}
        <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Total Udhaar Receivables (ہماری وصولی)
          </div>
          <div className="text-xl md:text-2xl font-black text-amber-700 mt-1 tabular-nums">
            Rs. {summary.totalCustomerUdhaar.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Owed by regular fabricators & customers
          </div>
        </div>

        {/* Card 2: Advance Deposits */}
        <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Advance Deposits (پیشگی جمع)
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-700 mt-1 tabular-nums">
            Rs. {summary.totalAdvance.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Credit balance with shop
          </div>
        </div>

        {/* Card 3: Supplier Payables */}
        <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle col-span-2 lg:col-span-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Supplier Payables (ٹیوب ملز بقایا)
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 mt-1 tabular-nums">
            Rs. {summary.totalSupplierPayable.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Payable to stainless tube manufacturers
          </div>
        </div>
      </div>

      {/* ----------------- SEARCH & TABS ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-subtle space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by fabricator name, area / shop (Sialkot Rd, Daska), or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto self-start">
          <button
            type="button"
            onClick={() => setPartyTypeTab('customer')}
            className={`py-1.5 px-4 rounded-lg transition ${
              partyTypeTab === 'customer'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customers / Fabricators (گاہک)
          </button>
          <button
            type="button"
            onClick={() => setPartyTypeTab('supplier')}
            className={`py-1.5 px-4 rounded-lg transition ${
              partyTypeTab === 'supplier'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Suppliers / Tube Mills (مل سپلائر)
          </button>
          <button
            type="button"
            onClick={() => setPartyTypeTab('all')}
            className={`py-1.5 px-3 rounded-lg transition ${
              partyTypeTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Khatay
          </button>
        </div>
      </div>

      {/* ----------------- PARTIES LIST ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Registered Khatay ({filteredParties.length})
          </span>
          <span className="text-xs text-slate-400">Click account for full statement & balance slip</span>
        </div>

        {filteredParties.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No matching khata accounts found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredParties.map(party => {
              const owesUdhaar = party.current_balance > 0;
              const hasAdvance = party.current_balance < 0;

              return (
                <div
                  key={party.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  {/* Left info: Name, Area Tag, Phone */}
                  <Link
                    href={`/khatay/${party.id}`}
                    className="flex-1 space-y-1 block group"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition">
                        {party.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          party.type === 'customer'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {party.type === 'customer' ? 'Customer' : 'Supplier'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {party.area_or_shop && (
                        <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {party.area_or_shop}
                        </span>
                      )}
                      {party.phone && (
                        <span className="flex items-center gap-1 font-mono text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {party.phone}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Right: Balance & Action Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {party.type === 'customer'
                          ? owesUdhaar
                            ? 'Udhaar Owed (باقیہ ادھار)'
                            : hasAdvance
                            ? 'Advance Balance (پیشگی)'
                            : 'Nil Balance'
                          : 'Mill Balance'}
                      </span>
                      <div
                        className={`text-lg font-black tabular-nums ${
                          owesUdhaar
                            ? 'text-amber-700'
                            : hasAdvance
                            ? 'text-emerald-700'
                            : 'text-slate-600'
                        }`}
                      >
                        Rs. {Math.abs(party.current_balance).toLocaleString()}
                        {hasAdvance && <span className="text-xs font-semibold ml-1">(Adv)</span>}
                      </div>
                    </div>

                    {/* Quick Wasooli Button */}
                    <button
                      type="button"
                      onClick={() => setWasooliModalParty(party)}
                      className="h-10 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                      <span>+ Wasooli</span>
                    </button>

                    {/* View Details Link */}
                    <Link
                      href={`/khatay/${party.id}`}
                      className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition"
                    >
                      <span>Statement →</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ----------------- MODAL: ADD NEW KHATA ----------------- */}
      {isAddPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold text-base">+ Add New Khata Account</h3>
              <button
                onClick={() => setIsAddPartyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPartySubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Khata Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('customer')}
                    className={`h-10 rounded-xl text-xs font-bold transition ${
                      newType === 'customer'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Customer / Fabricator
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('supplier')}
                    className={`h-10 rounded-xl text-xs font-bold transition ${
                      newType === 'supplier'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Supplier / Tube Mill
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Account Name / Ustad Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Ustad Nadeem Fabricator"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Area / Shop Tag (Confusion Blocker) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sialkot Road near Shell Pump, Kamoke Morr"
                  value={newArea}
                  onChange={e => setNewArea(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Prevents mixing up two customers with the same name.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Opening Udhaar (Rs.)
                  </label>
                  <input
                    type="number"
                    value={newBalance}
                    onChange={e => setNewBalance(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl font-bold tabular-nums"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition"
                >
                  Create Khata Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Wasooli Modal */}
      {wasooliModalParty && (
        <RoznamchaModal
          isOpen={Boolean(wasooliModalParty)}
          onClose={() => setWasooliModalParty(null)}
          defaultEntryType={wasooliModalParty.type === 'customer' ? 'customer_wasooli' : 'supplier_payment'}
        />
      )}
    </div>
  );
}
