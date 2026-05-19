# 03 — Design Tokens (DTCG)

> Single source of truth cho mọi giá trị visual. JSON tuân chuẩn **Design Tokens Community Group (DTCG)**. Build qua **Style Dictionary** → output CSS variables + Tailwind config + Figma Variables.

---

## 1. Cấu trúc thư mục packages/tokens

```
packages/tokens/
├── package.json
├── style-dictionary.config.ts
├── tokens/
│   ├── core/
│   │   ├── color.json
│   │   ├── space.json
│   │   ├── radius.json
│   │   ├── shadow.json
│   │   ├── motion.json
│   │   └── typography.json
│   ├── semantic/
│   │   ├── color.json
│   │   └── typography.json
│   ├── theme/
│   │   ├── rank-dong.json
│   │   ├── rank-thieu.json
│   │   └── rank-thanh.json
│   └── zone/
│       ├── tosu.json
│       ├── tranphap.json
│       ├── hocvien.json
│       ├── tamphap.json
│       └── thienco.json
└── build/
    ├── css/
    │   ├── tokens.css
    │   ├── rank-dong.css
    │   ├── rank-thieu.css
    │   └── rank-thanh.css
    ├── tailwind/
    │   └── theme.cjs
    └── figma/
        └── variables.json   # import vào Figma Variables
```

---

## 2. DTCG file mẫu — core/color.json

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "brand": {
      "celadon": {
        "$value": "#3FB6A8",
        "$type": "color",
        "$description": "Men ngọc Lý-Trần — màu brand chính"
      },
      "cinnabar": {
        "$value": "#C9482E",
        "$type": "color",
        "$description": "Son tượng Phật cổ — accent CTA"
      },
      "gold": {
        "$value": "#D4A14A",
        "$type": "color",
        "$description": "Vàng kinh sách — ornament"
      },
      "ink": { "$value": "#1B1F2A", "$type": "color", "$description": "Mực tàu — text primary" },
      "cloud": { "$value": "#F4EDDE", "$type": "color", "$description": "Mây giấy dó — background" }
    },
    "neutral": {
      "0": { "$value": "#FFFFFF", "$type": "color" },
      "50": { "$value": "#F8FAFC", "$type": "color" },
      "100": { "$value": "#F1F5F9", "$type": "color" },
      "200": { "$value": "#E2E8F0", "$type": "color" },
      "300": { "$value": "#CBD5E1", "$type": "color" },
      "400": { "$value": "#94A3B8", "$type": "color" },
      "500": { "$value": "#64748B", "$type": "color" },
      "600": { "$value": "#475569", "$type": "color" },
      "700": { "$value": "#334155", "$type": "color" },
      "800": { "$value": "#1E293B", "$type": "color" },
      "900": { "$value": "#0F172A", "$type": "color" },
      "1000": { "$value": "#0A0F1A", "$type": "color" }
    }
  }
}
```

---

## 3. Rank theme — theme/rank-thieu.json (rút gọn)

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "rank": {
    "thieu": {
      "primary": {
        "50": { "$value": "#EFF6FF", "$type": "color" },
        "100": { "$value": "#DBEAFE", "$type": "color" },
        "200": { "$value": "#BFDBFE", "$type": "color" },
        "300": { "$value": "#93C5FD", "$type": "color" },
        "400": { "$value": "#60A5FA", "$type": "color" },
        "500": { "$value": "#3B82F6", "$type": "color" },
        "600": { "$value": "#2563EB", "$type": "color" },
        "700": { "$value": "#1D4ED8", "$type": "color" },
        "800": { "$value": "#1E40AF", "$type": "color" },
        "900": { "$value": "#1E3A8A", "$type": "color" }
      },
      "accent": {
        "500": { "$value": "{color.brand.gold}", "$type": "color" }
      },
      "surface": {
        "page": { "$value": "{color.brand.cloud}", "$type": "color" },
        "card": { "$value": "{color.neutral.0}", "$type": "color" },
        "raised": { "$value": "{color.neutral.50}", "$type": "color" },
        "sunken": { "$value": "{color.neutral.100}", "$type": "color" }
      },
      "text": {
        "primary": { "$value": "{color.brand.ink}", "$type": "color" },
        "secondary": { "$value": "{color.neutral.600}", "$type": "color" },
        "tertiary": { "$value": "{color.neutral.500}", "$type": "color" },
        "inverse": { "$value": "{color.neutral.0}", "$type": "color" }
      },
      "border": {
        "subtle": { "$value": "{color.neutral.200}", "$type": "color" },
        "default": { "$value": "{color.neutral.300}", "$type": "color" },
        "emphasis": { "$value": "{color.neutral.400}", "$type": "color" }
      }
    }
  }
}
```

Tương tự cho `rank-dong.json` (green primary) và `rank-thanh.json` (red primary).

---

## 3.3. Zone ramps (5 zones)

`zone/hocvien.json`:

```json
{
  "zone": {
    "hocvien": {
      "50": { "$value": "#F5F3FF", "$type": "color" },
      "100": { "$value": "#EDE9FE", "$type": "color" },
      "200": { "$value": "#DDD6FE", "$type": "color" },
      "300": { "$value": "#C4B5FD", "$type": "color" },
      "400": { "$value": "#A78BFA", "$type": "color" },
      "500": { "$value": "#7C3AED", "$type": "color" },
      "600": { "$value": "#6D28D9", "$type": "color" },
      "700": { "$value": "#5B21B6", "$type": "color" },
      "800": { "$value": "#4C1D95", "$type": "color" },
      "900": { "$value": "#3B0764", "$type": "color" }
    }
  }
}
```

5 zones × 10 stops = 50 zone color tokens. Pattern giống nhau, chỉ đổi hue.

---

## 4. Theme switching strategy

### 4.1. CSS variable + data attribute

```css
/* tokens.css (output từ Style Dictionary) */

/* default = thieu */
:root {
  --color-rank-primary-50: #eff6ff;
  --color-rank-primary-500: #3b82f6;
  --color-rank-primary-600: #2563eb;
  /* ... */
}

/* khi user chuyển rank theme */
[data-rank-theme='dong'] {
  --color-rank-primary-50: #ecfdf5;
  --color-rank-primary-500: #22c55e;
  --color-rank-primary-600: #16a34a;
  /* ... */
}

[data-rank-theme='thanh'] {
  --color-rank-primary-50: #fef2f2;
  --color-rank-primary-500: #ef4444;
  --color-rank-primary-600: #dc2626;
  /* ... */
}
```

### 4.2. Apply ở layout root (Next.js)

```tsx
// apps/web/app/layout.tsx
import { cookies } from 'next/headers';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const rankTheme = (await cookies()).get('rank-theme')?.value ?? 'thieu';
  return (
    <html lang="vi" data-rank-theme={rankTheme}>
      <body>{children}</body>
    </html>
  );
}
```

### 4.3. Tailwind 4 config

Tailwind 4 dùng `@theme` directive trực tiếp trong CSS, không cần `tailwind.config.js`:

```css
/* apps/web/app/globals.css */
@import 'tailwindcss';

@theme {
  --color-brand-celadon: #3fb6a8;
  --color-brand-cinnabar: #c9482e;
  --color-brand-gold: #d4a14a;
  --color-brand-ink: #1b1f2a;
  --color-brand-cloud: #f4edde;

  --color-rank-primary-50: var(--color-rank-primary-50);
  --color-rank-primary-500: var(--color-rank-primary-500);
  /* ... reference từ tokens.css */

  --font-display: 'Be Vietnam Pro', 'Inter', sans-serif;
  --font-body: 'Be Vietnam Pro', 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', 'Menlo', monospace;
  --font-brand: 'Patrick Hand SC', cursive;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
}

@import './tokens.css';
```

Sau đó dùng:

```tsx
<button className="bg-rank-primary-500 hover:bg-rank-primary-600 text-white">Khởi luyện</button>
```

---

## 5. Spacing scale — core/space.json

Base 4px. Scale:

```json
{
  "space": {
    "0": { "$value": "0", "$type": "dimension" },
    "px": { "$value": "1px", "$type": "dimension" },
    "0.5": { "$value": "2px", "$type": "dimension" },
    "1": { "$value": "4px", "$type": "dimension" },
    "1.5": { "$value": "6px", "$type": "dimension" },
    "2": { "$value": "8px", "$type": "dimension" },
    "3": { "$value": "12px", "$type": "dimension" },
    "4": { "$value": "16px", "$type": "dimension" },
    "5": { "$value": "20px", "$type": "dimension" },
    "6": { "$value": "24px", "$type": "dimension" },
    "8": { "$value": "32px", "$type": "dimension" },
    "10": { "$value": "40px", "$type": "dimension" },
    "12": { "$value": "48px", "$type": "dimension" },
    "16": { "$value": "64px", "$type": "dimension" },
    "20": { "$value": "80px", "$type": "dimension" },
    "24": { "$value": "96px", "$type": "dimension" },
    "32": { "$value": "128px", "$type": "dimension" }
  }
}
```

**Rule of thumb**:

- Padding bên trong button/badge: `space.2` (8) đến `space.4` (16)
- Gap giữa component cùng card: `space.3` (12)
- Padding card: `space.4` (16) đến `space.6` (24)
- Margin giữa section: `space.8` (32) đến `space.12` (48)
- Page padding mobile: `space.4` (16); desktop: `space.8` (32)

---

## 6. Border radius — core/radius.json

```json
{
  "radius": {
    "none": { "$value": "0", "$type": "dimension" },
    "sm": { "$value": "4px", "$type": "dimension", "$description": "Subtle — input, small tag" },
    "md": { "$value": "8px", "$type": "dimension", "$description": "Default — card, button" },
    "lg": { "$value": "12px", "$type": "dimension", "$description": "Emphasis — modal" },
    "xl": { "$value": "16px", "$type": "dimension", "$description": "Hero card" },
    "2xl": { "$value": "24px", "$type": "dimension", "$description": "Big container" },
    "3xl": { "$value": "32px", "$type": "dimension", "$description": "HUD container" },
    "full": { "$value": "9999px", "$type": "dimension", "$description": "Pill, avatar" }
  }
}
```

> **Quyết định**: Đa số UI dùng `radius.md` (8px). HUD và quest card dùng `radius.xl`/`radius.2xl` để mềm hơn — tạo cảm giác "tiên" thay vì "phần mềm hành chính". **Tradeoff**: hơi nhẹ hơn vibe MMORPG cứng (vốn hay vuông).

---

## 7. Shadow & elevation — core/shadow.json

5 cấp elevation. Mọi shadow đều có warmth nhẹ (không xám lạnh).

```json
{
  "shadow": {
    "none": { "$value": "none", "$type": "shadow" },
    "xs": {
      "$value": [
        {
          "color": "#1B1F2A14",
          "offsetX": "0",
          "offsetY": "1px",
          "blur": "2px",
          "spread": "0"
        }
      ],
      "$type": "shadow",
      "$description": "Subtle — input focus"
    },
    "sm": {
      "$value": [
        {
          "color": "#1B1F2A1A",
          "offsetX": "0",
          "offsetY": "2px",
          "blur": "4px",
          "spread": "0"
        }
      ],
      "$type": "shadow",
      "$description": "Card normal"
    },
    "md": {
      "$value": [
        { "color": "#1B1F2A1A", "offsetX": "0", "offsetY": "4px", "blur": "8px", "spread": "0" },
        { "color": "#1B1F2A0D", "offsetX": "0", "offsetY": "2px", "blur": "4px", "spread": "0" }
      ],
      "$type": "shadow",
      "$description": "Card hover, dropdown"
    },
    "lg": {
      "$value": [
        { "color": "#1B1F2A26", "offsetX": "0", "offsetY": "8px", "blur": "16px", "spread": "0" },
        { "color": "#1B1F2A14", "offsetX": "0", "offsetY": "4px", "blur": "8px", "spread": "0" }
      ],
      "$type": "shadow",
      "$description": "Modal, popover"
    },
    "xl": {
      "$value": [
        { "color": "#1B1F2A33", "offsetX": "0", "offsetY": "16px", "blur": "32px", "spread": "0" },
        { "color": "#1B1F2A1A", "offsetX": "0", "offsetY": "8px", "blur": "16px", "spread": "0" }
      ],
      "$type": "shadow",
      "$description": "Drawer, important overlay"
    },
    "glow-rank": {
      "$value": [
        {
          "color": "{color.rank.thieu.primary.400}",
          "offsetX": "0",
          "offsetY": "0",
          "blur": "16px",
          "spread": "0"
        }
      ],
      "$type": "shadow",
      "$description": "Glow ring khi level up"
    }
  }
}
```

---

## 8. Motion — core/motion.json

```json
{
  "motion": {
    "ease": {
      "flow": { "$value": "cubic-bezier(0.25, 0.1, 0.25, 1)", "$type": "cubicBezier" },
      "in": { "$value": "cubic-bezier(0.4, 0, 1, 1)", "$type": "cubicBezier" },
      "out": { "$value": "cubic-bezier(0, 0, 0.2, 1)", "$type": "cubicBezier" },
      "spring": { "$value": "cubic-bezier(0.34, 1.56, 0.64, 1)", "$type": "cubicBezier" },
      "linear": { "$value": "linear", "$type": "cubicBezier" }
    },
    "dur": {
      "instant": { "$value": "80ms", "$type": "duration" },
      "fast": { "$value": "160ms", "$type": "duration" },
      "base": { "$value": "240ms", "$type": "duration" },
      "slow": { "$value": "400ms", "$type": "duration" },
      "epic": { "$value": "1200ms", "$type": "duration" }
    }
  }
}
```

---

## 9. Typography token — core/typography.json

```json
{
  "font": {
    "family": {
      "brand": { "$value": "Patrick Hand SC, cursive", "$type": "fontFamily" },
      "display": { "$value": "Be Vietnam Pro, Inter, sans-serif", "$type": "fontFamily" },
      "body": { "$value": "Be Vietnam Pro, Inter, sans-serif", "$type": "fontFamily" },
      "mono": { "$value": "JetBrains Mono, Menlo, monospace", "$type": "fontFamily" }
    },
    "weight": {
      "regular": { "$value": 400, "$type": "fontWeight" },
      "medium": { "$value": 500, "$type": "fontWeight" },
      "semibold": { "$value": 600, "$type": "fontWeight" },
      "bold": { "$value": 700, "$type": "fontWeight" }
    },
    "size": {
      "12": { "$value": "12px", "$type": "dimension" },
      "14": { "$value": "14px", "$type": "dimension" },
      "16": { "$value": "16px", "$type": "dimension" },
      "18": { "$value": "18px", "$type": "dimension" },
      "22": { "$value": "22px", "$type": "dimension" },
      "26": { "$value": "26px", "$type": "dimension" },
      "32": { "$value": "32px", "$type": "dimension" },
      "40": { "$value": "40px", "$type": "dimension" },
      "48": { "$value": "48px", "$type": "dimension" },
      "60": { "$value": "60px", "$type": "dimension" }
    }
  },
  "text": {
    "display": {
      "xl": {
        "$value": {
          "fontFamily": "{font.family.display}",
          "fontWeight": "{font.weight.bold}",
          "fontSize": "{font.size.60}",
          "lineHeight": "72px",
          "letterSpacing": "-0.02em"
        },
        "$type": "typography"
      }
    },
    "h1": {
      "$value": {
        "fontFamily": "{font.family.display}",
        "fontWeight": "{font.weight.bold}",
        "fontSize": "{font.size.32}",
        "lineHeight": "44px",
        "letterSpacing": "-0.01em"
      },
      "$type": "typography"
    },
    "body": {
      "md": {
        "$value": {
          "fontFamily": "{font.family.body}",
          "fontWeight": "{font.weight.regular}",
          "fontSize": "{font.size.16}",
          "lineHeight": "24px",
          "letterSpacing": "0"
        },
        "$type": "typography"
      }
    }
  }
}
```

(Đầy đủ scale — xem `02_visual-language.md` §2.2)

---

## 10. Dark mode (P2, prepared)

`theme/dark.json` (preview, không apply v1):

```json
{
  "color": {
    "rank": {
      "thieu": {
        "primary": {
          "500": { "$value": "#60A5FA", "$type": "color" }
        },
        "surface": {
          "page": { "$value": "#0F172A", "$type": "color" },
          "card": { "$value": "#1E293B", "$type": "color" }
        },
        "text": {
          "primary": { "$value": "#F8FAFC", "$type": "color" },
          "secondary": { "$value": "#CBD5E1", "$type": "color" }
        }
      }
    }
  }
}
```

Apply qua `<html data-color-mode="dark">`.

---

## 11. Style Dictionary config

```typescript
// packages/tokens/style-dictionary.config.ts
import StyleDictionary from 'style-dictionary';

export default {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/css/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: { outputReferences: true },
        },
      ],
    },
    tailwind: {
      transformGroup: 'js',
      buildPath: 'build/tailwind/',
      files: [
        {
          destination: 'theme.cjs',
          format: 'javascript/module-flat',
        },
      ],
    },
    figma: {
      transformGroup: 'js',
      buildPath: 'build/figma/',
      files: [
        {
          destination: 'variables.json',
          format: 'json/nested',
        },
      ],
    },
  },
};
```

Build command: `pnpm --filter tokens build`.

---

## 12. Naming convention recap

```
{category}.{property}.{variant}.{state}

Examples:
color.brand.celadon                  → #3FB6A8
color.rank.thieu.primary.500         → #3B82F6
color.zone.hocvien.500               → #7C3AED
color.spices.intellectual            → #4F46E5
color.semantic.danger                → #DC2626
space.4                              → 16px
radius.md                            → 8px
shadow.lg                            → multi-layer shadow
motion.dur.base                      → 240ms
motion.ease.flow                     → cubic-bezier(...)
text.body.md                         → composite typography token
```

---

## 13. AI IDE consumption guide

Khi AI IDE cần style 1 component, follow flow:

```
1. Đọc spec ở 05_components.md (vd: [SPEC:btn-primary])
2. Spec ghi token path: color.rank.{rank}.primary.500
3. Lookup token path trong file này → ra CSS variable: var(--color-rank-primary-500)
4. Generate code:
   <button className="bg-rank-primary-500 hover:bg-rank-primary-600 ...">
5. KHÔNG được hard-code "#3B82F6" trong code component
```

**Validation**: ESLint rule `no-hardcoded-color` sẽ enforce sau S2.

---

## 14. Migration / Override

Nếu cần thêm token mới:

1. Thêm vào JSON file phù hợp
2. PR vào branch `design-system/tokens-<topic>`
3. Re-build Style Dictionary
4. Cập nhật `02_visual-language.md` và `05_components.md` tham chiếu

**Never**:

- Override token bằng `!important` trong component CSS
- Hard-code màu/spacing ở component code

---

> Sang `04_ia-and-layouts.md` để xem cách tổ chức trang & navigation.
