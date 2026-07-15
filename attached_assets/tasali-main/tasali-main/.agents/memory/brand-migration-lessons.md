---
name: Brand Migration Lessons
description: Lessons learned when doing bulk brand text replacement across JSX/TSX files using sed
---

## The Rule
When replacing brand text strings in JSX files using sed, ALWAYS verify the replacement preserves JSX syntax.

**Why:** sed's `s/>OLD_TEXT</NEW_TEXT</g` pattern correctly preserves the `>` before and `<` after, but variations like `s/>OLD TEXT </NEW TEXT /g` (with trailing space) can break adjacent JSX attribute closers or insert garbage into tag bodies. The specific failure pattern was replacing `>BLACK ROSE <` with `</h1>TASALI ` which introduced invalid HTML into a JSX opening tag.

**How to apply:**
1. Use `>OLD<` → `>NEW<` (never swap the `>` sign in the replacement)
2. After any bulk sed replacement, run: `grep -rn 'className="[^"]*"{' client/src/ --include="*.tsx"` to catch broken attribute + expression combos
3. Files using `brand.X` expressions MUST import brand: `grep -rl 'brand\.' --include="*.tsx" | xargs grep -rL 'import.*brand'`
4. When brand is imported under an alias (e.g., `import { brand as sysBrand }`), sed replacements that add `brand.X` will break — check the alias first

## Context
This was discovered during the Black Rose → Tasali Qurumsh brand migration where 70+ files needed bulk text replacement.
