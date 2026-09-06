/**
 * PackCheck AI - Gemini Daily Generation Budget Controller
 * Strictly enforces a zero-billing, free-tier safe cap of 20 actual Gemini generation requests per calendar day (UTC).
 * Checks budget BEFORE every API call and ensures every attempt (including retries) counts toward the limit.
 */

import fs from "fs";
import path from "path";

export const MAX_DAILY_GEMINI_REQUESTS = 20;

interface BudgetState {
  date: string; // YYYY-MM-DD (UTC)
  count: number;
}

let inMemoryBudget: BudgetState = {
  date: new Date().toISOString().slice(0, 10),
  count: 0,
};

function getStorageFilePath(): string {
  // Use /tmp on Vercel/serverless environments, or local directory for dev/node
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "gemini_budget.json");
  }
  return path.join(process.cwd(), ".gemini_budget.json");
}

function getCurrentUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadBudget(): BudgetState {
  const today = getCurrentUtcDate();
  if (inMemoryBudget.date !== today) {
    inMemoryBudget = { date: today, count: 0 };
  }

  const filePath = getStorageFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as BudgetState;
      if (data && data.date === today) {
        inMemoryBudget.count = Math.max(inMemoryBudget.count, data.count);
      } else if (data && data.date !== today) {
        // Reset for new calendar day
        inMemoryBudget = { date: today, count: 0 };
        saveBudget();
      }
    }
  } catch {
    // Fallback to in-memory state on file read error
  }

  return inMemoryBudget;
}

function saveBudget(): void {
  const filePath = getStorageFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(inMemoryBudget, null, 2), "utf8");
  } catch {
    // If filesystem is read-only, in-memory state is preserved
  }
}

/**
 * Checks if a Gemini generation request can be executed within the 20 requests/day limit.
 */
export function canExecuteGeminiRequest(): boolean {
  const state = loadBudget();
  return state.count < MAX_DAILY_GEMINI_REQUESTS;
}

/**
 * Records an actual Gemini generation request attempt toward the daily budget.
 * Returns true if the request was permitted and recorded, or false if the budget was already exhausted.
 */
export function recordGeminiRequest(): boolean {
  const state = loadBudget();
  if (state.count >= MAX_DAILY_GEMINI_REQUESTS) {
    return false;
  }
  state.count += 1;
  inMemoryBudget = state;
  saveBudget();
  return true;
}

/**
 * Returns the current daily Gemini usage status.
 */
export function getDailyGeminiUsage(): {
  count: number;
  limit: number;
  remaining: number;
  date: string;
} {
  const state = loadBudget();
  return {
    count: state.count,
    limit: MAX_DAILY_GEMINI_REQUESTS,
    remaining: Math.max(0, MAX_DAILY_GEMINI_REQUESTS - state.count),
    date: state.date,
  };
}

/**
 * Test helper to reset or simulate budget usage without exhausting live quota.
 */
export function setTestGeminiUsage(count: number, date?: string): void {
  inMemoryBudget = {
    date: date || getCurrentUtcDate(),
    count,
  };
  saveBudget();
}
