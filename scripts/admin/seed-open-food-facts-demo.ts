import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFile, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { evaluateCompliance } from "../../lib/compliance/index";
import { serializeComplianceToBackend } from "../../lib/api/inspections";
import { serializeDeclarationsToBackendFields } from "../../lib/api/inspections";

const TARGET_EMAIL = "jagrut916@gmail.com";
const TARGET_COUNT = 20;
const OPEN_FOOD_FACTS_BASE = "https://world.openfoodfacts.org/api/v2/search";
const MANIFEST_PATH = ".data/open-food-facts-demo-manifest.json";
const APP_URL = (process.env.PACKCHECK_APP_URL || "https://pack-check-azure.vercel.app").replace(/\/+$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const categoryTags = [
  "biscuits",
  "chips",
  "noodles",
  "breakfast-cereals",
  "tea",
  "coffee",
  "sauces",
  "spices",
  "rice",
  "chocolates",
  "beverages",
  "cookies",
];

interface Product {
  code: string;
  productName: string;
  brand: string;
  categories: string;
  imageUrl: string;
}

interface ManifestEntry {
  barcode: string;
  productName: string;
  category: string;
  sourceImageUrl: string;
  inspectionId?: string;
  timestamp: string;
  status: "created" | "failed" | "skipped";
  ocrTextLength?: number;
  populatedFieldCount?: number;
  complianceStatus?: string;
  error?: string;
}

function requireEnvironment(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before running this utility.");
  }
}

async function promptPassword(): Promise<string> {
  const terminal = input as NodeJS.ReadStream & { isRaw?: boolean; setRawMode?: (value: boolean) => void };
  const rl = createInterface({ input, output });
  output.write(`Password for ${TARGET_EMAIL} (input hidden): `);
  const wasRaw = terminal.isRaw;
  terminal.setRawMode?.(true);
  let password = "";
  return new Promise((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      const value = chunk.toString("utf8");
      if (value === "\r" || value === "\n") {
        terminal.setRawMode?.(Boolean(wasRaw));
        input.off("data", onData);
        rl.close();
        output.write("\n");
        resolve(password);
      } else if (value === "\u0003") {
        terminal.setRawMode?.(Boolean(wasRaw));
        input.off("data", onData);
        rl.close();
        reject(new Error("Cancelled."));
      } else if (value === "\u007f") {
        password = password.slice(0, -1);
      } else {
        password += value;
      }
    };
    input.on("data", onData);
  });
}

async function signIn(password: string): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: TARGET_EMAIL, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token || payload.user?.email?.toLowerCase() !== TARGET_EMAIL) {
    throw new Error(`Authentication failed for the target account (HTTP ${response.status}).`);
  }
  return payload.access_token;
}

async function loadManifest(): Promise<ManifestEntry[]> {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as ManifestEntry[];
  } catch {
    return [];
  }
}

async function saveManifest(manifest: ManifestEntry[]): Promise<void> {
  await mkdir(".data", { recursive: true });
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

async function fetchProducts(): Promise<Product[]> {
  const products: Product[] = [];
  const seen = new Set<string>();

  for (const category of categoryTags) {
    const url = new URL(OPEN_FOOD_FACTS_BASE);
    url.searchParams.set("categories_tags_en", category);
    url.searchParams.set("fields", "code,product_name,product_name_en,brands,categories_tags_en,image_front_url,image_url");
    url.searchParams.set("page_size", "40");

    const response = await fetch(url, { headers: { "User-Agent": "PackCheckDemoSeeder/1.0 (hackathon admin utility)" } });
    if (!response.ok) continue;
    const payload = await response.json() as { products?: Record<string, unknown>[] };

    for (const item of payload.products || []) {
      const barcode = String(item.code || "").trim();
      const productName = String(item.product_name_en || item.product_name || "").trim();
      const rawImageUrl = String(item.image_front_url || "").trim();
      const imageUrl = rawImageUrl.replace(/\.\d+\.(jpe?g|png|webp)$/i, ".$1");
      const hasEnglishImage = /(?:^|_)en\./i.test(rawImageUrl);
      if (!barcode || !productName || !rawImageUrl || !hasEnglishImage || !imageUrl || seen.has(barcode)) continue;
      seen.add(barcode);
      products.push({
        code: barcode,
        productName,
        brand: String(item.brands || "").split(",")[0].trim(),
        categories: String(item.categories_tags_en || category).replaceAll("en:", "").split(",")[0].trim(),
        imageUrl,
      });
      if (products.length >= TARGET_COUNT) return products;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return products;
}

async function downloadImage(product: Product): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(product.imageUrl, { headers: { "User-Agent": "PackCheckDemoSeeder/1.0" } });
  if (!response.ok) throw new Error(`Image download failed with HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 15 * 1024 * 1024) throw new Error("Image is empty or exceeds the 15 MB upload limit.");
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  return { blob: new Blob([bytes], { type: contentType }), filename: `${product.code}.${extension}` };
}

async function apiRequest<T>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${APP_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(`${path} failed with HTTP ${response.status}: ${payload.error?.message || "Unknown API error"}`);
  }
  return payload.data as T;
}

function metadataFor(product: Product, index: number): { location: string } {
  const locations = [
    "Connaught Place Retail Zone, New Delhi",
    "Karol Bagh Retail Zone, New Delhi",
    "Vasant Kunj Retail Zone, New Delhi",
    "Dwarka Retail Zone, New Delhi",
    "Lajpat Nagar Retail Zone, New Delhi",
  ];
  return { location: locations[index % locations.length] };
}

async function createInspection(token: string, product: Product, index: number): Promise<string> {
  const image = await downloadImage(product);
  const form = new FormData();
  form.append("product_type", product.productName);
  form.append("manufacturer_name", product.brand || "");
  form.append("category", "FOOD_AND_BEVERAGES");
  form.append("inspection_type", "ROUTINE_MARKET_SURVEILLANCE");
  form.append("location", metadataFor(product, index).location);
  form.append("files", image.blob, image.filename);
  const result = await apiRequest<{ inspection_id: string }>(token, "/api/inspections", { method: "POST", body: form });
  return result.inspection_id;
}

async function runPipeline(token: string, inspectionId: string, product: Product): Promise<{ ocrTextLength: number; populatedFieldCount: number; complianceStatus: string }> {
  const ocr = await apiRequest<any>(token, `/api/inspections/${inspectionId}/ocr`, { method: "POST", body: JSON.stringify({}) , headers: { "Content-Type": "application/json" } });
  if (!ocr?.rawText?.trim()) throw new Error("OCR completed without rawText.");

  const declarations = await apiRequest<any>(token, `/api/inspections/${inspectionId}/extract`, {
    method: "POST",
    body: JSON.stringify({ rawText: ocr.rawText, context: { productName: product.productName, manufacturerName: product.brand } }),
    headers: { "Content-Type": "application/json" },
  });
  const populatedFieldCount = [
    declarations.commodityName?.value,
    declarations.manufacturerOrPacker?.value?.name,
    declarations.netQuantity?.value?.rawText,
    declarations.mrp?.value?.rawText,
    declarations.manufacturingOrPackingDate?.value?.formattedText,
    declarations.expiryOrBestBeforeDate?.value?.formattedText,
    declarations.consumerCare?.value?.rawText,
    declarations.unitSalePrice?.value?.rawText,
  ].filter(Boolean).length;
  if (ocr.rawText.trim().length < 20 || populatedFieldCount < 2) {
    throw new Error(`Usable OCR/extraction threshold not met (ocrTextLength=${ocr.rawText.trim().length}, populatedFieldCount=${populatedFieldCount}).`);
  }
  await apiRequest(token, `/api/inspections/${inspectionId}/extracted-fields`, {
    method: "POST",
    body: JSON.stringify({ fields: serializeDeclarationsToBackendFields(declarations) }),
    headers: { "Content-Type": "application/json" },
  });

  const evaluation = await evaluateCompliance(declarations);
  await apiRequest(token, `/api/inspections/${inspectionId}/compliance-results`, {
    method: "POST",
    body: JSON.stringify(serializeComplianceToBackend(evaluation)),
    headers: { "Content-Type": "application/json" },
  });

  await apiRequest(token, `/api/inspections/${inspectionId}`, { method: "GET" });
  return {
    ocrTextLength: ocr.rawText.trim().length,
    populatedFieldCount,
    complianceStatus: evaluation.overallResult,
  };
}

async function main(): Promise<void> {
  requireEnvironment();
  const password = await promptPassword();
  const token = await signIn(password);
  password.replace(/./g, "");

  const existing = await loadManifest();
  const completed = new Set(existing.filter((entry) => entry.status === "created").map((entry) => entry.barcode));
  const products = (await fetchProducts()).filter((product) => !completed.has(product.code)).slice(0, TARGET_COUNT - completed.size);
  if (products.length === 0) throw new Error("No new Open Food Facts products were available.");

  console.log(`Authenticated as ${TARGET_EMAIL}. Processing ${products.length} products.`);
  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const entry: ManifestEntry = {
      barcode: product.code,
      productName: product.productName,
      category: product.categories,
      sourceImageUrl: product.imageUrl,
      timestamp: new Date().toISOString(),
      status: "failed",
    };
    try {
      entry.inspectionId = await createInspection(token, product, index);
      const pipeline = await runPipeline(token, entry.inspectionId, product);
      entry.ocrTextLength = pipeline.ocrTextLength;
      entry.populatedFieldCount = pipeline.populatedFieldCount;
      entry.complianceStatus = pipeline.complianceStatus;
      entry.status = "created";
      console.log(`${index + 1}/${products.length}: ${product.code} ${product.productName} -> ${entry.inspectionId}`);
    } catch (error) {
      entry.error = error instanceof Error ? error.message : "Unknown error";
      console.error(`${index + 1}/${products.length}: ${product.code} failed: ${entry.error}`);
    }
    existing.push(entry);
    await saveManifest(existing);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const successful = existing.filter((entry) => entry.status === "created");
  const history = await apiRequest<{ inspections?: unknown[] }>(token, "/api/inspections?limit=100");
  console.log(JSON.stringify({
    targetAccount: TARGET_EMAIL,
    attemptedThisRun: products.length,
    successfulTotalInManifest: successful.length,
    failedTotalInManifest: existing.filter((entry) => entry.status === "failed").length,
    dashboardInspectionCount: Array.isArray(history.inspections) ? history.inspections.length : 0,
    manifest: MANIFEST_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Ingestion failed.");
  process.exitCode = 1;
});
