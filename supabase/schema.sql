-- ====================================================================
-- STEELKHATA AI: Multi-Business SaaS Schema & Seed Data
-- Tailored for Stainless Steel Pipe & Tube Store (Phase 1 MVP)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Businesses (Multi-tenant Foundation)
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NULL,
    business_name TEXT NOT NULL,
    niche TEXT NOT NULL DEFAULT 'steel_pipes',
    phone TEXT,
    city TEXT,
    currency TEXT NOT NULL DEFAULT 'PKR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Products (Tailored for Stainless Steel Pipes, Tubes & Fittings)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku_code TEXT NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('length', 'kg', 'pcs')),
    weight_per_length NUMERIC(10, 2) NULL,
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    low_stock_alert NUMERIC(12, 2) NOT NULL DEFAULT 10,
    purchase_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    sale_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    aliases TEXT[] DEFAULT ARRAY[]::TEXT[],
    last_sold_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku_code);

-- 4. Parties (Customers, Fabricators, Suppliers, Walk-ins)
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    area_or_shop TEXT,
    phone TEXT,
    type TEXT NOT NULL CHECK (type IN ('customer', 'supplier', 'walk_in_cash')),
    current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0, -- Positive = Customer owes Udhaar; Negative = Advance
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parties_business ON parties(business_id);
CREATE INDEX IF NOT EXISTS idx_parties_type ON parties(type);

-- 5. Transactions (Sales, Purchases, Returns)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    parchi_number TEXT NULL,
    type TEXT NOT NULL CHECK (type IN ('sale', 'purchase', 'sale_return')),
    routing_mode TEXT NOT NULL CHECK (routing_mode IN ('cash_sale', 'customer_khata')),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'udhaar', 'bank')),
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    extra_charges NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Mazdoori / Loading / Kiraya
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    bill_image_url TEXT NULL,
    is_day_locked BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_business ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_party ON transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_parchi ON transactions(parchi_number);

-- 6. Transaction Items (Line items of katchi parchi)
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID NULL REFERENCES products(id) ON DELETE SET NULL,
    raw_scanned_name TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'length',
    rate NUMERIC(12, 2) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_tx ON transaction_items(transaction_id);

-- 7. Payments and Expenses (Roznamcha & Wasooli)
CREATE TABLE IF NOT EXISTS payments_and_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    party_id UUID NULL REFERENCES parties(id) ON DELETE SET NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('customer_wasooli', 'supplier_payment', 'shop_expense')),
    description TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'bank', 'online')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_expenses_biz ON payments_and_expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_expenses_type ON payments_and_expenses(entry_type);

-- 8. Row-Level Security (RLS) Setup
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_and_expenses ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for Phase 1 demo or authenticated users
CREATE POLICY "Public full access for demo" ON businesses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access for demo" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access for demo" ON parties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access for demo" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access for demo" ON transaction_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access for demo" ON payments_and_expenses FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- SEED DATA: Pakistani Stainless Steel Pipe Store Demo
-- ====================================================================

-- 1. Seed Business
INSERT INTO businesses (id, business_name, niche, phone, city)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Al-Madina Stainless Steel & Pipe Store',
    'steel_pipes',
    '0300-9284711',
    'Gujranwala / Lahore'
) ON CONFLICT (id) DO NOTHING;

-- 2. Seed Parties
-- 1 System default Walk-in party
INSERT INTO parties (id, business_id, name, area_or_shop, phone, type, current_balance)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Cash Counter / Walk-in',
    'Counter Sale',
    NULL,
    'walk_in_cash',
    0
) ON CONFLICT (id) DO NOTHING;

-- 5 Regular Fabricator / Customer Khatay
INSERT INTO parties (id, business_id, name, area_or_shop, phone, type, current_balance)
VALUES
(
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'Ustad Nadeem Fabricator',
    'Sialkot Road near Shell Pump',
    '0321-7654321',
    'customer',
    48500.00 -- Customer owes Udhaar
),
(
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'Rana Tariq Steel Works',
    'G.T. Road Morr, Kamoke',
    '0301-4433221',
    'customer',
    112000.00 -- High Udhaar
),
(
    'c0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    'Bismillah Railing & Gate Center',
    'Peoples Colony No. 2',
    '0333-8877665',
    'customer',
    24300.00
),
(
    'c0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001',
    'Chaudhry Akram & Sons',
    'Main Bazar, Daska',
    '0312-9988776',
    'customer',
    -15000.00 -- Advance payment
),
(
    'c0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000001',
    'Iqbal Stainless Tube Mills (Supplier)',
    'Badami Bagh, Lahore',
    '0300-8451299',
    'supplier',
    -340000.00 -- We owe supplier
)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed 15 Stainless Steel SKUs (Pipes, Tubes, Grades 201 & 304, Various Gauges)
INSERT INTO products (id, business_id, name, sku_code, unit, weight_per_length, current_stock, low_stock_alert, purchase_rate, sale_rate, attributes, aliases, last_sold_at)
VALUES
(
    'p0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '1.5" Round Pipe 18G - Grade 304 (Dhedh Inchi Gol)',
    'SS-304-RD-1.5-18G',
    'length',
    6.80,
    42.00,
    15.00,
    2850.00,
    3350.00,
    '{"size": "1.5 inch", "gauge": "18G", "grade": "304", "shape": "round"}'::jsonb,
    ARRAY['1.5 18g 304', 'dhedh inchi 304 18g', '1-1/2 round 304', '1.5 nali 304'],
    NOW() - INTERVAL '2 hours'
),
(
    'p0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    '2.0" Round Pipe 16G - Grade 304 (Do Inchi Bhaari Gol)',
    'SS-304-RD-2.0-16G',
    'length',
    10.50,
    8.00, -- LOW STOCK!
    12.00,
    4500.00,
    5200.00,
    '{"size": "2.0 inch", "gauge": "16G", "grade": "304", "shape": "round"}'::jsonb,
    ARRAY['2 inch 16g 304', 'do inchi gol 16g', '2 round 304', '2 nali 16g'],
    NOW() - INTERVAL '1 day'
),
(
    'p0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    '1.0" Round Pipe 18G - Grade 304 (Ek Inchi Gol)',
    'SS-304-RD-1.0-18G',
    'length',
    4.50,
    65.00,
    20.00,
    1950.00,
    2300.00,
    '{"size": "1.0 inch", "gauge": "18G", "grade": "304", "shape": "round"}'::jsonb,
    ARRAY['1 inch 18g 304', 'ek inchi 304', '1 round 304', '1 nali 18g'],
    NOW() - INTERVAL '4 hours'
),
(
    'p0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    '0.75" Round Pipe 20G - Grade 304 (Paun Inchi Gol)',
    'SS-304-RD-0.75-20G',
    'length',
    2.90,
    5.00, -- LOW STOCK!
    15.00,
    1300.00,
    1550.00,
    '{"size": "0.75 inch", "gauge": "20G", "grade": "304", "shape": "round"}'::jsonb,
    ARRAY['3/4 20g 304', 'paun inchi 304', '0.75 round 304', 'paun nali'],
    NOW() - INTERVAL '3 hours'
),
(
    'p0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001',
    '0.5" Round Pipe 18G - Grade 304 (Aadhi Inchi Gol)',
    'SS-304-RD-0.5-18G',
    'length',
    2.10,
    30.00,
    10.00,
    950.00,
    1150.00,
    '{"size": "0.5 inch", "gauge": "18G", "grade": "304", "shape": "round"}'::jsonb,
    ARRAY['1/2 18g 304', 'aadhi inchi 304', '0.5 round', 'half inch round'],
    NOW() - INTERVAL '5 days'
),
(
    'p0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000001',
    '1.5" x 1.5" Square Box Pipe 16G - Grade 304 (Chakor Tube)',
    'SS-304-SQ-1.5-16G',
    'length',
    8.90,
    18.00,
    10.00,
    3900.00,
    4550.00,
    '{"size": "1.5 inch", "gauge": "16G", "grade": "304", "shape": "square"}'::jsonb,
    ARRAY['1.5 chakor 304', '1.5x1.5 box pipe 16g', 'dhedh chauras 304'],
    NOW() - INTERVAL '1 day'
),
(
    'p0000000-0000-0000-0000-000000000007',
    'b0000000-0000-0000-0000-000000000001',
    '1.0" x 1.0" Square Box Pipe 18G - Grade 304 (Ek Inchi Chakor)',
    'SS-304-SQ-1.0-18G',
    'length',
    5.60,
    26.00,
    12.00,
    2500.00,
    2950.00,
    '{"size": "1.0 inch", "gauge": "18G", "grade": "304", "shape": "square"}'::jsonb,
    ARRAY['1x1 box pipe 18g 304', '1 inch chauras', 'ek inchi chakor 304'],
    NOW() - INTERVAL '6 hours'
),
(
    'p0000000-0000-0000-0000-000000000008',
    'b0000000-0000-0000-0000-000000000001',
    '2.0" x 1.0" Rectangular Tube 16G - Grade 304 (Do Ba Ek Patti Tube)',
    'SS-304-RC-2x1-16G',
    'length',
    8.20,
    14.00,
    8.00,
    3700.00,
    4300.00,
    '{"size": "2.0 x 1.0 inch", "gauge": "16G", "grade": "304", "shape": "rectangle"}'::jsonb,
    ARRAY['2x1 rectangle 304', 'do ba ek patti 16g', '2x1 pipe 304'],
    NOW() - INTERVAL '2 days'
),
(
    'p0000000-0000-0000-0000-000000000009',
    'b0000000-0000-0000-0000-000000000001',
    '1.5" Round Pipe 18G - Grade 201 (Commercial Dhedh Inchi)',
    'SS-201-RD-1.5-18G',
    'length',
    6.60,
    55.00,
    15.00,
    2050.00,
    2400.00,
    '{"size": "1.5 inch", "gauge": "18G", "grade": "201", "shape": "round"}'::jsonb,
    ARRAY['1.5 201 18g', 'dhedh inchi 201', '1.5 nali 201 commercial'],
    NOW() - INTERVAL '1 day'
),
(
    'p0000000-0000-0000-0000-000000000010',
    'b0000000-0000-0000-0000-000000000001',
    '1.0" Round Pipe 20G - Grade 201 (Commercial Ek Inchi)',
    'SS-201-RD-1.0-20G',
    'length',
    3.80,
    40.00,
    15.00,
    1350.00,
    1600.00,
    '{"size": "1.0 inch", "gauge": "20G", "grade": "201", "shape": "round"}'::jsonb,
    ARRAY['1 inch 201 20g', 'ek inchi 201', '1 round commercial'],
    NOW() - INTERVAL '3 days'
),
(
    'p0000000-0000-0000-0000-000000000011',
    'b0000000-0000-0000-0000-000000000001',
    '2.0" Round Pipe 18G - Grade 201 (Commercial Do Inchi)',
    'SS-201-RD-2.0-18G',
    'length',
    8.50,
    3.00, -- LOW STOCK!
    10.00,
    2900.00,
    3450.00,
    '{"size": "2.0 inch", "gauge": "18G", "grade": "201", "shape": "round"}'::jsonb,
    ARRAY['2 inch 201 18g', 'do inchi 201', '2 nali commercial'],
    NOW() - INTERVAL '4 days'
),
(
    'p0000000-0000-0000-0000-000000000012',
    'b0000000-0000-0000-0000-000000000001',
    '0.75" Round Pipe 20G - Grade 201 (Commercial Paun Inchi)',
    'SS-201-RD-0.75-20G',
    'length',
    2.70,
    48.00,
    12.00,
    980.00,
    1180.00,
    '{"size": "0.75 inch", "gauge": "20G", "grade": "201", "shape": "round"}'::jsonb,
    ARRAY['3/4 201', 'paun inchi 201', 'paun commercial'],
    NOW() - INTERVAL '2 days'
),
(
    'p0000000-0000-0000-0000-000000000013',
    'b0000000-0000-0000-0000-000000000001',
    '3.0" Round Pipe 14G - Grade 304 (Teen Inchi Bhaari Gate Pipe)',
    'SS-304-RD-3.0-14G',
    'length',
    18.20,
    0.00, -- DEAD STOCK / ZERO STOCK!
    5.00,
    9800.00,
    11500.00,
    '{"size": "3.0 inch", "gauge": "14G", "grade": "304", "shape": "round"}'::jsonb,
    ARRAY['3 inch 304 14g', 'teen inchi bhaari', '3 round heavy gate'],
    NOW() - INTERVAL '42 days' -- DEAD STOCK (unsold for 30+ days)
),
(
    'p0000000-0000-0000-0000-000000000014',
    'b0000000-0000-0000-0000-000000000001',
    'SS Ball Cap (Topi) 1.5" - Grade 304',
    'FIT-304-CAP-1.5',
    'pcs',
    0.15,
    120.00,
    30.00,
    120.00,
    180.00,
    '{"size": "1.5 inch", "gauge": "Standard", "grade": "304", "shape": "cap"}'::jsonb,
    ARRAY['1.5 topi', '1.5 ball cap', 'dhedh inchi topi 304'],
    NOW() - INTERVAL '1 day'
),
(
    'p0000000-0000-0000-0000-000000000015',
    'b0000000-0000-0000-0000-000000000001',
    'SS Elbow / Bend 90 Degree 1.5" - Grade 304 (Dhedh Inchi Elbow)',
    'FIT-304-ELB-1.5',
    'pcs',
    0.28,
    75.00,
    25.00,
    260.00,
    380.00,
    '{"size": "1.5 inch", "gauge": "Standard", "grade": "304", "shape": "elbow"}'::jsonb,
    ARRAY['1.5 elbow', 'dhedh inchi bend', '1.5 90 bend 304'],
    NOW() - INTERVAL '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Sample Transactions
-- Transaction 1: Sale to Ustad Nadeem Fabricator (Udhaar)
INSERT INTO transactions (id, business_id, party_id, parchi_number, type, routing_mode, payment_mode, subtotal, extra_charges, total_amount, paid_amount, bill_image_url, notes, created_at)
VALUES (
    't0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'P-1042',
    'sale',
    'customer_khata',
    'udhaar',
    33500.00,
    500.00,
    34000.00,
    0.00,
    '/sample-parchi-1.jpg',
    'Site work for Model Town railing. 10 nali 1.5" 18G 304 + Mazdoori',
    NOW() - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO transaction_items (transaction_id, product_id, raw_scanned_name, quantity, unit, rate, amount)
VALUES (
    't0000000-0000-0000-0000-000000000001',
    'p0000000-0000-0000-0000-000000000001',
    '10 nali 1.5" 18G 304',
    10.00,
    'length',
    3350.00,
    33500.00
) ON CONFLICT DO NOTHING;

-- Transaction 2: Walk-in Cash Counter Sale (No Khata Clutter)
INSERT INTO transactions (id, business_id, party_id, parchi_number, type, routing_mode, payment_mode, subtotal, extra_charges, total_amount, paid_amount, bill_image_url, notes, created_at)
VALUES (
    't0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'P-1043',
    'sale',
    'cash_sale',
    'cash',
    9200.00,
    200.00,
    9400.00,
    9400.00,
    '/sample-parchi-2.jpg',
    'Counter cash customer - 4 nali 1" 18G 304',
    NOW() - INTERVAL '4 hours'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO transaction_items (transaction_id, product_id, raw_scanned_name, quantity, unit, rate, amount)
VALUES (
    't0000000-0000-0000-0000-000000000002',
    'p0000000-0000-0000-0000-000000000003',
    '4 nali 1" 18G 304',
    4.00,
    'length',
    2300.00,
    9200.00
) ON CONFLICT DO NOTHING;

-- Transaction 3: Sale Return (Maal Wapsi)
INSERT INTO transactions (id, business_id, party_id, parchi_number, type, routing_mode, payment_mode, subtotal, extra_charges, total_amount, paid_amount, bill_image_url, notes, created_at)
VALUES (
    't0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000004',
    'WAP-108',
    'sale_return',
    'customer_khata',
    'cash',
    6700.00,
    0.00,
    6700.00,
    6700.00,
    '/sample-parchi-3.jpg',
    '2 nali 1.5" 18G returned due to client design change',
    NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO transaction_items (transaction_id, product_id, raw_scanned_name, quantity, unit, rate, amount)
VALUES (
    't0000000-0000-0000-0000-000000000003',
    'p0000000-0000-0000-0000-000000000001',
    '2 nali 1.5" 18G 304 wapsi',
    2.00,
    'length',
    3350.00,
    6700.00
) ON CONFLICT DO NOTHING;

-- 5. Seed Payments & Expenses (Wasooli & Roznamcha)
INSERT INTO payments_and_expenses (id, business_id, party_id, entry_type, description, amount, payment_mode, created_at)
VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'customer_wasooli',
    'Wasooli from Ustad Nadeem (Cash received at shop)',
    20000.00,
    'cash',
    NOW() - INTERVAL '5 hours'
),
(
    'e0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'shop_expense',
    'Chai & Nashta for munshi & loading mazdoor',
    650.00,
    'cash',
    NOW() - INTERVAL '6 hours'
),
(
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'shop_expense',
    'Electricity generator petrol refill (10 Liters)',
    2850.00,
    'cash',
    NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO NOTHING;
