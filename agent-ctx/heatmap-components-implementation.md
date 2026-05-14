# Task: Heatmap Components Implementation

## Summary
Created heatmap-related components for the Zaki Arabic RTL productivity app with Koala Neovim dark-only color palette.

## Files Created

### 1. `src/components/heatmap/YearlyHeatmap.tsx` (71 lines)
- GitHub-style yearly activity heatmap, collapsed by default
- Click header to expand with smooth max-height transition (300ms)
- Shows "خريطة النشاط" title + active day count when collapsed
- Uses `useQuery` with key `['heatmap', year]` via `getHeatmap` API
- Activity icon with `scale-x-[-1]` for RTL

### 2. `src/components/heatmap/HeatmapGrid.tsx` (143 lines)
- The actual heatmap grid rendering component
- Cells: 10×10px, 2px gap, rounded-[2px]
- Color ramp: `bg-border-subtle/50`, `bg-koala-green/10`, `/30`, `/60`, `/80`, full
- Today: outline 1.5px solid koala-secondary
- Grid direction: `dir="ltr"` 
- Month labels: 8px, text-koala-muted
- Day labels: 9px, text-koala-muted  
- Legend: "أقل" [6 cells] "أكتر"

### 3. `src/components/heatmap/DayDetailPanel.tsx` (120 lines)
- Slide-up panel from bottom using `animate-slide-up`
- Overlay: `bg-base/80`
- Panel: `bg-surface`, 60vh max, border-t border-border-subtle
- Close: overlay click or × button
- Stats row: 3 items (total tasks, completed, productivity)
- AI Summary section with `bg-koala-purple/5` styling
- "تحليل بالذكاء" button if no summary

### 4. `src/components/heatmap/DayTaskList.tsx` (73 lines)
- Task list rendering for day detail panel
- Priority colors: coral, koala-orange, koala-yellow, koala-green
- Category badges with matching accent colors
- Done tasks: opacity-60, line-through

## Files Modified

### `src/app/api/tasks/heatmap/route.ts`
- Added `computeLevel()` function supporting levels 0-5 (was 0-4)
- Level 0: no tasks, Level 5: 6+ completed tasks

### `src/app/layout.tsx`
- Changed `defaultTheme` from "light" to "dark"
- Added `className="dark"` to html element

### `src/app/page.tsx`
- Replaced skeleton placeholder with `YearlyHeatmap` component
- Added `DayDetailPanel` with state management for selected date
- Connected day click → panel open flow

## Design Compliance
- ✅ Dark only, no light mode toggle
- ✅ 1px solid border-border-subtle borders
- ✅ 6px border radius default, 10px for cards, 4px for badges
- ✅ 4px base spacing multiples
- ✅ 150ms ease transitions (color/opacity/transform only, except 300ms for expand)
- ✅ No box shadows, no gradients, no blur
- ✅ Font sizes: 11/12/13/15/18px, weights: 400/500/600
- ✅ RTL: ps-/pe- used where needed, icons scale-x-[-1]
- ✅ All files under 150 lines
