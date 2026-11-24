'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Business,
  Product,
  Party,
  Transaction,
  PaymentAndExpense,
  TransactionItem,
} from './types';
import {
  DEMO_BUSINESS,
  DEMO_PARTIES,
  DEMO_PRODUCTS,
  DEMO_TRANSACTIONS,
  DEMO_PAYMENTS_AND_EXPENSES,
} from './mockData';

interface AddTransactionInput {
  party_id: string;
  parchi_number?: string | null;
  type: 'sale' | 'purchase' | 'sale_return';
  routing_mode: 'cash_sale' | 'customer_khata';
  payment_mode: 'cash' | 'udhaar' | 'bank' | 'online';
  items: Array<{
    product_id?: string | null;
    raw_scanned_name: string;
    quantity: number;
    unit: 'length' | 'kg' | 'pcs';
    rate: number;
    amount: number;
  }>;
  extra_charges: number;
  total_amount: number;
  paid_amount: number;
  bill_image_url?: string | null;
  notes?: string;
  created_at?: string;
}

interface AddExpenseInput {
  party_id?: string | null;
  entry_type: 'customer_wasooli' | 'supplier_payment' | 'shop_expense';
  description: string;
  amount: number;
  payment_mode: 'cash' | 'bank' | 'online';
  created_at?: string;
}

interface StoreContextType {
  business: Business;
  products: Product[];
  parties: Party[];
  transactions: Transaction[];
  paymentsAndExpenses: PaymentAndExpense[];
  isLockedDate: (dateStr: string) => boolean;
  lockedDates: string[];
  lockDay: (dateStr: string, pin: string) => boolean;
  unlockDay: (dateStr: string, pin: string) => boolean;
  // Mutations
  addTransaction: (input: AddTransactionInput) => { success: boolean; error?: string; transaction?: Transaction };
  checkDuplicateParchi: (parchiNumber: string) => { isDuplicate: boolean; existingTx?: Transaction };
  addPaymentOrExpense: (input: AddExpenseInput) => PaymentAndExpense;
  addProduct: (product: Omit<Product, 'id' | 'business_id' | 'created_at'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addParty: (party: Omit<Party, 'id' | 'business_id' | 'created_at'>) => Party;
  resetToDemoData: () => void;
  // Metrics
  todayMetrics: {
    totalSales: number;
    cashSales: number;
    udhaarSales: number;
    totalPurchases: number;
    totalReturns: number;
    customerWasooli: number;
    shopExpenses: number;
    asliCashInGalla: number;
    todayUdhaarGiven: number;
    lowStockCount: number;
    deadStockCount: number;
  };
}

const StoreContext = createContext<StoreContextType | null>(null);

const STORAGE_KEYS = {
  PRODUCTS: 'steelkhata_products_v1',
  PARTIES: 'steelkhata_parties_v1',
  TRANSACTIONS: 'steelkhata_transactions_v1',
  PAYMENTS: 'steelkhata_payments_v1',
  LOCKED_DATES: 'steelkhata_locked_dates_v1',
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [business] = useState<Business>(DEMO_BUSINESS);
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [parties, setParties] = useState<Party[]>(DEMO_PARTIES);
  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TRANSACTIONS);
  const [paymentsAndExpenses, setPaymentsAndExpenses] = useState<PaymentAndExpense[]>(DEMO_PAYMENTS_AND_EXPENSES);
  const [lockedDates, setLockedDates] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const storedParties = localStorage.getItem(STORAGE_KEYS.PARTIES);
      const storedTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const storedPay = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      const storedLocks = localStorage.getItem(STORAGE_KEYS.LOCKED_DATES);

      if (storedProds) setProducts(JSON.parse(storedProds));
      if (storedParties) setParties(JSON.parse(storedParties));
      if (storedTx) setTransactions(JSON.parse(storedTx));
      if (storedPay) setPaymentsAndExpenses(JSON.parse(storedPay));
      if (storedLocks) setLockedDates(JSON.parse(storedLocks));
    } catch (e) {
      console.warn('Could not read from localStorage, using initial mock data', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      localStorage.setItem(STORAGE_KEYS.PARTIES, JSON.stringify(parties));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(paymentsAndExpenses));
      localStorage.setItem(STORAGE_KEYS.LOCKED_DATES, JSON.stringify(lockedDates));
    } catch (e) {
      console.error('Error writing to localStorage', e);
    }
  }, [products, parties, transactions, paymentsAndExpenses, lockedDates, isHydrated]);

  const resetToDemoData = () => {
    setProducts(DEMO_PRODUCTS);
    setParties(DEMO_PARTIES);
    setTransactions(DEMO_TRANSACTIONS);
    setPaymentsAndExpenses(DEMO_PAYMENTS_AND_EXPENSES);
    setLockedDates([]);
    localStorage.clear();
  };

  const isLockedDate = (dateStr: string) => {
    const key = new Date(dateStr).toISOString().split('T')[0];
    return lockedDates.includes(key);
  };

  const lockDay = (dateStr: string, pin: string) => {
    if (pin !== '1234' && pin !== '0000') {
      return false;
    }
    const key = new Date(dateStr).toISOString().split('T')[0];
    if (!lockedDates.includes(key)) {
      setLockedDates(prev => [...prev, key]);
    }
    return true;
  };

  const unlockDay = (dateStr: string, pin: string) => {
    if (pin !== '1234' && pin !== '0000') {
      return false;
    }
    const key = new Date(dateStr).toISOString().split('T')[0];
    setLockedDates(prev => prev.filter(d => d !== key));
    return true;
  };

  // Duplicate parchi blocker: checks last 7 days
  const checkDuplicateParchi = (parchiNumber: string) => {
    if (!parchiNumber || !parchiNumber.trim()) {
      return { isDuplicate: false };
    }
    const cleanNum = parchiNumber.trim().toLowerCase();
    const sevenDaysAgo = Date.now() - 7 * 86400000;

    const existingTx = transactions.find(t => {
      if (!t.parchi_number) return false;
      const isMatch = t.parchi_number.trim().toLowerCase() === cleanNum;
      const isRecent = new Date(t.created_at).getTime() >= sevenDaysAgo;
      return isMatch && isRecent;
    });

    return {
      isDuplicate: Boolean(existingTx),
      existingTx,
    };
  };

  // Add Transaction with automated inventory adjustments & Khata balancing
  const addTransaction = (input: AddTransactionInput) => {
    const txDate = input.created_at || new Date().toISOString();

    if (isLockedDate(txDate)) {
      return {
        success: false,
        error: 'This date is locked by the owner. Unlock the day with your PIN before adding transactions.',
      };
    }

    const newTxId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const items: TransactionItem[] = input.items.map((it, idx) => ({
      id: `ti_${newTxId}_${idx}`,
      transaction_id: newTxId,
      product_id: it.product_id || null,
      raw_scanned_name: it.raw_scanned_name,
      quantity: Number(it.quantity) || 0,
      unit: it.unit,
      rate: Number(it.rate) || 0,
      amount: Number(it.amount) || (Number(it.quantity) * Number(it.rate)),
    }));

    const newTransaction: Transaction = {
      id: newTxId,
      business_id: business.id,
      party_id: input.party_id,
      parchi_number: input.parchi_number ? input.parchi_number.trim() : null,
      type: input.type,
      routing_mode: input.routing_mode,
      payment_mode: input.payment_mode,
      subtotal: input.items.reduce((sum, item) => sum + (Number(item.amount) || (item.quantity * item.rate)), 0),
      extra_charges: Number(input.extra_charges) || 0,
      total_amount: Number(input.total_amount) || 0,
      paid_amount: Number(input.paid_amount) || 0,
      bill_image_url: input.bill_image_url || null,
      is_day_locked: false,
      notes: input.notes,
      created_at: txDate,
      items,
    };

    // 1. Adjust Stock
    setProducts(prevProducts => {
      const updated = [...prevProducts];
      for (const item of items) {
        if (!item.product_id) continue;
        const prodIndex = updated.findIndex(p => p.id === item.product_id);
        if (prodIndex !== -1) {
          const currentStock = updated[prodIndex].current_stock;
          let newStock = currentStock;

          if (input.type === 'sale') {
            newStock = Math.max(0, currentStock - item.quantity);
          } else if (input.type === 'purchase' || input.type === 'sale_return') {
            newStock = currentStock + item.quantity;
          }

          updated[prodIndex] = {
            ...updated[prodIndex],
            current_stock: newStock,
            last_sold_at: input.type === 'sale' ? new Date().toISOString() : updated[prodIndex].last_sold_at,
          };
        }
      }
      return updated;
    });

    // 2. Adjust Party Balance if routing_mode is customer_khata
    if (input.routing_mode === 'customer_khata') {
      setParties(prevParties => {
        return prevParties.map(p => {
          if (p.id !== input.party_id) return p;

          let balanceDiff = 0;
          if (input.type === 'sale') {
            // Customer owes what is unpaid
            const unpaid = newTransaction.total_amount - newTransaction.paid_amount;
            balanceDiff = unpaid;
          } else if (input.type === 'sale_return') {
            // Return reduces customer's balance
            balanceDiff = -newTransaction.total_amount;
          } else if (input.type === 'purchase') {
            // Purchase increases supplier credit
            balanceDiff = -(newTransaction.total_amount - newTransaction.paid_amount);
          }

          return {
            ...p,
            current_balance: p.current_balance + balanceDiff,
          };
        });
      });
    }

    setTransactions(prev => [newTransaction, ...prev]);

    return {
      success: true,
      transaction: newTransaction,
    };
  };

  // Add Roznamcha payment / wasooli / expense
  const addPaymentOrExpense = (input: AddExpenseInput) => {
    const entryDate = input.created_at || new Date().toISOString();
    const newId = 'pe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const newEntry: PaymentAndExpense = {
      id: newId,
      business_id: business.id,
      party_id: input.party_id || null,
      entry_type: input.entry_type,
      description: input.description,
      amount: Number(input.amount) || 0,
      payment_mode: input.payment_mode,
      created_at: entryDate,
    };

    // If customer wasooli, reduce party balance
    if (input.entry_type === 'customer_wasooli' && input.party_id) {
      setParties(prev =>
        prev.map(p =>
          p.id === input.party_id
            ? { ...p, current_balance: p.current_balance - Number(input.amount) }
            : p
        )
      );
    } else if (input.entry_type === 'supplier_payment' && input.party_id) {
      setParties(prev =>
        prev.map(p =>
          p.id === input.party_id
            ? { ...p, current_balance: p.current_balance + Number(input.amount) }
            : p
        )
      );
    }

    setPaymentsAndExpenses(prev => [newEntry, ...prev]);
    return newEntry;
  };

  const addProduct = (prodInput: Omit<Product, 'id' | 'business_id' | 'created_at'>) => {
    const newProduct: Product = {
      ...prodInput,
      id: 'p_' + Date.now(),
      business_id: business.id,
      created_at: new Date().toISOString(),
    };
    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const addParty = (partyInput: Omit<Party, 'id' | 'business_id' | 'created_at'>) => {
    const newParty: Party = {
      ...partyInput,
      id: 'c_' + Date.now(),
      business_id: business.id,
      created_at: new Date().toISOString(),
    };
    setParties(prev => [...prev, newParty]);
    return newParty;
  };

  // Compute live dashboard metrics
  const todayMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const isToday = (dateStr: string) => {
      return new Date(dateStr).toISOString().split('T')[0] === todayStr;
    };

    const todayTxs = transactions.filter(t => isToday(t.created_at));
    const todayExpenses = paymentsAndExpenses.filter(e => isToday(e.created_at));

    let cashSales = 0;
    let udhaarSales = 0;
    let totalPurchases = 0;
    let totalReturns = 0;
    let todayUdhaarGiven = 0;

    for (const tx of todayTxs) {
      if (tx.type === 'sale') {
        if (tx.routing_mode === 'cash_sale' || tx.payment_mode === 'cash') {
          cashSales += tx.total_amount;
        } else {
          udhaarSales += tx.total_amount;
          todayUdhaarGiven += (tx.total_amount - tx.paid_amount);
        }
      } else if (tx.type === 'purchase') {
        totalPurchases += tx.total_amount;
      } else if (tx.type === 'sale_return') {
        totalReturns += tx.total_amount;
      }
    }

    let customerWasooli = 0;
    let shopExpenses = 0;

    for (const exp of todayExpenses) {
      if (exp.entry_type === 'customer_wasooli') {
        customerWasooli += exp.amount;
      } else if (exp.entry_type === 'shop_expense') {
        shopExpenses += exp.amount;
      }
    }

    // Galla Calculation: Cash Sales + Wasooli - Shop Expenses
    // (Assuming opening galla cash baseline)
    const openingGalla = 15000;
    const asliCashInGalla = openingGalla + cashSales + customerWasooli - shopExpenses;

    const lowStockCount = products.filter(p => p.current_stock <= p.low_stock_alert).length;
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const deadStockCount = products.filter(p => {
      if (!p.last_sold_at) return true;
      return new Date(p.last_sold_at).getTime() < thirtyDaysAgo;
    }).length;

    return {
      totalSales: cashSales + udhaarSales,
      cashSales,
      udhaarSales,
      totalPurchases,
      totalReturns,
      customerWasooli,
      shopExpenses,
      asliCashInGalla,
      todayUdhaarGiven,
      lowStockCount,
      deadStockCount,
    };
  }, [transactions, paymentsAndExpenses, products]);

  // Hydrate transactions and payments with party and product details
  const hydratedTransactions = useMemo(() => {
    return transactions.map(tx => {
      const party = parties.find(p => p.id === tx.party_id);
      const hydratedItems = (tx.items || []).map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          ...item,
          matched_product: product,
        };
      });
      return {
        ...tx,
        party,
        items: hydratedItems,
      };
    });
  }, [transactions, parties, products]);

  const hydratedPayments = useMemo(() => {
    return paymentsAndExpenses.map(p => {
      const party = p.party_id ? parties.find(party => party.id === p.party_id) : undefined;
      return {
        ...p,
        party,
      };
    });
  }, [paymentsAndExpenses, parties]);

  return (
    <StoreContext.Provider
      value={{
        business,
        products,
        parties,
        transactions: hydratedTransactions,
        paymentsAndExpenses: hydratedPayments,
        isLockedDate,
        lockedDates,
        lockDay,
        unlockDay,
        addTransaction,
        checkDuplicateParchi,
        addPaymentOrExpense,
        addProduct,
        updateProduct,
        addParty,
        resetToDemoData,
        todayMetrics,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
