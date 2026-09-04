import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/config/app";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    system: APP_CONFIG.name,
    version: APP_CONFIG.version,
    act: APP_CONFIG.statutoryAct,
    timestamp: new Date().toISOString(),
  });
}
