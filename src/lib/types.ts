// SteelKhata AI - Core Type Definitions

export type UnitType = 'length' | 'kg' | 'pcs';
export type PartyType = 'customer' | 'supplier' | 'walk_in_cash';
export type TransactionType = 'sale' | 'purchase' | 'sale_return';
export type RoutingMode = 'cash_sale' | 'customer_khata';
export type PaymentMode = 'cash' | 'udhaar' | 'bank' | 'online';
export type ExpenseEntryType = 'customer_wasooli' | 'supplier_payment' | 'shop_expense';

export interface ProductAttributes {
  size: string;      // e.g. "1.5 inch", "2.0 inch", "1.0 x 1.0 inch"
  gauge: string;     // e.g. "14G", "16G", "18G", "20G", "Standard"
  grade: '304' | '201' | 'other';
  shape: 'round' | 'square' | 'rectangle' | 'cap' | 'elbow' | 'other';
}

export interface Business {
  id: string;
  owner_id?: string;
  business_name: string;
  niche: string;
  phone?: string;
  city?: string;
  currency: string;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  sku_code: string;
  unit: UnitType;
  weight_per_length?: number | null;
  current_stock: number;
  low_stock_alert: number;
  purchase_rate: number;
  sale_rate: number;
  attributes: ProductAttributes;
  aliases: string[];
  last_sold_at?: string | null;
  created_at: string;
}

export interface Party {
  id: string;
  business_id: string;
  name: string;
  area_or_shop?: string;
  phone?: string;
  type: PartyType;
  current_balance: number; // Positive = Customer owes Udhaar; Negative = Advance
  created_at: string;
}

export interface TransactionItem {
  id?: string;
  transaction_id?: string;
  product_id?: string | null;
  raw_scanned_name: string;
  quantity: number;
  unit: UnitType;
  rate: number;
  amount: number;
  // Match info
  matched_product?: Product;
}

export interface Transaction {
  id: string;
  business_id: string;
  party_id: string;
  parchi_number?: string | null;
  type: TransactionType;
  routing_mode: RoutingMode;
  payment_mode: PaymentMode;
  subtotal: number;
  extra_charges: number; // Mazdoori / Loading / Kiraya
  total_amount: number;
  paid_amount: number;
  bill_image_url?: string | null;
  is_day_locked: boolean;
  notes?: string;
  created_at: string;
  // Hydrated references
  party?: Party;
  items?: TransactionItem[];
}

export interface PaymentAndExpense {
  id: string;
  business_id: string;
  party_id?: string | null;
  entry_type: ExpenseEntryType;
  description: string;
  amount: number;
  payment_mode: PaymentMode;
  created_at: string;
  party?: Party;
}

// Scanned Parchi Parsing Result
export interface ScannedItemParsed {
  raw_text: string;
  product_id?: string;
  name_matched?: string;
  size?: string;
  gauge?: string;
  grade?: string;
  shape?: string;
  qty: number;
  unit: UnitType;
  rate: number;
  amount: number;
  confidence: number; // 0 to 1
}

export interface ParchiOCRResult {
  parchi_number?: string;
  party_name?: string;
  party_id?: string;
  detected_routing: RoutingMode;
  payment_mode: PaymentMode;
  scan_type: TransactionType;
  items: ScannedItemParsed[];
  extra_charges: number;
  total_amount: number;
  confidence_score: number;
  notes?: string;
  is_duplicate_warning?: boolean;
}
