# Moti Renew — Supabase setup

The Firebase client has been replaced with Supabase Auth and database access.

## 1. Create the database tables

1. Open the **moti-renew** project in Supabase.
2. Open **SQL Editor** and create a new query.
3. Copy and run the complete contents of `supabase/migrations/001_initial_schema.sql`.
4. Confirm the query succeeds. The migration creates `profiles`, `subscriptions`, `payments`, and `activities`, with Row Level Security policies that restrict each signed-in user to their own records.

## 2. Configure authentication

In Supabase, open **Authentication → URL Configuration** and add the deployed Render URL to the allowed redirect URLs:
`https://moti-renew.onrender.com/**`

Email/password sign-in is supported. If email confirmation is enabled, new users must confirm their email before signing in.

Google sign-in is optional. To enable it, configure the Google provider under **Authentication → Providers → Google** with your Google OAuth client ID and secret, and add the Supabase callback URL shown on that page to the Google OAuth client.

## 3. Add Render environment variables

In Render, open the Moti Renew Static Site → **Environment** and add:

- `VITE_SUPABASE_URL` — the Project URL from Supabase → Project Settings → API.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the publishable key from Supabase → Project Settings → API Keys.

Use only the browser-safe publishable key. Never put the Supabase secret/service-role key in a `VITE_` variable or frontend code.

Save the variables and trigger a new deploy.

## Notes

- Demo accounts continue to use browser-local storage and are for preview only.
- Real Supabase accounts store their subscriptions, payments, activities, and profile in Supabase.
- Existing Firebase data is not automatically copied into Supabase; export/import is a separate migration step.
