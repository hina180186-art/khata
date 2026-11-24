'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  DollarSign,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Eye,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { SAMPLE_TEST_PARCHIS } from '@/lib/mockData';
import { TransactionType, RoutingMode, PaymentMode, UnitType } from '@/lib/types';

interface ReviewItem {
  id: string;
  raw_text: string;
  product_id: string;
  size?: string;
  gauge?: string;
  grade?: string;
  shape?: string;
  qty: number;
  unit: UnitType;
  rate: number;
  amount: number;
  confidence: number;
}

interface BatchBill {
  id: string;
  imageUrl: string;
  scanType: TransactionType;
  parchi_number: string;
  party_name: string;
  party_id: string;
  routing_mode: RoutingMode;
  payment_mode: PaymentMode;
  items: ReviewItem[];
  extra_charges: number;
  total_amount: number;
  paid_amount: number;
  confidence_score: number;
  notes: string;
  isDuplicate: boolean;
  duplicateInfo?: string;
  status: 'pending_review' | 'saved';
}

export default function ScannerPage() {
  const router = useRouter();
  const { products, parties, addTransaction, checkDuplicateParchi } = useStore();

  // Active Scan Type Tab
  const [scanType, setScanType] = useState<TransactionType>('sale');

  // Batch Bills queue
  const [bills, setBills] = useState<BatchBill[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Loading & Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Bill Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Success flash
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const currentBill = bills[currentIndex] || null;

  // Whenever parchi_number changes on current bill, verify duplicate
  useEffect(() => {
    if (currentBill && currentBill.parchi_number) {
      const dupCheck = checkDuplicateParchi(currentBill.parchi_number);
      if (dupCheck.isDuplicate && dupCheck.existingTx) {
        setBills(prev => {
          const copy = [...prev];
          copy[currentIndex] = {
            ...copy[currentIndex],
            isDuplicate: true,
            duplicateInfo: `Parchi #${dupCheck.existingTx?.parchi_number} was already saved on ${new Date(
              dupCheck.existingTx?.created_at || ''
            ).toLocaleDateString()} (${dupCheck.existingTx?.party?.name || 'Walk-in'})`,
          };
          return copy;
        });
      } else if (currentBill.isDuplicate) {
        setBills(prev => {
          const copy = [...prev];
          copy[currentIndex] = {
            ...copy[currentIndex],
            isDuplicate: false,
            duplicateInfo: undefined,
          };
          return copy;
        });
      }
    }
  }, [currentBill?.parchi_number]);

  // Handle uploaded files (Supports 1 to 15 batch files)
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus(`Processing ${files.length} bill(s) with Gemini OCR...`);

    const newBillsQueue: BatchBill[] = [];

    for (let i = 0; i < Math.min(files.length, 15); i++) {
      const file = files[i];
      setProcessingStatus(`Reading bill ${i + 1} of ${files.length}...`);

      const base64 = await readFileAsBase64(file);

      try {
        const res = await fetch('/api/scan-bill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            scanType,
            parties,
            products,
          }),
        });

        const json = await res.json();
        const ocrData = json.data || {};

        // Route detection
        let detectedRouting: RoutingMode = ocrData.detected_routing || (scanType === 'purchase' ? 'customer_khata' : 'cash_sale');
        let matchedPartyId = ocrData.matched_party_id;

        // If no party matched or cash sale, pick default Walk-in
        if (!matchedPartyId) {
          if (detectedRouting === 'cash_sale') {
            const walkIn = parties.find(p => p.type === 'walk_in_cash');
            matchedPartyId = walkIn ? walkIn.id : parties[0]?.id;
          } else {
            // Fuzzy search party
            const foundParty = parties.find(p =>
              p.name.toLowerCase().includes((ocrData.party_name || '').toLowerCase())
            );
            matchedPartyId = foundParty ? foundParty.id : parties[1]?.id || parties[0]?.id;
          }
        }

        // Parse items
        const rawItems = ocrData.items || [];
        const items: ReviewItem[] = rawItems.map((it: any, idx: number) => {
          const matchedProd = products.find(p => p.id === it.matched_product_id) || products[0];
          return {
            id: `item_${Date.now()}_${idx}`,
            raw_text: it.raw_text || matchedProd.name,
            product_id: matchedProd.id,
            size: it.size || matchedProd.attributes?.size,
            gauge: it.gauge || matchedProd.attributes?.gauge,
            grade: it.grade || matchedProd.attributes?.grade,
            shape: it.shape || matchedProd.attributes?.shape,
            qty: Number(it.qty) || 1,
            unit: (it.unit as UnitType) || matchedProd.unit || 'length',
            rate: Number(it.rate) || (scanType === 'purchase' ? matchedProd.purchase_rate : matchedProd.sale_rate),
            amount: Number(it.amount) || ((Number(it.qty) || 1) * (Number(it.rate) || matchedProd.sale_rate)),
            confidence: it.confidence !== undefined ? Number(it.confidence) : 0.9,
          };
        });

        // If no items extracted, populate default line
        if (items.length === 0) {
          const defProd = products[0];
          items.push({
            id: `item_${Date.now()}_0`,
            raw_text: defProd.name,
            product_id: defProd.id,
            qty: 10,
            unit: 'length',
            rate: defProd.sale_rate,
            amount: 10 * defProd.sale_rate,
            confidence: 0.8,
          });
        }

        const extraCharges = Number(ocrData.extra_charges) || 0;
        const subtotal = items.reduce((s, it) => s + it.amount, 0);
        const total = subtotal + extraCharges;
        const paid = detectedRouting === 'cash_sale' ? total : 0;

        const parchiNum = ocrData.parchi_number || `P-${Math.floor(1000 + Math.random() * 9000)}`;
        const dupCheck = checkDuplicateParchi(parchiNum);

        newBillsQueue.push({
          id: `bill_${Date.now()}_${i}`,
          imageUrl: base64,
          scanType,
          parchi_number: parchiNum,
          party_name: ocrData.party_name || (detectedRouting === 'cash_sale' ? 'Cash Counter / Walk-in' : 'Ustad Nadeem Fabricator'),
          party_id: matchedPartyId,
          routing_mode: detectedRouting,
          payment_mode: ocrData.payment_mode || (detectedRouting === 'cash_sale' ? 'cash' : 'udhaar'),
          items,
          extra_charges: extraCharges,
          total_amount: total,
          paid_amount: paid,
          confidence_score: Number(ocrData.confidence_score) || 0.92,
          notes: ocrData.notes || '',
          isDuplicate: dupCheck.isDuplicate,
          duplicateInfo: dupCheck.isDuplicate ? `Parchi #${parchiNum} was recently saved in system!` : undefined,
          status: 'pending_review',
        });
      } catch (err) {
        console.error('OCR parse error for file', err);
      }
    }

    if (newBillsQueue.length > 0) {
      setBills(prev => [...prev, ...newBillsQueue]);
      if (bills.length === 0) {
        setCurrentIndex(0);
      }
    }

    setIsProcessing(false);
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Instant 1-tap Test with Sample Pakistani Katchi Parchi
  const handleLoadSampleParchi = (sampleIndex: number) => {
    const sample = SAMPLE_TEST_PARCHIS[sampleIndex];
    if (!sample) return;

    const matchedParty = parties.find(p => p.name.includes(sample.party_name)) || parties[0];

    const items: ReviewItem[] = sample.items.map((it, idx) => ({
      id: `sample_it_${Date.now()}_${idx}`,
      raw_text: it.raw_text,
      product_id: it.product_id,
      size: it.size,
      gauge: it.gauge,
      grade: it.grade,
      shape: it.shape,
      qty: it.qty,
      unit: it.unit,
      rate: it.rate,
      amount: it.amount,
      confidence: it.confidence,
    }));

    const dupCheck = checkDuplicateParchi(sample.parchi_number);

    // SVG handwritten parchi mock illustration
    const mockSvgUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520"><rect width="400" height="520" fill="%23fffef0"/><rect x="15" y="15" width="370" height="490" fill="none" stroke="%23cbd5e1" stroke-width="2"/><text x="30" y="55" font-family="monospace" font-size="18" font-weight="bold" fill="%230f172a">Al-Madina Steel - ${sample.parchi_number}</text><text x="30" y="85" font-family="sans-serif" font-size="14" fill="%23475569">Party: ${sample.party_name}</text><line x1="25" y1="105" x2="375" y2="105" stroke="%2394a3b8"/><text x="30" y="140" font-family="monospace" font-size="15" fill="%231e293b">${items[0]?.raw_text || ''}</text>${items[1] ? `<text x="30" y="175" font-family="monospace" font-size="15" fill="%231e293b">${items[1].raw_text}</text>` : ''}<text x="30" y="215" font-family="monospace" font-size="14" fill="%2364748b">Mazdoori / Loading: Rs. ${sample.extra_charges}</text><line x1="25" y1="240" x2="375" y2="240" stroke="%2394a3b8"/><text x="30" y="280" font-family="sans-serif" font-size="20" font-weight="bold" fill="%23059669">TOTAL: Rs. ${sample.total_amount.toLocaleString()}</text><rect x="30" y="320" width="160" height="35" rx="6" fill="%23e2e8f0"/><text x="40" y="343" font-family="sans-serif" font-size="12" fill="%231e293b">${sample.routing === 'cash_sale' ? 'Naqad / Cash' : 'Udhaar Khata'}</text></svg>`;

    const newBill: BatchBill = {
      id: `sample_bill_${Date.now()}`,
      imageUrl: mockSvgUrl,
      scanType: sample.type,
      parchi_number: sample.parchi_number,
      party_name: sample.party_name,
      party_id: matchedParty.id,
      routing_mode: sample.routing,
      payment_mode: sample.payment_mode,
      items,
      extra_charges: sample.extra_charges,
      total_amount: sample.total_amount,
      paid_amount: sample.routing === 'cash_sale' ? sample.total_amount : 0,
      confidence_score: sample.confidence_score,
      notes: sample.notes,
      isDuplicate: dupCheck.isDuplicate,
      duplicateInfo: dupCheck.isDuplicate ? `Parchi #${sample.parchi_number} was already saved in system!` : undefined,
      status: 'pending_review',
    };

    setScanType(sample.type);
    setBills(prev => [newBill, ...prev]);
    setCurrentIndex(0);
  };

  // Mutators for current review card
  const updateCurrentBill = (updates: Partial<BatchBill>) => {
    setBills(prev => {
      const copy = [...prev];
      copy[currentIndex] = {
        ...copy[currentIndex],
        ...updates,
      };
      return copy;
    });
  };

  const handleRoutingChange = (newRouting: RoutingMode) => {
    if (!currentBill) return;
    if (newRouting === 'cash_sale') {
      const walkInParty = parties.find(p => p.type === 'walk_in_cash');
      updateCurrentBill({
        routing_mode: 'cash_sale',
        payment_mode: 'cash',
        party_id: walkInParty ? walkInParty.id : currentBill.party_id,
        paid_amount: currentBill.total_amount,
      });
    } else {
      // customer_khata
      const firstCustomer = parties.find(p => p.type === 'customer') || parties[0];
      updateCurrentBill({
        routing_mode: 'customer_khata',
        payment_mode: 'udhaar',
        party_id: firstCustomer.id,
        paid_amount: 0,
      });
    }
  };

  const handleItemChange = (itemId: string, field: keyof ReviewItem, value: any) => {
    if (!currentBill) return;
    const updatedItems = currentBill.items.map(it => {
      if (it.id !== itemId) return it;

      const updated = { ...it, [field]: value };

      // If product_id changed, auto-update default rate & attributes
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          updated.rate = currentBill.scanType === 'purchase' ? prod.purchase_rate : prod.sale_rate;
          updated.unit = prod.unit;
          updated.size = prod.attributes.size;
          updated.gauge = prod.attributes.gauge;
          updated.grade = prod.attributes.grade;
          updated.shape = prod.attributes.shape;
        }
      }

      // Recalculate item amount
      if (field === 'qty' || field === 'rate' || field === 'product_id') {
        updated.amount = (Number(updated.qty) || 0) * (Number(updated.rate) || 0);
      }

      return updated;
    });

    const subtotal = updatedItems.reduce((s, it) => s + it.amount, 0);
    const newTotal = subtotal + (Number(currentBill.extra_charges) || 0);

    updateCurrentBill({
      items: updatedItems,
      total_amount: newTotal,
      paid_amount: currentBill.routing_mode === 'cash_sale' ? newTotal : currentBill.paid_amount,
    });
  };

  const handleExtraChargesChange = (val: number) => {
    if (!currentBill) return;
    const subtotal = currentBill.items.reduce((s, it) => s + it.amount, 0);
    const newTotal = subtotal + val;
    updateCurrentBill({
      extra_charges: val,
      total_amount: newTotal,
      paid_amount: currentBill.routing_mode === 'cash_sale' ? newTotal : currentBill.paid_amount,
    });
  };

  const handleAddItem = () => {
    if (!currentBill) return;
    const defProd = products[0];
    const newItem: ReviewItem = {
      id: `it_${Date.now()}`,
      raw_text: defProd.name,
      product_id: defProd.id,
      size: defProd.attributes.size,
      gauge: defProd.attributes.gauge,
      grade: defProd.attributes.grade,
      shape: defProd.attributes.shape,
      qty: 5,
      unit: 'length',
      rate: currentBill.scanType === 'purchase' ? defProd.purchase_rate : defProd.sale_rate,
      amount: 5 * (currentBill.scanType === 'purchase' ? defProd.purchase_rate : defProd.sale_rate),
      confidence: 1.0,
    };

    const updatedItems = [...currentBill.items, newItem];
    const subtotal = updatedItems.reduce((s, it) => s + it.amount, 0);
    const newTotal = subtotal + currentBill.extra_charges;

    updateCurrentBill({
      items: updatedItems,
      total_amount: newTotal,
      paid_amount: currentBill.routing_mode === 'cash_sale' ? newTotal : currentBill.paid_amount,
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!currentBill || currentBill.items.length <= 1) return;
    const updatedItems = currentBill.items.filter(it => it.id !== itemId);
    const subtotal = updatedItems.reduce((s, it) => s + it.amount, 0);
    const newTotal = subtotal + currentBill.extra_charges;

    updateCurrentBill({
      items: updatedItems,
      total_amount: newTotal,
      paid_amount: currentBill.routing_mode === 'cash_sale' ? newTotal : currentBill.paid_amount,
    });
  };

  // Confirm and commit transaction to store
  const handleConfirmAndSave = () => {
    if (!currentBill) return;

    const res = addTransaction({
      party_id: currentBill.party_id,
      parchi_number: currentBill.parchi_number,
      type: currentBill.scanType,
      routing_mode: currentBill.routing_mode,
      payment_mode: currentBill.payment_mode,
      items: currentBill.items.map(it => ({
        product_id: it.product_id,
        raw_scanned_name: it.raw_text,
        quantity: it.qty,
        unit: it.unit,
        rate: it.rate,
        amount: it.amount,
      })),
      extra_charges: currentBill.extra_charges,
      total_amount: currentBill.total_amount,
      paid_amount: currentBill.paid_amount,
      bill_image_url: currentBill.imageUrl,
      notes: currentBill.notes,
    });

    if (!res.success) {
      alert(res.error || 'Failed to save transaction');
      return;
    }

    setSaveSuccessMessage(
      `✓ Bill ${currentBill.parchi_number || ''} saved successfully! Stock & ledger updated.`
    );
    setTimeout(() => setSaveSuccessMessage(null), 3000);

    // Remove saved bill from queue
    setBills(prev => prev.filter((_, idx) => idx !== currentIndex));
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Title & Scan Type Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            Scan-to-Khata AI (کچی پرچی اسکینر)
          </h1>
          <p className="text-xs md:text-sm text-slate-600">
            Snap paper bill or stock slip. AI reads handwritten pipe sizes, deducts stock & updates Udhaar.
          </p>
        </div>

        {/* Scan Type Selector Tabs */}
        <div className="grid grid-cols-3 bg-slate-200/80 p-1 rounded-xl text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setScanType('sale')}
            className={`py-2 px-3 rounded-lg transition ${
              scanType === 'sale'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <span>Sale (بیچا ہوا مال)</span>
          </button>
          <button
            type="button"
            onClick={() => setScanType('purchase')}
            className={`py-2 px-3 rounded-lg transition ${
              scanType === 'purchase'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <span>Purchase (آیا مال)</span>
          </button>
          <button
            type="button"
            onClick={() => setScanType('sale_return')}
            className={`py-2 px-3 rounded-lg transition ${
              scanType === 'sale_return'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <span>Wapsi (مال واپسی)</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-sm flex items-center justify-between animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs font-bold text-emerald-700 underline flex items-center gap-1 hover:text-emerald-900"
          >
            View on Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Camera Capture / Dropzone Card (when no bill is being reviewed or adding more to batch) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              Capture or Upload Paper Bills
            </h2>
            <p className="text-xs text-slate-500">
              Batch Mode: Select 1 to 15 bill photos at once for fast evening closing.
            </p>
          </div>

          {bills.length > 0 && (
            <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Queue: {bills.length} bill(s) loaded
            </div>
          )}
        </div>

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => cameraInputRef.current?.click()}
            className="h-16 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold flex items-center justify-center gap-3 shadow-md shadow-emerald-900/20 active:scale-[0.98] transition"
          >
            <Camera className="w-6 h-6" />
            <div className="text-left">
              <div className="text-sm">Snap Camera Photo (کیمرہ کھولیں)</div>
              <div className="text-[11px] font-normal text-emerald-100">Direct phone camera capture</div>
            </div>
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="h-16 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-3 shadow-md active:scale-[0.98] transition"
          >
            <Upload className="w-6 h-6 text-blue-400" />
            <div className="text-left">
              <div className="text-sm">Upload Photos / Batch (1-15 Bills)</div>
              <div className="text-[11px] font-normal text-slate-300">From gallery or file manager</div>
            </div>
          </button>
        </div>

        {/* Quick Sample Presets for Instant 1-tap testing without phone camera */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              1-Tap Test Sample Pakistani Katchi Parchis:
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SAMPLE_TEST_PARCHIS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleLoadSampleParchi(idx)}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition group"
              >
                <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                  {s.parchi_number}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{s.party_name}</div>
                <div className="text-[10px] font-bold text-emerald-600 mt-1">
                  Rs. {s.total_amount.toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3 animate-pulse">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            <div>
              <p className="text-xs font-bold text-blue-900">{processingStatus}</p>
              <p className="text-[11px] text-blue-700">Fuzzy matching stainless steel pipe specs & fabricator names...</p>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- HUMAN-IN-THE-LOOP QUICK REVIEW CARD ----------------- */}
      {currentBill && (
        <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 md:p-6 shadow-floating space-y-5 animate-in fade-in">
          {/* Header & Batch Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center">
                #{currentIndex + 1}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900">
                    Human-in-the-Loop Review ({currentBill.parchi_number})
                  </h3>
                  {/* Confidence Badge */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      currentBill.confidence_score >= 0.9
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    AI Confidence: {Math.round(currentBill.confidence_score * 100)}%
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Verify extracted line items below. Amber fields can be adjusted directly.
                </p>
              </div>
            </div>

            {/* Batch Navigation Buttons */}
            {bills.length > 1 && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-slate-500 font-semibold">
                  Bill {currentIndex + 1} of {bills.length}
                </span>
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentIndex === bills.length - 1}
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* DUPLICATE PARCHI BLOCKER ALERT */}
          {currentBill.isDuplicate && (
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 flex items-start gap-3 animate-in shake">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs flex-1">
                <div className="font-extrabold text-amber-900 text-sm">
                  ⚠️ Duplicate Parchi Warning (مشتبہ ڈپلیکیٹ پرچی)
                </div>
                <p className="mt-0.5 text-amber-800">
                  {currentBill.duplicateInfo || `Parchi #${currentBill.parchi_number} was already scanned within the last 7 days.`}
                </p>
                <p className="mt-1 font-semibold text-amber-900">
                  Please change the Parchi # or verify to prevent double-charging or duplicate stock deduction.
                </p>
              </div>
            </div>
          )}

          {/* 1-TAP TOGGLE: CASH SALE vs CUSTOMER KHATA */}
          <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Routing Destination (کہاں جائے؟):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleRoutingChange('cash_sale')}
                className={`h-14 px-4 rounded-xl font-bold text-sm flex items-center justify-between border-2 transition ${
                  currentBill.routing_mode === 'cash_sale'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-5 h-5" />
                  <div className="text-left">
                    <div>💵 Cash Sale (No Ledger)</div>
                    <div className={`text-[11px] font-normal ${currentBill.routing_mode === 'cash_sale' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      Naqad Counter / Galla In
                    </div>
                  </div>
                </div>
                {currentBill.routing_mode === 'cash_sale' && (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleRoutingChange('customer_khata')}
                className={`h-14 px-4 rounded-xl font-bold text-sm flex items-center justify-between border-2 transition ${
                  currentBill.routing_mode === 'customer_khata'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5" />
                  <div className="text-left">
                    <div>📒 Customer Khata (Add Udhaar)</div>
                    <div className={`text-[11px] font-normal ${currentBill.routing_mode === 'customer_khata' ? 'text-blue-100' : 'text-slate-500'}`}>
                      Add to Customer Ledger
                    </div>
                  </div>
                </div>
                {currentBill.routing_mode === 'customer_khata' && (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Party and Parchi Number Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Parchi Number */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Parchi # (پرچی نمبر)
              </label>
              <input
                type="text"
                value={currentBill.parchi_number}
                onChange={e => updateCurrentBill({ parchi_number: e.target.value })}
                className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Party Selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                {currentBill.routing_mode === 'cash_sale'
                  ? 'Party Name (Cash Counter default)'
                  : 'Customer / Fabricator Account *'}
              </label>
              <select
                value={currentBill.party_id}
                onChange={e => {
                  const selParty = parties.find(p => p.id === e.target.value);
                  updateCurrentBill({
                    party_id: e.target.value,
                    party_name: selParty?.name || currentBill.party_name,
                  });
                }}
                className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {parties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.area_or_shop ? `— ${p.area_or_shop}` : ''} (Bal: Rs. {p.current_balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scanned Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Parchi Line Items ({currentBill.items.length})
              </label>
              <div className="flex items-center gap-2">
                {currentBill.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewImage(currentBill.imageUrl)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Original Paper Parchi</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Item</span>
                </button>
              </div>
            </div>

            {/* Line Items List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {currentBill.items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3 text-xs flex flex-col md:flex-row md:items-center gap-3 ${
                    item.confidence < 0.85 ? 'bg-amber-50/70 border-l-4 border-l-amber-400' : 'bg-white'
                  }`}
                >
                  {/* Raw OCR Line text & Index */}
                  <div className="md:w-1/4">
                    <span className="font-bold text-slate-400 mr-1.5">#{idx + 1}</span>
                    <input
                      type="text"
                      value={item.raw_text}
                      onChange={e => handleItemChange(item.id, 'raw_text', e.target.value)}
                      placeholder="Scanned text"
                      className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs font-mono"
                    />
                  </div>

                  {/* Product Match Dropdown */}
                  <div className="md:w-1/3">
                    <select
                      value={item.product_id}
                      onChange={e => handleItemChange(item.id, 'product_id', e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-slate-900 font-semibold text-xs"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.current_stock} {p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity & Unit */}
                  <div className="flex items-center gap-1.5 md:w-1/6">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      value={item.qty}
                      onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)}
                      className="w-16 h-8 px-2 text-center bg-white border border-slate-300 rounded font-bold tabular-nums"
                    />
                    <select
                      value={item.unit}
                      onChange={e => handleItemChange(item.id, 'unit', e.target.value as UnitType)}
                      className="h-8 px-1.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-bold"
                    >
                      <option value="length">Length (نالی)</option>
                      <option value="kg">Kg (کلو)</option>
                      <option value="pcs">Pcs (عدد)</option>
                    </select>
                  </div>

                  {/* Rate */}
                  <div className="flex items-center gap-1 md:w-1/6">
                    <span className="text-slate-400 text-[10px] font-bold">@ Rs.</span>
                    <input
                      type="number"
                      min="0"
                      value={item.rate}
                      onChange={e => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-full h-8 px-2 text-right bg-white border border-slate-300 rounded font-bold tabular-nums"
                    />
                  </div>

                  {/* Line Total & Remove Button */}
                  <div className="flex items-center justify-between md:justify-end gap-2 md:w-1/6">
                    <div className="font-extrabold text-slate-900 tabular-nums text-sm text-right">
                      Rs. {item.amount.toLocaleString()}
                    </div>
                    {currentBill.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mazdoori / Extra Charges & Totals Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-auto flex items-center gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Extra Charges (مزدوری / کرایہ / لوڈنگ)
                </label>
                <div className="relative w-44">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    value={currentBill.extra_charges}
                    onChange={e => handleExtraChargesChange(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 pl-10 pr-3 bg-white border border-slate-300 rounded-xl font-bold tabular-nums text-sm"
                  />
                </div>
              </div>

              {currentBill.routing_mode === 'customer_khata' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Cash Paid Now (نقد وصولی)
                  </label>
                  <div className="relative w-40">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">Rs.</span>
                    <input
                      type="number"
                      min="0"
                      value={currentBill.paid_amount}
                      onChange={e => updateCurrentBill({ paid_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full h-10 pl-10 pr-3 bg-white border border-slate-300 rounded-xl font-bold tabular-nums text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Total Display */}
            <div className="w-full md:w-auto text-right">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500 block">
                Total Bill Amount (کل رقم)
              </span>
              <div className="text-2xl md:text-3xl font-black text-slate-900 tabular-nums">
                Rs. {currentBill.total_amount.toLocaleString()}
              </div>
              {currentBill.routing_mode === 'customer_khata' && (
                <div className="text-xs font-bold text-amber-700 mt-0.5">
                  Udhaar Balance to add: Rs. {(currentBill.total_amount - currentBill.paid_amount).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Confirm & Save Button */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleConfirmAndSave}
              className="w-full sm:flex-1 h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>Confirm & Save to Khata (محفوظ کریں)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBills(prev => prev.filter((_, idx) => idx !== currentIndex));
                if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
              }}
              className="w-full sm:w-auto h-14 px-6 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-sm transition"
            >
              Discard Parchi
            </button>
          </div>
        </div>
      )}

      {/* Bill Image Inspection Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-900 text-white">
              <span className="font-bold text-sm">Original Handwritten Parchi Photo</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[75vh] overflow-auto flex justify-center bg-slate-100">
              <img
                src={previewImage}
                alt="Original Parchi"
                className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
