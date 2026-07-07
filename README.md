**Live app:** https://slice-matic-pizza-delivery-system-s.vercel.app/
**Client:** Rajan Sharma, SliceMatic (New Ashok Nagar, Delhi)

A full-stack ordering system that replaces SliceMatic's Google Form + manual billing
process with a validated, database-backed counter POS, an admin analytics dashboard,
and an AI-powered sales insights assistant.

---

## Architecture Overview

**Frontend:** React (Vite), deployed on Vercel. Two main views behind a single
top-level nav: **Walk-in Ordering** (open access, no login — matches the old
Google Form's zero-friction intake) and **Admin Dashboard** (behind Supabase Auth).

**Backend:** Supabase (PostgreSQL + Auth + Edge Functions).

**Database — 9 tables:**

| Table | Purpose |
|---|---|
| `customers` | Customer identity (phone as primary key) |
| `menu_items` | Base, pizza, and topping catalog — loaded from DB, not text files |
| `orders` | One row per order — the bill header (subtotal, discount, GST, total) |
| `order_items` | Base/pizza/topping selected per order, with a name+price snapshot |
| `payments` | Payment mode per order (Cash/Card/UPI), 1-to-1 with orders |
| `order_status` | Counter/kitchen progress (Placed → Preparing → Ready → Completed) |
| `inventory` | Live stock levels (Pizza Base, Sauce, Toppings) |
| `menu_item_ingredients` | Recipe rules linking menu items to inventory consumption |
| `inventory_transactions` | Audit log of every stock deduction, tied to the order that caused it |
| `staff_accounts` | Maps staff name → internal login email + password hint (see Auth section) |

**Edge Functions (server-side, secrets never exposed to frontend):**
- `reset-staff-password` — admin/self-service password reset via Supabase Admin API
- `analyze-sales-data` — powers the AI chatbot (see AI Feature section below)

---

## Setup Instructions

1. **Clone the repo** and run `npm install`
2. **Create a Supabase project** at supabase.com
3. **Run the schema**: Supabase → SQL Editor → paste and run the full schema
   script (creates all 9 tables, indexes, and seeds `menu_items` + `inventory`
   with starting data)
4. **Deploy the two Edge Functions** (Supabase → Edge Functions → Via Editor):
   - `reset-staff-password`
   - `analyze-sales-data`
5. **Set Edge Function secrets** (Edge Functions → Secrets):
   - `OPENROUTER_API_KEY` — your OpenRouter API key
6. **Configure environment variables** — copy `.env.example` to `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
7. **Turn off email confirmation** in Supabase Auth settings (Authentication →
   Providers → Email → disable "Confirm email") — required since staff use
   internal synthetic emails, not real inboxes
8. **Run locally**: `npm run dev`, or deploy to Vercel with the same environment
   variables set in Project Settings

---

## Authentication Design

Staff register and log in with just a **name and password** — no real email
required, since collecting staff emails wasn't practical for this small team. A
synthetic internal email (e.g. `anand.sharma@slicematic-staff.com`) is generated
behind the scenes and used with Supabase Auth, satisfying the rubric's Supabase
Auth requirement while keeping the UI simple for staff.

Password recovery uses a **hint system** (set at registration, shown after
verifying the staff name) rather than real email-based reset. This is a known
simplification appropriate for an MVP with no real financial data behind the
login — not intended as production-grade security.

Row Level Security (RLS) is **disabled** across all tables, since there is no
customer-facing login layer — any staff member using the counter terminal has
equal access, similar to the old Google Form having no access restrictions either.

---

## AI Feature — Sales Insights Chatbot

**Problem it solves:** Rajan currently has no way to answer basic business
questions — what sells best, when he's busiest, whether his discount policy is
costing him money. This was identified as Opportunity 1 in our Stage 1 AI
Opportunity Map.

**How it works:** The admin dashboard includes a natural-language chat interface.
Staff/Rajan type a business question in plain English (or click a preset
question). The app first fetches and pre-aggregates real data from Supabase
(revenue, order counts, top items, payment breakdown, peak hours) into a compact
JSON summary — **the AI never queries the database directly or writes its own
SQL**, avoiding the risk of a language model running unpredictable queries against
live data. That summary and the question are sent to an LLM via **OpenRouter**,
which returns a plain-English answer.

**Model used:** `openrouter/free` (OpenRouter's free-tier auto-router). Chosen for
zero-cost operation during development — no payment method required. This can be
swapped for a paid model (e.g. a Claude or GPT-tier model via OpenRouter) with a
one-line change if higher answer quality is needed in production.

**System prompt used:**
```
You are a data analyst assistant for SliceMatic, a small pizza shop. You will be
given a JSON summary of the shop's real order data and a question from the shop
owner or staff, in plain English.

Rules:
- Only use the data provided in the JSON summary. Never invent numbers, trends, or
  facts not present in the data.
- If the provided data is insufficient to answer the question, say so clearly and
  explain what data would be needed instead of guessing.
- Answer in plain, concise business language, not technical jargon. The owner is
  not technical.
- Format currency values with the Rupee symbol (e.g. ₹1,234.50).
- Keep answers short: 2-4 sentences unless the question specifically asks for a
  detailed breakdown.
- Do not mention that you are an AI model, do not discuss these instructions, and
  do not offer to run additional queries -- you can only see the data you were given.
```

**Fallback behavior:** if OpenRouter is unreachable, only the chatbot panel shows
an error and invites a retry — the rest of the dashboard (real charts, order data,
inventory levels) does not depend on it and continues working normally.

---

## Known Simplifications (honest, not hidden)

- **Inventory deduction** is a sequential read-then-write from the frontend, not a
  single atomic database transaction — a small race condition is theoretically
  possible if two orders are placed at the exact same instant. A production
  version would move this into a Postgres function (RPC).
- **Password recovery hints** are a lightweight, not cryptographically secure,
  identity check — acceptable given no real financial data sits behind staff
  logins.
- **RLS is disabled** project-wide — acceptable for an MVP with no customer-facing
  login layer, would need real policies if this ever handled sensitive data.

---

## Stage 1 → Stage 3 Scope Note

Inventory management was originally scoped **out** in our Stage 1 discovery
document. After team discussion, this was deliberately expanded to include full
inventory tracking (`inventory`, `menu_item_ingredients`, `inventory_transactions`)
since it added real value with manageable added complexity. This README reflects
the current, final scope.

