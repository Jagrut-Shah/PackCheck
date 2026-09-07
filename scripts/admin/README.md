# Open Food Facts Demo Seeder

One-time/admin utility for creating real demo inspections under the authenticated
`jagrut916@gmail.com` account. It is not part of the application runtime.

## Run

From the repository root, set only the non-password runtime configuration in the
current terminal session:

```powershell
$env:PACKCHECK_APP_URL = "https://pack-check-azure.vercel.app"
$env:NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "your-anon-key"
npx tsx scripts/admin/seed-open-food-facts-demo.ts
```

The utility prompts for the password interactively with hidden input. The password
is never written to source, environment files, logs, manifests, or API payloads
outside the Supabase password sign-in request.

The script verifies that the authenticated email is exactly `jagrut916@gmail.com`
before creating anything. It uses the existing authenticated Next.js endpoints for
inspection creation, OCR, extraction, extracted-field persistence, and compliance
results. It does not use the service-role key or direct database inserts.

Progress is resumable through `.data/open-food-facts-demo-manifest.json`, which is
ignored by Git. Failed products are retained with their reason; successful barcodes
are skipped on reruns.

Do not run this against another account or an unintended Supabase/Vercel project.