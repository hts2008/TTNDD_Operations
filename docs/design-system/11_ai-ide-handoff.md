# 11 — AI IDE Handoff Protocol

> Cách Cursor / Claude Code / Windsurf / Continue / Cline / VSCode Copilot đọc guideline + sinh code đúng spec.
>
> Bao gồm: rule file template, prompt patterns, validation, debugging strategy.

---

## 1. Mục tiêu

Khi developer prompt AI IDE "implement [SCREEN:dashboard-doansinh]", AI phải:

✅ Sinh component với token đúng (không hard-code màu)
✅ Implement đầy đủ state (loading, error, empty)
✅ A11y: aria-label, focus, contrast
✅ Mobile-first responsive
✅ Microcopy đúng Tu Tiên / Plain mode
✅ Respect 3 rank theme switching
✅ Type-safe TypeScript
✅ shadcn/ui base, custom theo guideline

❌ Không sinh component từ scratch khi guideline đã có SPEC
❌ Không hard-code "#3B82F6" — phải dùng `bg-rank-primary-500`
❌ Không bỏ qua state — phải có loading + error + empty
❌ Không vi phạm word ban-list
❌ Không skip a11y

---

## 2. Setup AI IDE — rule file

### 2.1. Cursor `.cursorrules` (project root)

```
# TTNDD_Operations — AI IDE Rules

Bạn là engineering assistant cho TTNDD_Operations, một Next.js 15 + React 19 +
TypeScript + Tailwind 4 + shadcn/ui app phục vụ Đoàn Thiếu Nhi Đạo Đức
(Vietnamese youth scout organisation). UI theo phong cách MMORPG tu tiên Việt
Nam với lõi giá trị Hướng Đạo Sinh.

## Always do
1. Đọc `docs/design-system/00_README.md` trước khi bắt đầu task UI.
2. Tham chiếu `docs/design-system/05_components.md` `[SPEC:<id>]` khi tạo component.
3. Tham chiếu `docs/design-system/08_screen-blueprints.md` `[SCREEN:<id>]` khi tạo screen.
4. Dùng token từ `docs/design-system/03_design-tokens.md`. KHÔNG hard-code color/spacing/radius.
5. Microcopy theo `docs/design-system/07_content-and-accessibility.md`.
6. Mobile-first 360px. Add `md:`, `lg:`, `xl:` cho responsive.
7. State đầy đủ: default, loading, error, empty. Đặt `loading.tsx`, `error.tsx`, `not-found.tsx`.
8. A11y: aria-label cho icon-only button, focus-visible ring, contrast ≥ 4.5:1.
9. TypeScript strict. Không `any`, không `@ts-ignore` ngoài comment giải thích.
10. shadcn/ui là base — clone vào `apps/web/components/ui/`. Custom variant theo SPEC.

## Never do
1. Hard-code màu hex/rgb trong code. Dùng Tailwind class với token alias.
2. Skip state (chỉ render happy path).
3. Bỏ qua mobile responsive.
4. Tạo component mới khi đã có SPEC sẵn — extend, không re-implement.
5. Dùng từ trong ban-list: chết, máu, sát, ma quỷ, địa ngục, yêu khí.
6. Push trực tiếp lên main. Dùng feature branch.
7. Skip TypeScript types.
8. Bỏ qua hooks dev-side validation: ESLint, type-check.

## Code style
- Indent: 2 spaces
- Quote: double for JSX, single for JS
- Trailing comma: always
- Component file: PascalCase.tsx
- Util file: kebab-case.ts
- Folder: kebab-case
- React: function component + named export
- Server component default; "use client" chỉ khi cần
- Co-locate stories: `Button.tsx` + `Button.stories.tsx`

## Imports order
1. React / Next
2. External package
3. `@/lib/*`
4. `@/components/*`
5. Relative `./`
6. CSS

## Test
- Vitest cho unit
- Playwright cho e2e (chỉ critical flow)
- Storybook stories đầy đủ state
- a11y check qua axe addon

## Commit message
`<type>(<scope>): <subject>`
type = feat | fix | refactor | docs | style | test | chore | perf

## Reference doc khi không chắc
- Brand: 01_foundation.md
- Visual: 02_visual-language.md
- Tokens: 03_design-tokens.md
- IA: 04_ia-and-layouts.md
- Components: 05_components.md
- Game: 06_gamification-mmorpg.md
- Content/A11y: 07_content-and-accessibility.md
- Screens: 08_screen-blueprints.md
```

### 2.2. Claude Code `CLAUDE.md` (project root)

````markdown
# TTNDD_Operations — Claude Code instructions

Khi user yêu cầu UI work, bạn phải:

1. **First read** `docs/design-system/00_README.md` để hiểu navigation guideline.
2. **For component**: search `[SPEC:<id>]` trong `docs/design-system/05_components.md`.
3. **For screen**: search `[SCREEN:<id>]` trong `docs/design-system/08_screen-blueprints.md`.
4. **For token**: lookup ở `docs/design-system/03_design-tokens.md`.
5. **For microcopy**: tham chiếu `docs/design-system/07_content-and-accessibility.md`.

## Code generation rules

- Stack: Next.js 15 App Router · React 19 · TypeScript · Tailwind 4 · shadcn/ui
- State: Zustand (client UI), TanStack Query (server state)
- Form: react-hook-form + zod
- Test: Vitest + Playwright + Storybook

## Token usage

Tailwind class pattern:

```tsx
// ✅
<div className="bg-rank-primary-50 border-rank-primary-200 text-rank-primary-700 rounded-lg p-4">

// ❌
<div className="bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8] rounded-lg p-[16px]">
```
````

## State pattern checklist

Khi tạo screen/route, đảm bảo có:

- `page.tsx` — main content
- `loading.tsx` — skeleton
- `error.tsx` — error boundary
- `not-found.tsx` — 404 (nếu segment có dynamic)

## A11y must-have

- `aria-label` cho icon-only
- `aria-describedby` cho input có helper
- `role` cho landmark
- focus-visible ring
- contrast ≥ 4.5:1 cho text
- semantic HTML (button không phải div)
- alt text cho img

## Plan mode

Khi user prompt "implement [SCREEN:...]":

1. Đọc spec đầy đủ trước (READ tool)
2. Plan ra component cần tạo / extend
3. Confirm với user trước khi viết
4. Implement theo plan
5. Test build pass
6. Suggest commit message

## Never auto-commit

Wait for user confirm before `git commit` and `git push`.

````

### 2.3. Windsurf `.windsurfrules` / Cline `.clinerules`

Tương tự `.cursorrules`, file path khác.

### 2.4. VSCode + Copilot instructions

Settings `github.copilot.chat.codeGeneration.instructions`:

```json
[
  {
    "text": "When generating UI code for TTNDD, always reference docs/design-system/. Use token classes (bg-rank-primary-500) not hex. Implement state (loading, error, empty). Mobile-first responsive. Read 05_components.md for component spec [SPEC:id]."
  }
]
````

---

## 3. Prompt patterns

### 3.1. Prompt sinh 1 màn

```
@docs/design-system/08_screen-blueprints.md

Implement [SCREEN:dashboard-doansinh] theo spec.

Yêu cầu thêm:
- Path: apps/web/app/(app)/dao-the/page.tsx
- Server Component (mặc định), client island chỉ ở QuestCard action
- Fetch user stats từ /api/me/stats (giả lập với mock data trước)
- Fetch quests từ /api/quests?status=active (mock)
- Loading state với skeleton matching layout
- Error boundary
- Mobile (< md): stack vertical, hide quest panel, show bottom nav
- 3 rank theme test: switch document.documentElement.dataset.rankTheme

Reference:
- 05_components.md cho [SPEC:btn-primary], [SPEC:game-hud-topbar], [SPEC:game-quest-card]
- 03_design-tokens.md cho token
- 07_content-and-accessibility.md cho microcopy

KHÔNG hard-code màu. Đảm bảo a11y.
```

### 3.2. Prompt sinh 1 component

```
@docs/design-system/05_components.md

Implement component theo [SPEC:btn-primary].

Path: apps/web/components/ui/button.tsx
Base: shadcn/ui Button (clone, sau đó custom)

Variants required:
- variant: default | secondary | outline | ghost | destructive | link
- size: sm | md | lg
- iconLeft, iconRight slot
- loading state với spinner

Token strict:
- bg: bg-rank-primary-500 (NOT #3B82F6)
- hover: bg-rank-primary-600
- text: text-white
- focus ring: ring-2 ring-rank-primary-500 ring-offset-2

A11y:
- type="button" default
- aria-busy khi loading
- disabled state có aria-disabled

Type-safe với cva (class-variance-authority).

Sau khi xong, tạo Button.stories.tsx với all variants × all sizes × all states.
```

### 3.3. Prompt extend component có sẵn

```
@apps/web/components/ui/button.tsx

Extend Button để support new variant "quest" theo [SPEC:game-quest-card] usage.

- Background: gradient từ rank-primary-400 → rank-primary-600
- Icon Sparkles auto-prepend khi variant="quest"
- Subtle shimmer animation khi hover (CSS only)

Cập nhật Button.stories.tsx với variant mới.
```

### 3.4. Prompt sinh microcopy

```
@docs/design-system/07_content-and-accessibility.md

Tạo i18n keys cho onboarding flow (5 step).

Output:
- `apps/web/messages/vi-VN.tu_tien.json`
- `apps/web/messages/vi-VN.plain.json`

Cấu trúc:
{
  "onboarding": {
    "step1": {
      "title": "...",
      "subtitle": "...",
      "button": { "next": "...", "back": "..." }
    },
    ...
  }
}

Microcopy theo file 07, tone "đệ tử mode" cho .tu_tien.json, "bạn / Quý phụ huynh" cho .plain.json.

Validate không có từ trong ban-list §3.5.
```

### 3.5. Prompt sinh test

```
@apps/web/components/game/quest-card.tsx
@docs/design-system/05_components.md (SPEC:game-quest-card)

Viết test cho QuestCard.

1. Vitest unit test (quest-card.test.tsx):
   - Render với mỗi state: locked, active, in-progress, submitted, completed
   - Click "Khởi luyện" trigger onStartQuest callback
   - Display progress bar 2/3 đúng

2. Storybook story (quest-card.stories.tsx):
   - All states
   - 3 rank theme
   - Mobile + desktop viewport

3. a11y check trong test với @axe-core/react.

4. Optional Playwright e2e nếu là flow critical.
```

---

## 4. Prompt template "anatomy"

5 phần cho prompt tốt:

```
[GOAL]      — Implement gì
[REFERENCE] — File guideline + SPEC ID
[PATH]      — File path output
[CONSTRAINTS] — Token strict, a11y, mobile-first, state
[ACCEPTANCE] — Định nghĩa "done"
```

Ví dụ:

```
[GOAL]
Implement HUD Top Bar component cho desktop và mobile.

[REFERENCE]
- docs/design-system/06_gamification-mmorpg.md §1
- docs/design-system/05_components.md [SPEC:game-hud-topbar], [SPEC:game-exp-bar], [SPEC:game-rank-badge]
- docs/design-system/03_design-tokens.md

[PATH]
apps/web/components/game/hud-top-bar.tsx
apps/web/components/game/hud-top-bar.stories.tsx
apps/web/components/game/exp-bar.tsx
apps/web/components/game/rank-badge.tsx

[CONSTRAINTS]
- Token strict (no hex)
- Mobile: collapse to compact (logo + avatar + bell)
- 3 rank theme switching
- Animation: EXP bar fill 400ms ease-out
- Level up confetti trigger via prop
- a11y: aria-label cho icon-only button

[ACCEPTANCE]
- Stories cover: default, EXP near level-up (95%), low EXP (10%), 3 rank theme, mobile viewport
- pnpm test pass
- pnpm typecheck pass
- pnpm lint pass
```

---

## 5. Validation strategy

### 5.1. ESLint rule (custom)

```js
// .eslintrc.cjs
module.exports = {
  rules: {
    'no-hardcoded-color': 'error',
    // (custom rule scan className for /#[0-9a-f]{3,8}/ pattern → error)
  },
};
```

### 5.2. Pre-commit hook

```yaml
# .husky/pre-commit
pnpm typecheck
pnpm lint
pnpm test --run --bail
```

### 5.3. CI checks

GitHub Actions:

```yaml
- name: Type check
  run: pnpm typecheck

- name: Lint
  run: pnpm lint

- name: Test
  run: pnpm test --run

- name: A11y check
  run: pnpm test:a11y # custom: storybook test-runner with @axe-core/playwright

- name: Token drift check
  run: pnpm tokens:check # compare Figma export vs source
```

### 5.4. Visual regression

Sử dụng Chromatic (Storybook) hoặc Percy:

- Snapshot mỗi component story
- 3 rank theme variant
- 3 viewport: mobile / tablet / desktop

---

## 6. AI IDE pitfalls + fix

| Pitfall             | Symptom                               | Fix                                                        |
| ------------------- | ------------------------------------- | ---------------------------------------------------------- |
| Hard-code màu       | `bg-[#3B82F6]` xuất hiện              | ESLint rule → AI re-prompt với "use token alias"           |
| Skip state          | Component không có loading/error      | Prompt include "implement all 4 states"                    |
| Skip a11y           | Icon button không có aria-label       | Prompt template force a11y checklist                       |
| Skip mobile         | `lg:` first, `md:` second             | Prompt "mobile-first 360px before desktop"                 |
| Hard-code microcopy | Text inline thay vì i18n key          | Prompt "use i18n key, file in messages/"                   |
| Tạo lại component   | Component đã có nhưng AI re-implement | Prompt "check apps/web/components/ trước"                  |
| Vi phạm ban-list    | "máu", "chết" xuất hiện               | Lint rule scan, hoặc manual review                         |
| Misuse 'use client' | Mọi file đều "use client"             | Prompt "default Server Component, only client when needed" |
| Type any            | `any` xuất hiện                       | tsconfig strict + ESLint no-explicit-any                   |

---

## 7. Iterative refinement loop

```
1. Prompt initial (template §4)
2. AI generate
3. Review:
   - Visual match SPEC?
   - Token strict?
   - State đủ?
   - A11y pass?
4. Fix prompt nếu cần:
   - "Replace hex with token: bg-[#3B82F6] → bg-rank-primary-500"
   - "Add loading.tsx with skeleton matching layout"
   - "Add aria-label to bell icon button"
5. Re-generate or AI apply fix
6. Run test + lint
7. Commit
```

---

## 8. Cross-file context: Cursor @ mention

Cursor (và một số IDE) support `@filename` để force AI read 1 file. Pattern dùng:

```
@docs/design-system/05_components.md
@docs/design-system/08_screen-blueprints.md
@apps/web/components/ui/button.tsx

Implement [SCREEN:quest-detail]. Path: apps/web/app/(app)/dao-the/nhiem-vu/[id]/page.tsx
```

→ AI có context đầy đủ.

---

## 9. MCP (Model Context Protocol) server gợi ý

Nếu setup MCP, có thể tạo server cho:

- **design-system-mcp**: serve spec content qua tool calls
- **figma-mcp**: query Figma file cho component spec
- **tokens-mcp**: lookup token value

→ AI IDE qua MCP có thể "search SPEC" thay vì grep file.

(Phase 2, optional.)

---

## 10. Mock data convention

Khi AI sinh screen với mock data:

```ts
// apps/web/lib/mock/users.ts
export const mockDoansinh = {
  id: 'u-001',
  name: 'Nguyễn An',
  rank: 'trucco' as const,
  exp: 1240,
  expToNextLevel: 2000,
  patrol: { id: 'p-hh', name: 'Hồng Hạc' },
  spices: {
    social: 80,
    physical: 65,
    intellectual: 90,
    character: 75,
    emotional: 70,
    spiritual: 55,
  },
};

export const mockQuests = [
  {
    id: 'q-001',
    title: 'Linh Quyết «Nấu cơm gia đình»',
    spices: 'character' as const,
    exp: 50,
    difficulty: 2,
    deadline: '2026-05-26',
    progress: { current: 2, total: 3 },
    state: 'in-progress' as const,
  },
  // ...
];
```

Tách `lib/mock/` rõ ràng, để dễ replace sang fetch API sau.

---

## 11. Replace mock → API protocol

Khi connect backend thật:

```ts
// Before
import { mockQuests } from "@/lib/mock/quests";
export default async function Page() {
  return <QuestList quests={mockQuests} />;
}

// After
import { fetchQuests } from "@/lib/api/quests";
export default async function Page() {
  const quests = await fetchQuests();
  return <QuestList quests={quests} />;
}
```

AI prompt:

```
@apps/web/lib/mock/quests.ts
@docs/api/openapi.yaml

Replace mock data with real API call. Use TanStack Query for client component,
fetch directly for Server Component.

Generate api client từ openapi.yaml. Type derived từ schema.
```

---

## 12. Snapshot AI prompt cho onboarding new developer

```
Hi! I'm new to TTNDD_Operations. Help me get started.

Read docs/design-system/00_README.md and explain in <300 words:
1. What's the design philosophy (3 pillars)?
2. Tech stack overview
3. Where to look for component specs vs screen specs?
4. What's the token strategy?
5. Show me 1 example of a button implementation with proper token usage.
```

AI phải trả lời concise dựa vào file guideline.

---

## 13. Anti-spec generation guard

Khi AI muốn "create new component" mà chưa có SPEC:

```
[Before write code]

User asks for X. SPEC for X not found in 05_components.md.

→ AI should:
1. Propose SPEC ID + spec template
2. Wait for user confirm
3. Add to 05_components.md (or create draft PR)
4. THEN implement
```

→ Tránh component drift / inconsistency.

---

## 14. Daily AI workflow ví dụ

```
Morning standup (designer):
- "Hôm nay finalize 3 screen mới"
- Designer mở Figma → generate via Stitch / Figma AI
- Apply Variables + cleanup
- Export DTCG token nếu có thay đổi

Afternoon dev:
- Dev mở Cursor
- Prompt: "@docs/design-system/08_screen-blueprints.md implement [SCREEN:quest-detail]"
- AI generate
- Dev review + test
- Commit + push
- Open PR
- CI check pass
- Reviewer review on dev + Figma comparison
- Merge

End of day:
- Update changelog
```

---

## 15. AI Agent có thể vi phạm điều gì → review checklist

Trước khi merge AI-generated code:

- [ ] Không hex hard-code
- [ ] Không từ ban-list
- [ ] Không inline style
- [ ] Component có proper a11y
- [ ] State đủ (loading/error/empty/success)
- [ ] Mobile-first responsive
- [ ] TypeScript strict pass
- [ ] ESLint pass
- [ ] Test pass
- [ ] Storybook stories đầy đủ
- [ ] i18n key thay vì hard-code text
- [ ] Console.log không leftover
- [ ] TODO comments có ticket ref

---

## 16. AI prompt tracking (optional)

Lưu prompt vào `docs/design-system/_prompts/` để team share:

```
_prompts/
├── 2026-05-19-implement-dashboard-doansinh.md
├── 2026-05-19-implement-quest-card.md
└── ...
```

Mỗi file ghi prompt + AI response highlight + outcome (success/iterate).

→ Build prompt library theo thời gian.

---

> Đọc xong file này, bạn (AI IDE / developer) đã có đầy đủ context để implement TTNDD UI đúng spec. Quay về `00_README.md` để xem index lần nữa.
