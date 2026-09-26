# FuelUp

**Prep your meals smarter.**
Meal plans for off-campus college students, built around your effort level, your restrictions, your budget, and the food you already know.

> 📸 _Screenshot: welcome screen (phone)_
> 📸 _Screenshot: Today tab (desktop)_

---

## The problem

In a dining hall, food and health stay balanced without you thinking about it. Off campus, that disappears. Every day becomes five decisions: what's healthy, what's in the fridge, what's about to go bad, how much time there is, and how much money is left. Most students end up eating for survival, and nobody teaches them nutrition.

Allergies make it harder. Most food apps treat them as an afterthought; FuelUp treats them as the first check on every suggestion.

## Who it's for

Off-campus students in the US, from any background and cuisine:

| Student | What FuelUp does |
|---|---|
| **Zero-cook** | Ready-made and assembly meals. Never asks them to cook. |
| **Motivated but a little lazy** | Quick meals and batch cooking ("cook once, eat three times"). |
| **Likes cooking / self-researcher** | Real recipes, batch dishes on free days, deeper nutrition insight. |

**Why not just ask ChatGPT?** A chatbot answers questions. FuelUp remembers your week: it knows you've already had eggs twice, that raw chicken bought yesterday must be cooked by tomorrow, and what your budget allows, and it checks every AI suggestion against all of that in code.

## What it does today

- **3-question onboarding** (effort, cuisines, allergies and limits), or **Load demo data** with three personas.
- **A verified week of meals, shown one day at a time.** The whole week is planned behind the scenes (groceries, batch cooking, and weekly limits need it), but Today shows tomorrow first, with "Peek at the rest of the week".
- **Every meal is safety-checked** before you see it: allergens (including hidden ones like mayo or satay), diets, rolling weekly limits, food expiry, and leftovers. Anything unsafe is removed and replaced by a "tap to regenerate" slot, and regenerating is re-checked against the whole week.
- **Budget realism:** grocery cost is computed from whole packages; over-budget plans are sent back to Gemini once with the total and the priciest items, asking it to reuse ingredients.
- **Works without an API key:** a diet-aware built-in week, through the same safety check.
- Mobile-first, with a desktop layout for wide screens.

> 📸 _Screenshot: Today on a phone, tomorrow's meals_
> 📸 _Screenshot: onboarding, "Anything to stay away from?"_
> 📸 _Screenshot: a removed meal with "Tap to regenerate"_

## Setup

Requires **Node.js 20.9+** (developed on Node 24).

```bash
git clone <your-repo-url> fuelup
cd fuelup
npm install
npm run dev          # → http://localhost:3000
```

**That's it: FuelUp works without an API key**, using built-in plans and demo data. Tap **Load demo data** to try Jae, Arjun, or Sofia.

**Optional: turn on Gemini.** Copy `.env.example` to `.env.local` and add a key from [Google AI Studio](https://aistudio.google.com/apikey):

```bash
cp .env.example .env.local
# then edit .env.local: GEMINI_API_KEY=your-key
```

`.env.local` is git-ignored. The key is only read on the server and is never sent to the browser or logged.

| Command | What it does |
|---|---|
| `npm run dev` | Start the app locally |
| `npm test` | Run the test suite (Vitest, ~200 tests) |
| `npm run build` | Production build (also type-checks) |
| `npm run lint` | ESLint |

Optional settings in `.env.local`: `GEMINI_MODEL` (defaults to `gemini-3.6-flash`; falls back to `gemini-flash-latest` when busy) and `FUELUP_DEBUG_FORCE_RETRY=1` (development only: forces one AI retry so you can watch the safety loop).

## Demo personas

| Persona | Type | What it shows |
|---|---|---|
| **Jae** 🍙 | Zero-cook, Korean/American | Peanut allergy as a hard avoid: granola, trail mix, and satay are blocked, including "may contain" items. |
| **Arjun** 🍛 | Minimal cook, North Indian, veg + chicken | Weekly limits: eggs max 4× and chocolate max 3× in any 7 days, with 2 egg meals already logged. |
| **Sofia** 🌮 | Likes cooking, Mexican/Mediterranean | Vegetarian and dairy-free; six days of logs for insights. |

Personas are built relative to today's date, so pantry heads-ups (the chicken that must be cooked tomorrow) always look realistic.

## Key design decisions

**AI proposes, code verifies.** Gemini plans meals and nothing else. It never decides what is safe, counts anything, or supplies a number the user sees as fact. Every AI reply goes through: JSON schema → zod validation → catalog lookup → `verifyPlan()` → one retry with the exact problems → `enforcePlan()`, which removes anything still unsafe. The UI only accepts a `Verified<WeekPlan>`, a TypeScript type that only the safety gate can produce, so a code path that skips the check doesn't compile.

**Catalog-only suggestions.** Everything FuelUp suggests is built from a curated catalog of ~140 foods, each with allergen tags, "may contain" tags, shelf life, nutrition, and package price. If Gemini uses an ingredient outside the catalog (say, "pad thai sauce", which could hide peanuts and fish), the meal fails the check. Food the user logs can be free text, labeled as an estimate.

**Two layers of allergen defense.** Ingredient tags first, then a whole-word scan of the meal name with a synonym map (egg → mayo, omelette, French toast; peanut → satay…), so "French toast" is caught even if its ingredients leave out egg. For hard avoids, "may contain" counts as a fail. The avoided foods are also removed from the list Gemini sees, so it can't pick them.

**Rolling 7-day weekly limits.** Limits exist for allergy reasons, so they're strict: every run of 7 consecutive days must stay within the limit (a calendar week would let "twice on Friday, four times Saturday–Tuesday" pass). Logged meals count, and planned meals on past days count as eaten unless something else was logged. A limit violation removes the meal, like a hard avoid.

**High-risk foods.** Raw meat, poultry, fish, eggs, and dairy are flagged. Their shelf lives follow the low end of USDA ranges (FDA/USDA Refrigerator & Freezer Storage Chart; USDA FSIS dairy guidance), with the purchase day counting as day 1. A high-risk food planned after it would be unsafe **blocks** the meal, so the plan moves it earlier; produce only warns. Each high-risk food has a storage tip ("bottom shelf, sealed, cook within 1–2 days or freeze").

**Patterns, not precision.** Nutrition and cost come from the catalog and are always shown as estimates. Insights will look at patterns across days, which stay true even when single estimates are rough.

**The app learns; the AI doesn't.** Gemini is stateless. FuelUp stores events (purchases, rejections, logs), and code summarizes recent weeks into each prompt ("Said no to: Overnight oats (2x)").

**Never crash, never lose data.** No key, a network error, a timeout, or bad JSON leads to a friendly message and a safety-checked built-in week. Saved data is validated on load; old shapes are migrated, broken entries are dropped one by one, and a profile (which holds allergies) is never silently wiped: unreadable data is backed up first.

## How it's built

- **Next.js (App Router) + TypeScript + Tailwind**, running locally.
- **zod** validates every AI reply, every API request, and all saved data.
- **Gemini** (`@google/genai`), called only from server routes (`/api/plan`, `/api/meal`), all in one file so the model can be swapped.
- **localStorage** behind one storage module, so it can be swapped for a database later.
- **Vitest** for all the pure logic. Safety tests were checked by deliberately breaking the code (a 1-day window, ignoring "may contain", an off-by-one expiry, skipping the whole-plan check on swaps) and confirming the tests fail.

```
src/
  app/            pages (onboarding, today, groceries, insights) and API routes
  components/     UI: shell, onboarding, today, shared ui
  hooks/          React access to storage and the plan
  lib/
    data/         food catalog, allergen synonyms, diets, personas, labels
    safety/       allergens, limits, expiry, budget, swaps, verify (the gate)
    planner/      plan pipeline, built-in weeks, regenerate, request context
    ai/           Gemini client, prompts, response schemas
    storage/      the only code that touches localStorage (+ migrations)
```

## Status

**Core planning and safety are complete:** onboarding, the food catalog, the safety gate, Gemini planning with retry and fallback, and the Today tab (phone and desktop).

**In progress:** Groceries (list from the plan, budget, pantry with expiry heads-ups), logging ("+ Log", evening recap), and Insights (patterns and a weekly recap).

## Honest limitations

- Nutrition, prices, and shelf lives are **estimates** from a curated table, not exact data. Always check labels, look, and smell: when in doubt, throw it out.
- The catalog has ~140 foods. Meals outside it can be logged but not suggested.
- "May contain" tags are conservative guesses about common brands; they can't know the exact product you bought.
- Grocery estimates assume nothing is left over from earlier weeks unless it's in your pantry.
- Gemini's free tier can be busy (HTTP 503) or rate-limited (429). FuelUp retries, tries a backup model, then falls back to a built-in week.
- Data lives in your browser (localStorage): it's per device and cleared if you clear site data.
- FuelUp helps you plan; it isn't medical advice.

## Roadmap

- Groceries tab: list from the plan, editable prices, cheaper same-role swaps, pantry with expiry heads-ups
- Logging: "+ Log" quick log (typed or voice), optional evening recap, "Your foods"
- Insights: day-by-day view, patterns across days, weekly recap card
- "I'm lazy tonight" and healthier snack swaps
- A larger tagged meal library for no-key mode
- First-visit intro animation for the logo
- Later: receipt scanning (and splitting groceries with roommates), class-schedule import for busy days, "cook it vs order it", USDA FoodData Central and FoodKeeper data, accounts and sync (Supabase), deployment

---

_Always check labels. FuelUp helps you plan; it isn't medical advice._
