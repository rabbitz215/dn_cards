# DN Classic SEA - Monster Card DB (Next.js + Supabase)

73 cards parsed from your 12 images. Full filter by stat, rarity, nest. Admin CRUD.

## Stack
- Next.js 15 App Router
- Tailwind v4
- Supabase (optional, fallback to local JSON)

## Run
```bash
cd next-app
npm install
npm run dev # http://localhost:3000
```

## Admin
- Route: `/admin`
- Password env: `NEXT_PUBLIC_ADMIN_PASSWORD` default `admin123` in `.env.local`
- Features: Create / Edit / Delete cards, dynamic stat per rarity (5 values), custom nests, export JSON

## Supabase Setup
1. Create project at supabase.com
2. SQL Editor -> run `supabase_schema.sql` (root of CARDS folder, also in /public)
   - Creates tables: `nests`, `monster_cards`, `card_stats`, `stat_types`
   - RLS policies: anon read/insert/delete (tighten in prod)
   - Seeds nests

3. Create `.env.local` from `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_ADMIN_PASSWORD=yourpass
```

4. Site auto-detects env. Without env it uses `src/app/cards.json`.

If you want to migrate local edits to Supabase later, just set env and save again in admin - it upserts.

## Future Updates
When new Nest drops:
- Go /admin -> + New Card -> fill No, Name, Nest, stats (5 values per stat)
- If Supabase configured, it saves instantly live
- If not, Export JSON -> replace `src/app/cards.json` and `public/cards.json`

## Structure
- `src/app/page.tsx` -> main DB with filters
- `src/app/admin/page.tsx` -> admin CRUD
- `src/lib/supabase.ts` -> client
- `src/app/cards.json` -> fallback DB
