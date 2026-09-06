/**
 * PackCheck AI — Registered Packers Storage & Repository Layer
 * Interacts with Supabase table `public.registered_packers` with seamless cloud & local persistence
 * fallback ensuring continuous demo availability and zero downtime across Vercel and local environments.
 */

import fs from "fs";
import path from "path";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import {
  normalizeCompanyName,
  normalizeRegistrationNumber,
  isCompanyMatch,
} from "./normalization";

export interface RegisteredPackerEntity {
  id: string;
  user_id?: string;
  name: string;
  normalized_name: string;
  brand?: string;
  registration_number: string;
  registered_office: string;
  state: string;
  district: string;
  contact_email?: string;
  contact_phone?: string;
  categories: string[];
  status: "ACTIVE" | "UNDER_REVIEW" | "SUSPENDED";
  created_at: string;
  updated_at: string;
}

export interface CreatePackerInput {
  user_id?: string;
  name: string;
  brand?: string;
  registration_number: string;
  registered_office: string;
  state: string;
  district: string;
  contact_email?: string;
  contact_phone?: string;
  categories?: string[];
  status?: "ACTIVE" | "UNDER_REVIEW" | "SUSPENDED";
}

// Local fallback file paths
const DATA_DIR = path.join(process.cwd(), ".data");
const LOCAL_STORAGE_FILE = path.join(DATA_DIR, "registered_packers.json");
const LINKS_FILE = path.join(DATA_DIR, "inspection_companies.json");

// Supabase Storage Cloud Backup Paths
const STORAGE_BUCKET = "product-images";
const STORAGE_PACKERS_PATH = "system/registered_packers.json";
const STORAGE_LINKS_PATH = "system/inspection_companies.json";

// In-memory cache for ultra-fast serverless lambda execution
let inMemoryPackers: RegisteredPackerEntity[] | null = null;
let inMemoryLinks: Record<string, { companyId: string; companyName: string }> | null = null;

// Canonical initial entities for Rule 27 demo seed
const INITIAL_SEED_PACKERS: RegisteredPackerEntity[] = [
  {
    id: "comp_amul",
    name: "Kaira District Co-operative Milk Producers' Union Ltd.",
    normalized_name: "kaira district coop milk producers union ltd",
    brand: "Amul",
    registration_number: "LMR-GJ-2018-091",
    registered_office: "Amul Dairy Road, Anand, Gujarat - 388001",
    state: "Gujarat",
    district: "Anand",
    contact_email: "customercare@amul.coop",
    contact_phone: "1800 258 3333",
    categories: ["Dairy Products", "Edible Oils", "Beverages", "Sweets"],
    status: "ACTIVE",
    created_at: "2018-05-14T00:00:00Z",
    updated_at: "2026-09-03T00:00:00Z",
  },
  {
    id: "comp_nutribite",
    name: "NutriBite Foods Pvt Ltd",
    normalized_name: "nutribite foods pvt ltd",
    brand: "NutriBite",
    registration_number: "LMR-DL-2023-441",
    registered_office: "Plot 14, Okhla Industrial Area Phase 3, New Delhi - 110020",
    state: "Delhi NCR",
    district: "South East Delhi",
    contact_email: "info@nutribitefoods.in",
    contact_phone: "011 4988 2210",
    categories: ["Bakery & Biscuits", "Health Bars", "Protein Snacks"],
    status: "UNDER_REVIEW",
    created_at: "2023-08-20T00:00:00Z",
    updated_at: "2026-09-03T00:00:00Z",
  },
  {
    id: "comp_pristine",
    name: "Pristine Bio Products Ltd",
    normalized_name: "pristine bio products ltd",
    brand: "Pristine Hills",
    registration_number: "LMR-UK-2021-118",
    registered_office: "Industrial Estate, Pantnagar, Udham Singh Nagar, Uttarakhand - 263153",
    state: "Uttarakhand",
    district: "Udham Singh Nagar",
    contact_email: "care@pristinebio.com",
    contact_phone: "05944 245019",
    categories: ["Honey & Natural Sweeteners", "Herbal Infusions", "Organic Spices"],
    status: "ACTIVE",
    created_at: "2021-11-02T00:00:00Z",
    updated_at: "2026-09-03T00:00:00Z",
  },
  {
    id: "comp_adani",
    name: "Adani Wilmar Limited",
    normalized_name: "adani wilmar ltd",
    brand: "Fortune",
    registration_number: "LMR-GJ-2015-012",
    registered_office: "Fortune House, Near Navrangpura Railway Crossing, Ahmedabad - 380009",
    state: "Gujarat",
    district: "Ahmedabad",
    contact_email: "customercare@adaniwilmar.in",
    contact_phone: "1800 233 9999",
    categories: ["Edible Oils", "Basmati Rice", "Wheat Flour (Atta)", "Pulses & Grains"],
    status: "ACTIVE",
    created_at: "2015-03-10T00:00:00Z",
    updated_at: "2026-09-03T00:00:00Z",
  },
  {
    id: "comp_ltfoods",
    name: "LT Foods Ltd.",
    normalized_name: "lt foods ltd",
    brand: "Daawat",
    registration_number: "LMR-HR-2016-554",
    registered_office: "Unit No. 134, 1st Floor, Rectangle-1, Saket District Centre, New Delhi - 110017",
    state: "Haryana / Delhi",
    district: "Sonipat",
    contact_email: "ir@ltgroup.in",
    contact_phone: "0124 3055100",
    categories: ["Basmati Rice", "Ready to Cook", "Specialty Grains"],
    status: "ACTIVE",
    created_at: "2016-09-18T00:00:00Z",
    updated_at: "2026-09-04T00:00:00Z",
  },
];

/**
 * Downloads registered packers from Supabase Storage bucket.
 */
async function fetchCloudPackers(): Promise<RegisteredPackerEntity[] | null> {
  const db = supabaseAdmin || supabase;
  try {
    const { data, error } = await db.storage
      .from(STORAGE_BUCKET)
      .download(STORAGE_PACKERS_PATH);

    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[STORAGE] Cloud packers download exception:", err);
  }
  return null;
}

/**
 * Uploads registered packers to Supabase Storage bucket for cross-deployment consistency.
 */
async function persistCloudPackers(packers: RegisteredPackerEntity[]): Promise<void> {
  const db = supabaseAdmin || supabase;
  try {
    const buf = Buffer.from(JSON.stringify(packers, null, 2), "utf8");
    await db.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_PACKERS_PATH, buf, {
        upsert: true,
        contentType: "application/json",
      });
  } catch (err) {
    console.warn("[STORAGE] Cloud packers persist exception:", err);
  }
}

/**
 * Reads local fallback packers from disk if filesystem is readable.
 */
function readLocalPackers(): RegisteredPackerEntity[] {
  try {
    if (fs.existsSync(LOCAL_STORAGE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORAGE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[STORAGE] Local packers read exception:", err);
  }
  return [...INITIAL_SEED_PACKERS];
}

/**
 * Saves local fallback packers to disk (gracefully handles read-only serverless lambdas).
 */
function writeLocalPackers(packers: RegisteredPackerEntity[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(packers, null, 2), "utf8");
  } catch {
    // Expected in read-only serverless environments like AWS Lambda / Vercel
  }
}

/**
 * Get all registered packers, supporting search, state filtering, and user isolation.
 * Automatically loads from Supabase DB -> Supabase Storage -> Local fallback.
 */
export async function getAllPackers(params?: {
  searchQuery?: string;
  state?: string;
  userId?: string;
}): Promise<RegisteredPackerEntity[]> {
  const db = supabaseAdmin || supabase;
  let packers: RegisteredPackerEntity[] = [];

  // 1. Try relational table in Supabase
  try {
    let query = db
      .from("registered_packers")
      .select("*")
      .order("created_at", { ascending: false });

    if (params?.userId) {
      query = query.or(`user_id.is.null,user_id.eq.${params.userId}`);
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data) && data.length > 0) {
      packers = data.map((d) => ({
        id: d.id,
        user_id: d.user_id,
        name: d.name,
        normalized_name: d.normalized_name || normalizeCompanyName(d.name),
        brand: d.brand || "",
        registration_number: d.registration_number,
        registered_office: d.registered_office,
        state: d.state,
        district: d.district,
        contact_email: d.contact_email || "",
        contact_phone: d.contact_phone || "",
        categories: Array.isArray(d.categories) ? d.categories : [],
        status: d.status || "ACTIVE",
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));
      inMemoryPackers = packers;
    }
  } catch {
    // Relational table not migrated yet
  }

  // 2. If table is empty or missing, use cloud Supabase Storage / in-memory cache
  if (packers.length === 0) {
    if (!inMemoryPackers) {
      const cloudData = await fetchCloudPackers();
      if (cloudData && cloudData.length > 0) {
        inMemoryPackers = cloudData;
      } else {
        inMemoryPackers = readLocalPackers();
        // Seed cloud storage for future requests
        persistCloudPackers(inMemoryPackers).catch(() => {});
      }
    }
    packers = [...inMemoryPackers];

    // Filter by userId without dropping global / statutory seed packers
    if (params?.userId) {
      packers = packers.filter((p) => !p.user_id || p.user_id === params.userId);
    }
  }

  // Filter in memory for precise text search & state
  if (params?.state && params.state !== "ALL") {
    packers = packers.filter((p) =>
      p.state.toLowerCase().includes(params.state!.toLowerCase())
    );
  }

  if (params?.searchQuery) {
    const q = params.searchQuery.toLowerCase().trim();
    packers = packers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        p.registration_number.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q)
    );
  }

  return packers;
}

/**
 * Get a single registered packer by UUID, registration number, or mock ID.
 */
export async function getPackerById(
  id: string
): Promise<RegisteredPackerEntity | null> {
  const db = supabaseAdmin || supabase;

  try {
    const { data, error } = await db
      .from("registered_packers")
      .select("*")
      .or(`id.eq.${id},registration_number.eq.${id}`)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        normalized_name: data.normalized_name || normalizeCompanyName(data.name),
        brand: data.brand || "",
        registration_number: data.registration_number,
        registered_office: data.registered_office,
        state: data.state,
        district: data.district,
        contact_email: data.contact_email || "",
        contact_phone: data.contact_phone || "",
        categories: Array.isArray(data.categories) ? data.categories : [],
        status: data.status || "ACTIVE",
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }
  } catch {
    // Ignore and proceed to fallback
  }

  // Cloud / local fallback lookup
  const allPackers = await getAllPackers();
  const found = allPackers.find(
    (p) =>
      p.id === id ||
      p.registration_number.toUpperCase() === id.toUpperCase() ||
      p.name.toLowerCase() === id.toLowerCase()
  );
  return found ? { ...found } : null;
}

/**
 * Find an existing packer by name or registration number using conservative deduplication.
 */
export async function findPackerByNameOrReg(
  nameOrReg: string,
  brand?: string,
  userId?: string
): Promise<RegisteredPackerEntity | null> {
  if (!nameOrReg) return null;

  const all = await getAllPackers({ userId });
  const match = all.find((candidate) =>
    isCompanyMatch(candidate, nameOrReg, brand)
  );
  return match || null;
}

/**
 * Create a new registered packer entity under Rule 27.
 * Enforces deduplication, inserts into Supabase table (if available), and backs up to Supabase Storage.
 */
export async function createPacker(
  input: CreatePackerInput
): Promise<{ entity: RegisteredPackerEntity; isDuplicate: boolean }> {
  const normName = normalizeCompanyName(input.name);
  const normReg = normalizeRegistrationNumber(input.registration_number);

  if (!normName) {
    throw new Error("Company / Manufacturer Name is required.");
  }
  if (!normReg) {
    throw new Error("Rule 27 Registration Certificate Number is required.");
  }

  // Check for duplicate within the user's scope
  const existing = await findPackerByNameOrReg(input.registration_number, undefined, input.user_id);
  if (existing) {
    return { entity: existing, isDuplicate: true };
  }

  const existingByName = await findPackerByNameOrReg(input.name, input.brand, input.user_id);
  if (existingByName) {
    return { entity: existingByName, isDuplicate: true };
  }

  const now = new Date().toISOString();
  const db = supabaseAdmin || supabase;

  const newRecord: RegisteredPackerEntity = {
    id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: input.user_id,
    name: input.name.trim(),
    normalized_name: normName,
    brand: input.brand?.trim() || "",
    registration_number: normReg,
    registered_office: input.registered_office.trim(),
    state: input.state.trim(),
    district: input.district.trim(),
    contact_email: input.contact_email?.trim() || "",
    contact_phone: input.contact_phone?.trim() || "",
    categories: input.categories || ["General Packaged Commodity"],
    status: input.status || "ACTIVE",
    created_at: now,
    updated_at: now,
  };

  // Attempt Supabase relational insert
  try {
    const { data, error } = await db
      .from("registered_packers")
      .insert([
        {
          user_id: newRecord.user_id,
          name: newRecord.name,
          normalized_name: newRecord.normalized_name,
          brand: newRecord.brand,
          registration_number: newRecord.registration_number,
          registered_office: newRecord.registered_office,
          state: newRecord.state,
          district: newRecord.district,
          contact_email: newRecord.contact_email,
          contact_phone: newRecord.contact_phone,
          categories: newRecord.categories,
          status: newRecord.status,
          created_at: now,
          updated_at: now,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      newRecord.id = data.id;
    }
  } catch (err) {
    console.warn("[STORAGE] Supabase registered_packers insert failed, persisting to cloud storage:", err);
  }

  // Update in-memory cache
  const currentList = inMemoryPackers || (await fetchCloudPackers()) || readLocalPackers();
  const updatedList = [newRecord, ...currentList.filter((p) => p.id !== newRecord.id)];
  inMemoryPackers = updatedList;

  // Persist to Supabase Storage and local disk
  await persistCloudPackers(updatedList);
  writeLocalPackers(updatedList);

  return { entity: newRecord, isDuplicate: false };
}

/**
 * Connects an inspection's identified manufacturer to a registered packer.
 * If the packer exists, returns it. If not, registers it with available identity details.
 */
export async function ensurePackerForInspection(
  companyName: string,
  brandName?: string,
  address?: string,
  userId?: string
): Promise<RegisteredPackerEntity | null> {
  if (!companyName || companyName.trim().length < 2) {
    return null;
  }

  const existing = await findPackerByNameOrReg(companyName, brandName, userId);
  if (existing) {
    return existing;
  }

  // Derive a provisional Rule 27 registration number
  const prefix = (brandName || companyName)
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase();
  const autoRegNo = `IND-AUTO-${prefix || "REG"}-${Date.now().toString().slice(-4)}`;

  const { entity } = await createPacker({
    user_id: userId,
    name: companyName.trim(),
    brand: brandName?.trim() || "",
    registration_number: autoRegNo,
    registered_office: address?.trim() || "Address on package label (Field Inspection Record)",
    state: "Delhi NCR",
    district: "Central Enforcement Division",
    categories: ["Packaged Commodity"],
    status: "ACTIVE",
  });

  return entity;
}

/**
 * Fetches inspection company link mapping from Supabase Storage.
 */
async function fetchCloudLinks(): Promise<Record<string, { companyId: string; companyName: string }> | null> {
  const db = supabaseAdmin || supabase;
  try {
    const { data, error } = await db.storage
      .from(STORAGE_BUCKET)
      .download(STORAGE_LINKS_PATH);

    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[STORAGE] Cloud links download exception:", err);
  }
  return null;
}

/**
 * Uploads inspection company link mapping to Supabase Storage.
 */
async function persistCloudLinks(links: Record<string, { companyId: string; companyName: string }>): Promise<void> {
  const db = supabaseAdmin || supabase;
  try {
    const buf = Buffer.from(JSON.stringify(links, null, 2), "utf8");
    await db.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_LINKS_PATH, buf, {
        upsert: true,
        contentType: "application/json",
      });
  } catch (err) {
    console.warn("[STORAGE] Cloud links persist exception:", err);
  }
}

/**
 * Records an inspection -> company link with cloud persistence across Vercel & local environments.
 */
export async function recordInspectionCompanyLink(
  inspectionId: string,
  companyId: string,
  companyName: string
): Promise<void> {
  if (!inspectionId || !companyName) return;

  // 1. Update in-memory map immediately
  if (!inMemoryLinks) {
    inMemoryLinks = (await fetchCloudLinks()) || {};
    try {
      if (fs.existsSync(LINKS_FILE)) {
        const local = JSON.parse(fs.readFileSync(LINKS_FILE, "utf8"));
        inMemoryLinks = { ...local, ...inMemoryLinks };
      }
    } catch {
      // ignore
    }
  }

  inMemoryLinks[inspectionId] = { companyId, companyName };

  // 2. Persist to Supabase Storage asynchronously
  await persistCloudLinks(inMemoryLinks);

  // 3. Try local file if filesystem is writable
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LINKS_FILE, JSON.stringify(inMemoryLinks, null, 2), "utf8");
  } catch {
    // Expected on serverless Vercel
  }
}

/**
 * Asynchronously retrieves all inspection -> company link mappings.
 */
export async function getAllInspectionCompanyLinksAsync(): Promise<
  Record<string, { companyId: string; companyName: string }>
> {
  if (!inMemoryLinks) {
    const cloudLinks = await fetchCloudLinks();
    if (cloudLinks) {
      inMemoryLinks = cloudLinks;
    } else {
      try {
        if (fs.existsSync(LINKS_FILE)) {
          inMemoryLinks = JSON.parse(fs.readFileSync(LINKS_FILE, "utf8"));
        }
      } catch {
        inMemoryLinks = {};
      }
    }
  }
  return inMemoryLinks || {};
}

/**
 * Synchronous getter for backwards compatibility.
 */
export function getAllInspectionCompanyLinks(): Record<
  string,
  { companyId: string; companyName: string }
> {
  if (inMemoryLinks) return inMemoryLinks;
  try {
    if (fs.existsSync(LINKS_FILE)) {
      inMemoryLinks = JSON.parse(fs.readFileSync(LINKS_FILE, "utf8"));
      return inMemoryLinks || {};
    }
  } catch {
    // ignore
  }
  return inMemoryLinks || {};
}

/**
 * Get inspection company link for a specific inspection.
 */
export async function getInspectionCompanyLinkAsync(
  inspectionId: string
): Promise<{ companyId: string; companyName: string } | null> {
  const all = await getAllInspectionCompanyLinksAsync();
  return all[inspectionId] || null;
}

export function getInspectionCompanyLink(
  inspectionId: string
): { companyId: string; companyName: string } | null {
  const all = getAllInspectionCompanyLinks();
  return all[inspectionId] || null;
}
