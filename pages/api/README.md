# pages/api — DEPRECATED

These files were originally written as Next.js API routes but this project uses **Vite + React** (not Next.js).
Next.js API routes do not work in a Vite project.

**These have been replaced with Supabase Edge Functions:**

| Old Next.js route | New Supabase Edge Function |
|---|---|
| `pages/api/collectors/register.ts` | `supabase/functions/register-collector/index.ts` |
| `pages/api/attestations/submit.ts` | `supabase/functions/submit-attestation/index.ts` |
| `pages/api/recovery-agent/manage.ts` | `supabase/functions/verify-attestation/index.ts` |

Deploy edge functions with:
```
supabase functions deploy register-collector
supabase functions deploy submit-attestation
supabase functions deploy verify-attestation
```

The frontend now calls Supabase directly via `@supabase/supabase-js` client using the hooks in
`src/hooks/usePlastiCatchData.ts`.
