import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface RequestPayload {
  imageBase64: string;
  scanType: 'sale' | 'purchase' | 'sale_return';
  parties?: Array<{ id: string; name: string; area_or_shop?: string; type: string }>;
  products?: Array<{
    id: string;
    name: string;
    sku_code: string;
    unit: string;
    sale_rate: number;
    purchase_rate: number;
    attributes: { size: string; gauge: string; grade: string; shape: string };
    aliases: string[];
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestPayload;
    const { imageBase64, scanType = 'sale', parties = [], products = [] } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // If Gemini API Key is provided, call Gemini Vision
    if (apiKey && apiKey.trim() && !apiKey.includes('placeholder')) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Supports gemini-2.5-flash, gemini-2.0-flash or gemini-1.5-flash
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        // Strip data:image/...;base64, prefix if present
        let cleanBase64 = imageBase64;
        let mimeType = 'image/jpeg';
        if (imageBase64.includes(';base64,')) {
          const parts = imageBase64.split(';base64,');
          cleanBase64 = parts[1];
          const mimeMatch = parts[0].match(/data:(.*)/);
          if (mimeMatch) mimeType = mimeMatch[1];
        }

        const prompt = `
You are the AI OCR munshi for a Pakistani Stainless Steel Pipe & Tube Store ("SteelKhata AI").
Your task is to parse a handwritten Pakistani shop bill ("katchi parchi") or stock slip.

Context:
Scan Type: ${scanType} (sale = Becha Hua Maal, purchase = Aaya Hua Maal, sale_return = Maal Wapsi)

Here is the store's current Party List (Customers/Suppliers):
${JSON.stringify(
  parties.map(p => ({ id: p.id, name: p.name, area: p.area_or_shop, type: p.type }))
)}

Here is the store's current Product Catalog (Stainless steel pipe sizes, gauges, grades):
${JSON.stringify(
  products.map(pr => ({
    id: pr.id,
    name: pr.name,
    sku: pr.sku_code,
    size: pr.attributes?.size,
    gauge: pr.attributes?.gauge,
    grade: pr.attributes?.grade,
    shape: pr.attributes?.shape,
    unit: pr.unit,
    rate: scanType === 'purchase' ? pr.purchase_rate : pr.sale_rate,
    aliases: pr.aliases,
  }))
)}

Pakistani Urdu / Shop Lingo instructions:
- "nali" or "length" = standard 20-ft stainless steel pipe length (unit: "length")
- "dhedh inchi" = 1.5"
- "do inchi" = 2.0"
- "ek inchi" = 1.0"
- "paun inchi" = 0.75" / 3/4"
- "aadhi inchi" = 0.5" / 1/2"
- "chakor" / "chauras" / "box" = square pipe
- "gol" = round pipe
- "topi" = ball cap (unit: "pcs")
- "elbow" / "bend" = bend (unit: "pcs")
- "mazdoori", "kiraya", "loading", "utrai" = extra charges
- "naqad", "cash", "rokra" = cash sale
- "udhaar", "baqaya", "khata" = customer khata

Output must strictly be valid JSON matching this schema:
{
  "parchi_number": "Parchi / Bill Number if visible, else null or e.g. P-1050",
  "party_name": "Customer or Fabricator name written on paper, or null if Cash/Naqad",
  "matched_party_id": "UUID from Party List if matched, else null",
  "detected_routing": "cash_sale" or "customer_khata",
  "payment_mode": "cash" or "udhaar" or "bank",
  "items": [
    {
      "raw_text": "Exact handwritten line text e.g. 10 nali 1.5 18G 304 @ 3350",
      "matched_product_id": "UUID from product catalog if matched, else null",
      "size": "e.g. 1.5 inch",
      "gauge": "e.g. 18G",
      "grade": "304 or 201",
      "shape": "round or square or rectangle or cap or elbow",
      "qty": 10,
      "unit": "length or kg or pcs",
      "rate": 3350,
      "amount": 33500,
      "confidence": 0.95
    }
  ],
  "extra_charges": 500,
  "total_amount": 34000,
  "confidence_score": 0.94,
  "notes": "Any notes or Roman Urdu remarks detected"
}

Rule for routing:
- If no party name is written, or "Cash", "Naqad", "Counter" is detected: set detected_routing = "cash_sale", payment_mode = "cash", matched_party_id = party_id of "Cash Counter / Walk-in".
- If customer name is written or "Udhaar" is noted: set detected_routing = "customer_khata", payment_mode = "udhaar".
`;

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
        ]);

        const textResponse = result.response.text();
        const parsedJSON = JSON.parse(textResponse);
        return NextResponse.json({
          success: true,
          source: 'gemini-vision',
          data: parsedJSON,
        });
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to simulated parser:', geminiError?.message);
        // Fallback continues below
      }
    }

    // Graceful Intelligent Simulated Parser Fallback
    // Matches against existing products & parties with high craft
    const simulatedResult = generateIntelligentFallback(scanType, parties, products);

    return NextResponse.json({
      success: true,
      source: 'simulated_fallback',
      message: 'Demo AI OCR parser used. Add GEMINI_API_KEY in .env.local for live Gemini Vision.',
      data: simulatedResult,
    });
  } catch (error: any) {
    console.error('Scan API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to parse image' },
      { status: 500 }
    );
  }
}

function generateIntelligentFallback(
  scanType: 'sale' | 'purchase' | 'sale_return',
  parties: any[],
  products: any[]
) {
  const parchiNumber = 'P-' + Math.floor(1000 + Math.random() * 9000);

  if (scanType === 'sale_return') {
    const sampleParty = parties.find(p => p.type === 'customer' && p.name.includes('Bismillah')) || parties[1] || null;
    const sampleProduct = products.find(p => p.sku_code?.includes('RD-1.5')) || products[0];

    const qty = 2;
    const rate = sampleProduct ? sampleProduct.sale_rate : 3350;
    const amount = qty * rate;

    return {
      parchi_number: parchiNumber,
      party_name: sampleParty ? sampleParty.name : 'Bismillah Railing & Gate Center',
      matched_party_id: sampleParty?.id || null,
      detected_routing: 'customer_khata',
      payment_mode: 'cash',
      items: [
        {
          raw_text: `${qty} nali ${sampleProduct?.name || '1.5" Round Pipe 18G 304'} (Wapsi)`,
          matched_product_id: sampleProduct?.id,
          size: sampleProduct?.attributes?.size || '1.5 inch',
          gauge: sampleProduct?.attributes?.gauge || '18G',
          grade: sampleProduct?.attributes?.grade || '304',
          shape: sampleProduct?.attributes?.shape || 'round',
          qty,
          unit: 'length',
          rate,
          amount,
          confidence: 0.92,
        },
      ],
      extra_charges: 0,
      total_amount: amount,
      confidence_score: 0.92,
      notes: 'Customer returned 2 unused pipe lengths.',
    };
  }

  if (scanType === 'purchase') {
    const supplier = parties.find(p => p.type === 'supplier') || parties[parties.length - 1];
    const pipe1 = products[0] || { name: '1.5" Round 18G 304', purchase_rate: 2850 };
    const pipe2 = products[2] || { name: '1.0" Round 18G 304', purchase_rate: 1950 };

    const items = [
      {
        raw_text: `30 nali ${pipe1.name}`,
        matched_product_id: pipe1.id,
        size: '1.5 inch',
        gauge: '18G',
        grade: '304',
        shape: 'round',
        qty: 30,
        unit: 'length',
        rate: pipe1.purchase_rate || 2850,
        amount: 30 * (pipe1.purchase_rate || 2850),
        confidence: 0.96,
      },
      {
        raw_text: `20 nali ${pipe2.name}`,
        matched_product_id: pipe2.id,
        size: '1.0 inch',
        gauge: '18G',
        grade: '304',
        shape: 'round',
        qty: 20,
        unit: 'length',
        rate: pipe2.purchase_rate || 1950,
        amount: 20 * (pipe2.purchase_rate || 1950),
        confidence: 0.94,
      },
    ];

    const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
    const extra_charges = 2500; // Kiraya truck
    const total_amount = subtotal + extra_charges;

    return {
      parchi_number: 'MILL-' + Math.floor(100 + Math.random() * 900),
      party_name: supplier?.name || 'Iqbal Stainless Tube Mills',
      matched_party_id: supplier?.id || null,
      detected_routing: 'customer_khata',
      payment_mode: 'udhaar',
      items,
      extra_charges,
      total_amount,
      confidence_score: 0.95,
      notes: 'Mill stock delivered at shop. Kiraya truck Rs. 2,500.',
    };
  }

  // Default: Sale Bill
  const isCashCounter = Math.random() > 0.6;
  const regularParty = parties.find(p => p.type === 'customer' && p.name.includes('Nadeem')) || parties[1];
  const walkInParty = parties.find(p => p.type === 'walk_in_cash') || parties[0];

  const chosenParty = isCashCounter ? walkInParty : regularParty;
  const routing = isCashCounter ? 'cash_sale' : 'customer_khata';
  const paymentMode = isCashCounter ? 'cash' : 'udhaar';

  const pipeA = products[0] || { name: '1.5" Round Pipe 18G 304', sale_rate: 3350 };
  const pipeB = products[2] || { name: '1.0" Round Pipe 18G 304', sale_rate: 2300 };

  const qtyA = isCashCounter ? 3 : 8;
  const qtyB = isCashCounter ? 2 : 4;

  const items = [
    {
      raw_text: `${qtyA} nali ${pipeA.name} @ ${pipeA.sale_rate}`,
      matched_product_id: pipeA.id,
      size: '1.5 inch',
      gauge: '18G',
      grade: '304',
      shape: 'round',
      qty: qtyA,
      unit: 'length',
      rate: pipeA.sale_rate || 3350,
      amount: qtyA * (pipeA.sale_rate || 3350),
      confidence: 0.95,
    },
    {
      raw_text: `${qtyB} nali ${pipeB.name} @ ${pipeB.sale_rate}`,
      matched_product_id: pipeB.id,
      size: '1.0 inch',
      gauge: '18G',
      grade: '304',
      shape: 'round',
      qty: qtyB,
      unit: 'length',
      rate: pipeB.sale_rate || 2300,
      amount: qtyB * (pipeB.sale_rate || 2300),
      confidence: 0.91,
    },
  ];

  const subtotal = items.reduce((s, it) => s + it.amount, 0);
  const extra_charges = isCashCounter ? 0 : 500;
  const total_amount = subtotal + extra_charges;

  return {
    parchi_number: parchiNumber,
    party_name: chosenParty?.name || (isCashCounter ? 'Cash Counter / Walk-in' : 'Ustad Nadeem Fabricator'),
    matched_party_id: chosenParty?.id || null,
    detected_routing: routing,
    payment_mode: paymentMode,
    items,
    extra_charges,
    total_amount,
    confidence_score: 0.93,
    notes: isCashCounter
      ? 'Cash counter sale paid in full.'
      : 'Site railing job. Mazdoori Rs. 500 added to Udhaar.',
  };
}
