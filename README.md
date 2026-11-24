# 🏭 SteelKhata AI (اسٹیل کھاتہ اے آئی)
### Scan-to-Khata & Smart Inventory SaaS (Phase 1 MVP)
> **Zero-Typing / Camera-First Progressive Web App (PWA)** tailored for **Stainless Steel Pipe & Tube Stores**.

---

## 🌟 Executive Overview
In traditional Pakistani hardware and steel markets (Gujranwala, Badami Bagh Lahore, Karachi, Rawalpindi), munshis and shopkeepers write handwritten bills (*katchi parchis*) on carbon paper pads. Manually retyping sizes like `"10 nali 1.5" 18G 304 @ 3350 + 500 mazdoori - Udhaar"` into software is tedious, prone to errors, and abandoned during peak shop rush.

**SteelKhata AI** solves this with a **Camera-First / Zero-Typing workflow**:
1. **Snap Paper Parchi**: Shopkeeper snaps a photo of the handwritten parchi using their mobile camera.
2. **Gemini 2.5 Flash Vision OCR**: The AI parses Pakistani English + Roman Urdu handwritten abbreviations, matches sizes against the shop's product catalog, detects routing (`Cash Sale` vs `Customer Khata`), and extracts loading/mazdoori charges.
3. **Duplicate Blocker**: Immediate warning if a parchi number was already scanned in the last 7 days.
4. **Human-in-the-Loop Review**: 1-tap `[ 💵 Cash Sale ]` vs `[ 📒 Customer Khata ]` toggle. Amber highlight for any low-confidence fields.
5. **Instant Stock Deduction & Ledger Update**: Automatic inventory adjustment (lengths/kg/pcs) and ledger balance posting.
6. **1-Click EOD Reports & Shareable Slips**: Download PDF/Excel reports, generate branded JPG Balance Slips for customers, and lock the day's books with an owner PIN.

---

## 🛠️ Tech Stack & Architecture
- **Framework:** Next.js 14+ (App Router), React 18, TypeScript
- **Styling & UI:** Tailwind CSS, Lucide React, Framer Motion, modern industrial FinTech design tokens
- **Database & Storage:** Supabase (PostgreSQL with Row-Level Security, multi-tenant `business_id` schema)
- **AI Vision OCR Engine:** Google Gemini 2.5 Flash API (`@google/generative-ai`) via Next.js Server Route (`/api/scan-bill`) with graceful intelligent fallback
- **Client-Side Document Generators:**
  - `jspdf` + `jspdf-autotable` (Formatted PDF accounting audits)
  - `xlsx` (Multi-tab Excel workbook exports)
  - HTML5 Canvas (Urdu/English branded Balance Slip JPG generator)
- **Offline & Demo Readiness:** Persistent client store synchronized with demo Pakistani steel store catalog and transactions.

---

## 📁 Project Structure
```
khata system/
├── supabase/
│   └── schema.sql              # Complete PostgreSQL schema, RLS policies, & Pakistani steel seed data
├── public/
│   └── manifest.json           # PWA manifest for mobile home screen installation
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── scan-bill/
│   │   │       └── route.ts    # Gemini 2.5 Flash Vision OCR endpoint + intelligent fuzzy match fallback
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Live Galla metrics, Quick Action grid, recent bills feed & inspection
│   │   ├── scan/
│   │   │   └── page.tsx        # Camera capture, Batch mode (1-15 bills), duplicate blocker, review card
│   │   ├── stock/
│   │   │   └── page.tsx        # Smart steel inventory, size/gauge/grade filters, physical register scanner
│   │   ├── khatay/
│   │   │   ├── page.tsx        # Fabricator khatay list, area tags (Nadeem - Sialkot Rd), wasooli trigger
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Chronological statement, original paper parchi modal, JPG balance slip generator
│   │   ├── reports/
│   │   │   └── page.tsx        # EOD closing audit, Galla reconciliation, PDF & Excel export, Owner PIN day lock
│   │   ├── globals.css         # Modern industrial FinTech design tokens & tabular numerals
│   │   ├── layout.tsx          # Root layout with StoreProvider & AppShell
│   │   └── page.tsx            # Redirects to /dashboard
│   ├── components/
│   │   └── layout/
│   │       ├── AppShell.tsx    # Responsive Desktop Sidebar + Mobile Bottom Nav with floating Camera button
│   │       └── RoznamchaModal.tsx # Quick Wasooli / Shop Expense cash journal modal
│   └── lib/
│       ├── types.ts            # Strict TypeScript domain interfaces
│       ├── mockData.ts         # 15 Pakistani stainless steel pipe SKUs (201/304), 6 parties, sample parchis
│       ├── store.tsx           # React Context store with localStorage persistence & inventory auto-adjust
│       ├── supabase.ts         # Supabase client initialization
│       ├── pdfExport.ts        # jsPDF + autotable report generator
│       └── excelExport.ts      # XLSX workbook multi-tab report generator
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── .env.local.example
└── README.md
```

---

## 🗄️ Multi-Business Database Schema (`supabase/schema.sql`)
1. **`businesses`**: `id (uuid)`, `business_name`, `niche ('steel_pipes')`, `phone`, `city`, `currency ('PKR')`, `created_at`
2. **`products`**: `id (uuid)`, `business_id`, `name`, `sku_code`, `unit ('length' | 'kg' | 'pcs')`, `weight_per_length`, `current_stock`, `low_stock_alert`, `purchase_rate`, `sale_rate`, `attributes (jsonb: size, gauge, grade, shape)`, `aliases (text[])`, `last_sold_at`
3. **`parties`**: `id (uuid)`, `business_id`, `name`, `area_or_shop` *(prevents duplicate name confusion)*, `phone`, `type ('customer' | 'supplier' | 'walk_in_cash')`, `current_balance` *(Positive = Customer owes Udhaar; Negative = Advance)*
4. **`transactions`**: `id (uuid)`, `business_id`, `party_id`, `parchi_number`, `type ('sale' | 'purchase' | 'sale_return')`, `routing_mode ('cash_sale' | 'customer_khata')`, `payment_mode ('cash' | 'udhaar' | 'bank')`, `subtotal`, `extra_charges` *(Mazdoori / Loading / Kiraya)*, `total_amount`, `paid_amount`, `bill_image_url`, `is_day_locked`
5. **`transaction_items`**: `id (uuid)`, `transaction_id`, `product_id`, `raw_scanned_name`, `quantity`, `unit`, `rate`, `amount`
6. **`payments_and_expenses`**: `id (uuid)`, `business_id`, `party_id`, `entry_type ('customer_wasooli' | 'supplier_payment' | 'shop_expense')`, `description`, `amount`, `payment_mode`

---

## 🚀 Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
# Optional: Google Gemini 2.5 Flash API Key for live AI Vision OCR
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Supabase PostgreSQL (App has built-in offline/demo storage fallback)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
*(Note: If `GEMINI_API_KEY` is not provided, the scanner automatically uses the built-in intelligent simulated parser, so you can test all flows immediately!)*

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser or phone.

---

## 📱 Mobile-First Ergonomics & Urdu Nomenclature
- **Bottom Navigation Bar (Mobile):** `Dashboard`, `Stock`, Central Floating Camera `Scan`, `Khatay`, `Reports`.
- **Large Touch Targets:** Minimum 48px height with tabular numerals (`tabular-nums`) for currency (`PKR / Rs.`).
- **Pakistani Steel Shop Lexicon:**
  - *Nali (نالی)* = 20-foot standard pipe length
  - *Dhedh Inchi (ڈیڑھ انچی)* = 1.5" pipe
  - *Do Inchi (دو انچی)* = 2.0" pipe
  - *Chakor / Chauras (چورس)* = Square box tube
  - *Gol (گول)* = Round pipe
  - *Topi (ٹوپی)* = Ball cap fitting
  - *Mazdoori / Loading (مزدوری)* = Extra labor/freight charges
  - *Wasooli (وصولی)* = Debt payment recovery
  - *Maal Wapsi (مال واپسی)* = Customer return
  - *Roznamcha (روزنامچہ)* = Daily cash register journal
  - *Asli Galla (اصلی گلہ)* = Physical cash in shop cash drawer

---

## 🔒 Security & Strict Constraints (Phase 1 MVP)
- **Zero Background Crons / Automated Messaging:** As constrained, no n8n, WhatsApp Cloud API, or unattended cron tasks are included.
- **1-Click Manual Triggers:** All balance slips and reports are generated on-demand by user click.
- **Day Closing Lock:** Lock the daily ledger with an Owner PIN (Default: `1234`) to prevent staff edits after cash count.
