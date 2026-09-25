# FuelUp: Project Spec

> **Prep your meals smarter.**
> Meal plans for off-campus students, built around your effort level, your restrictions, your budget, and the food you already know.

This is the source of truth for the project. Read it at the start of every session. It is a starting point, not a script: if something here is wrong, risky, or there's a clearly better approach, say so and propose it before building. I want your judgment, not just execution.

---

## 1. The problem

In a dining hall, food and health stay balanced without you thinking about it. Off campus, that disappears. Students have to decide every day what to eat, whether it's healthy, whether they have the ingredients, whether they have time, and whether it fits the budget. Most end up eating for survival: chips can make you feel full three times a day, but your health pays for it. Nobody teaches you nutrition; you're left to piece it together from Instagram and Google.

Dietary restrictions and allergens make this much harder, and most food apps treat them as an afterthought. I have allergen limits myself and have seen friends struggle to plan or order around theirs.

**FuelUp's mission:** meet each student at their effort level, remember their week, keep them safe and on budget, and help them learn nutrition along the way.

---

## 2. Who it's for

Off-campus college students studying in the US, **from any background and cuisine** (not only Indian). Prices assume US grocery stores and USD.

Three kinds of students, each served differently:

| User | What FuelUp does |
|---|---|
| **Unmotivated / zero-cook** | Ready-made and assembly meals, healthier snack swaps. Never asks them to cook. |
| **Motivated but a little lazy** | Minimal-cook meals, batch cooking ("cook once, eat three times"), an "I'm lazy tonight" button. |
| **Self-researchers** | Deeper nutrition learning: detailed insights, the "why" behind suggestions, and better-choice comparisons, so they get well-researched answers here instead of piecing them together from Google and Instagram. |

Nobody obeys an app, the same way an unmotivated person ignores every alarm. So FuelUp never forces anything. It matches the user's level and occasionally offers **one step up** ("You've done zero-cook all week. Want a 5-minute upgrade tomorrow?"). Saying no changes nothing.

**Why use this instead of ChatGPT or Google?** A chatbot answers questions; FuelUp remembers your week. It knows you've already had eggs 4 times, that your grocery budget has $6 left, and what you usually buy, and it checks every suggestion against all of that.

---

## 3. Core principles (apply to every feature)

1. **AI proposes, code verifies.** Gemini generates plans, suggestions, and parses what users type. Deterministic code checks allergens, weekly limits, budget math, counting, and totals. Never trust the AI for counting, math, safety, or nutrition facts presented as exact.
2. **Safety first: allergens and food safety.** Every suggestion, from any feature, passes the safety check before the user sees it. Nothing expired or likely spoiled is ever suggested. Food safety is the number one priority.
3. **Low pressure, low effort.** Assume the plan happened unless told otherwise. Taps and multiple-choice over typing. No photo logging. No nagging, no reminders, no guilt.
4. **Friend, not mom.** Ask about tomorrow, don't audit yesterday. Good: "Leftover chili's still good till Thursday. Want it for lunch?" Bad: "Did you eat lunch?" Food-safety heads-ups use the same friendly tone and always put safety first: "Your bread will likely go stale by Friday. Freeze half now?" or "That chicken was bought 3 days ago. Cook it tonight or freeze it."
5. **Patterns, not precision.** A single meal estimate can be off by a lot (a "bowl of dal" can be 200 or 450 calories). Insights come from patterns across days, which stay true even when individual estimates are noisy. Label all numbers as estimates.
6. **Familiar first, then grow.** Suggestions use the user's cuisine and foods. At most one new dish per week, one step from what they know.
7. **User is always in control.** Any change the app makes on its own is visible, with one-tap undo.
8. **Fun, foody, minimal.** Warm, appetizing colors, cute food icons, generous spacing, mobile-first. It should feel like relief, not a chore. Designed by an expert, never cluttered.
9. **Never crash.** No API key, AI error, or bad JSON → graceful fallback and a friendly message.

---

## 4. What we're building

- A **web app** (a website that feels like an app), **mobile-first**.
- **Runs locally** (`npm run dev` → `http://localhost:3000`). **No deployment.**
- Code on **GitHub** so reviewers can read it and run it.
- Works **without an API key** using demo data and fallback plans. With a Gemini key in `.env.local`, AI features come alive.

### Navigation
3 tabs + a floating **"+ Log"** button available everywhere + a small budget chip in the header ("$12 left this week").

| Tab | Purpose |
|---|---|
| **Today** | Tomorrow's plan (and the week), matched to effort level and day |
| **Groceries** | Grocery list, "Your usuals", "Try something new", budget |
| **Insights** | Nutrition patterns, weekly recap, learning |

---

## 5. Features

### 5.1 Onboarding: 3 questions, under a minute
1. **Effort level:** Zero-cook / Minimal cook / I like cooking.
2. **Cuisine(s):** picker with many options (Mexican, Chinese, Korean, Italian, Middle Eastern, Indian, American, …).
3. **Allergies and restrictions:** hard avoids (never) and weekly limits (e.g. eggs max 4x/week).

Everything else (budget, foods you already eat, shopping day, busy days, nutrition goal) is asked **later, one at a time, when it becomes relevant**, with sensible defaults until then. Plus a **"Load demo data"** button to skip onboarding entirely.

### 5.2 Today: the plan
- Tomorrow's meals first, the week below. Each day has a type: Packed / Busy / Free / Out.
- Meals match **effort level × day type**. Zero-cook on a packed day: assembly meals (e.g. rotisserie chicken wrap, Greek yogurt + fruit + granola, frozen dumplings + bagged salad). Likes cooking on a free evening: a batch dish covering 2–3 meals.
- Each meal: food icon, name, prep time, estimated cost, estimated calories and protein, servings / which later meals leftovers cover, and a recipe search link (YouTube/Google search URL, no scraping).
- **"I'm lazy tonight"** button: 3 options under 10 minutes, from what the user has.
- Regenerate one meal, or swap it.
- **Healthier snack swaps**: accept that students snack; make the snacks better ("roasted chickpeas instead of chips: same crunch, much more protein").
- Occasional "one step up" offer, never forced.

### 5.3 Groceries
- List generated from the week's plan, grouped by category, each item with a food icon.
- Estimated prices are editable. **Total vs. grocery budget computed by code.** If over budget, suggest cheaper swaps in the **same ingredient role** (e.g. chicken thighs instead of breast; not chicken → spinach).
- Mark items as **bought** (with purchase date and where it's stored: fridge / pantry / freezer). Bought items become the simple pantry, each with an estimated expiry (see 5.5).
- **Your usuals:** most-bought items as one-tap adds (pure counting). Before there's purchase history, seed from onboarding answers.
- **Try something new:** one AI suggestion one step from what the user buys, allergen-checked. (Unlike Walmart, we have no other users' data, so this comes from the user's own profile.)

### 5.4 Logging: low pressure
- **Default:** planned meals count as eaten ("assumed") unless the user says otherwise.
- **"+ Log" button:** one box, "What did you have?". User types "chips and a burrito bowl" → AI parses into items with estimates → user taps confirm.
- **Evening recap (optional, once a day, only when the user opens the app):** 3 quick multiple-choice cards, options pre-filled from the plan and the user's own foods, so it's tapping, not remembering:
  1. Biggest meals today? (plan meals pre-selected + "something else")
  2. Snacks? (icons of usual snacks + "none")
  3. Fruit or veggies? (icons + "none")
  One "Went as planned" tap skips it all. Skippable, never repeated, never nagging. Days without a recap simply stay "assumed".
- **Voice (if time):** a mic button on the log box using the browser's built-in speech-to-text. Same pipeline as typing. Text always works as a fallback.
- **Your foods:** anything logged that wasn't suggested is remembered and can be suggested later (after the allergen check). The app learns from what users actually eat.

All inputs go through one pipeline: **text / voice / recap taps → parsed items → user confirms → saved.**

### 5.5 Food safety and hygiene (number one priority)
- Every bought item gets an **estimated expiry** from its purchase date, food type, and storage (fridge / pantry / freezer), plus opened vs. unopened where it matters. Examples: bread ~5–7 days in the pantry (much longer frozen), raw chicken 1–2 days in the fridge, leafy greens ~5 days, cooked leftovers 3–4 days in the fridge.
- **Shelf-life data comes from a curated table in code, never from the AI's memory.** The AI may not decide whether food is safe to eat. Items not in the table get a conservative default, and the user can edit any date (e.g. from the label).
- The plan **uses items before they expire** (perishables early in the week) and **never suggests expired or likely-spoiled items**.
- **Friendly heads-ups** before things go bad, with a useful action: cook it, freeze it, or use it in tomorrow's meal.
- Occasional **clean-habit tips** in context, never lectures: store raw meat on the bottom shelf of the fridge, thaw in the fridge not on the counter, cool leftovers within 2 hours, keep raw meat and ready-to-eat food on separate boards.
- Always shown as estimates: "Check the label, look, and smell. When in doubt, throw it out."

### 5.6 Insights: a fitness tracker for food
- Casual view: one line per day ("🟢 Good day", "🟡 Light on protein").
- Pattern insights: "Protein under target 5 of 7 days. Breakfast is the gap."
- Swap impact: "Swapping chips for roasted chickpeas this week added ~40g protein."
- Progress: "Veggie days went from 2 to 4."
- **Weekly recap card** (instead of streaks, which create guilt): "This week: 4 home-cooked meals, ~$18 saved vs ordering, protein on track 5 days."
- **Depth grows with engagement:** users who open Insights or log often are offered a deeper weekly breakdown. Offered, never forced.
- Nutrition facts shown to users must come from a small curated data table in code, not from the AI's memory. AI-estimated numbers are labeled as estimates.

---

## 6. How the app "learns"

The Gemini API is **stateless**: it never learns and its weights never change. The **app** learns by storing events (swaps, logs, purchases, skips) and having **code** summarize recent patterns into each AI prompt, e.g. "Buys Greek yogurt weekly. Rejected oatmeal twice. Tends to snack on chips on busy days." Use recent weeks, not all-time counts.

---

## 7. The safety and budget check (pure functions, fully tested)

- **Hard avoids with synonyms**, e.g. egg → mayo, omelette, French toast, many baked goods; peanut → satay, some sauces and granola; dairy → whey, casein, ghee; chocolate → cocoa, mocha, brownie. Protein bars and cookies often hide allergens. The synonym map must be easy to extend.
- **Weekly limits** counted across the whole week.
- **Budget totals** always computed by code.
- **Swaps stay within ingredient role.**
- **Expired or likely-spoiled items are never suggested**, including cooked leftovers past ~4 days. Expiry math is done by code from the curated shelf-life table.
- A plan that fails → one automatic retry with the errors sent back to the AI → if still failing, show clear warnings on the offending items. Never silently show an unsafe suggestion.
- UI note: "Always check labels. FuelUp helps you plan; it isn't medical advice."

---

## 8. Data model (starting point; improve it if you see better)

- **Profile:** effort level, cuisines, hard avoids, weekly limits, budget, shopping day, day types, nutrition goal/targets (defaults until asked).
- **FoodItem:** canonical name, emoji icon (fallback to category icon when no emoji exists, e.g. 🫘 legumes, 🧀 dairy), role (protein, legume, leafy veg, veg, fruit, grain, dairy, snack, ready-made…), allergen tags, shelf-life estimates by storage (fridge / pantry / freezer).
- **Meal:** name, items, prep time, est. cost, est. calories/protein/carbs/fat, servings, leftover coverage, effort level, recipe link, isNew.
- **WeekPlan:** start date, days → day type + meals.
- **GroceryItem:** item, est. price, bought flag, purchase date, storage location, opened flag, estimated expiry (computed by code).
- **LogEntry:** date, meal slot, items, source (assumed / recap / quick log / voice), confirmed flag.
- **Event:** swap / reject / accept / skip / purchase, item, context (day type), date. Summarized by code into prompts.
- Item names must be **canonical and consistent** across plan, groceries, and logs.

---

## 9. Tech

- **Next.js (App Router) + TypeScript + Tailwind.**
- **Vitest** for all pure logic (safety check, expiry math, budget math, pattern insights, usuals counting).
- **zod** to validate every AI response before use.
- **Storage:** localStorage, but **all reads/writes go through one storage module** so it can be swapped for Supabase later.
- **AI:** Gemini, called **only from server routes**, all calls in one AI module (e.g. `generatePlan`, `parseLog`, `suggestNew`, `lazyOptions`) so the model can be swapped. Check current Gemini SDK and model names.
- **API key** only in `.env.local` (git-ignored). Provide `.env.example`. **Never print, log, or ask for the key.**
- **Icons:** emoji with category fallbacks.
- **README:** what FuelUp is, the problem, features, setup (clone → `npm install` → optional key → `npm run dev`), design decisions, honest limitations, roadmap.

---

## 10. Build order

0. Read this spec, explain it back, challenge it, propose a plan. No code.
1. Setup.
2. Data model, storage module, demo data (2–3 personas with different cuisines, effort levels, and allergies).
3. Safety and budget check (allergens, weekly limits, expiry) + shelf-life table + tests.
4. Design system, food icons, app shell, 3-question onboarding.
5. Gemini plan generation + safety check loop + fallback.
6. Today tab.
7. Groceries tab (usuals, try something new, budget, bought items with expiry and heads-ups).
8. Logging: "+ Log" box, evening recap cards, Your foods.
9. Insights tab + weekly recap.
10. Voice, "I'm lazy tonight", snack swaps.
11. Bug and polish pass, README.

If time runs short, keep what exists **complete and working** rather than half-building more.

**Roadmap (after finishing the core features work on):** receipt scanning (groceries and delivery orders, splitting shared groceries with roommates), class-schedule screenshot for busy days, Cravings ("cook it vs order it"), USDA FoodData Central for exact nutrition, USDA FoodKeeper data for a complete shelf-life table, Supabase + login, calendar feed, deployment.

---

## 11. How to work with me

- I'm new to web development. **Before each phase, explain in plain language** what you'll build, why, and how the data flows. After it, tell me exactly how to test it.
- Stop after each phase and wait for my OK so I can review and commit.
- Use your creativity. Propose better structure, UI, or logic when you see it, and explain the tradeoff.
- When you make a design choice I didn't specify, tell me so I can agree or push back.
- Keep code clean and readable. I need to understand it well enough to explain it in an interview.
- Never touch `.env.local` or ask for secrets.
