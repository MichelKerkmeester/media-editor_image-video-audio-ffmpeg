// ───────────────────────────────────────────────────────────────────
// MODULE: Overlay Position Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { expect, it } from 'vitest';

import {
  BROLL_POSITIONS,
  BROLL_POSITION_VALUES,
  GRID_POSITIONS,
  GRID_POSITION_VALUES,
  normalizePosition,
  positionXY,
} from '../../src/core/overlay-position.js';

import type {
  BrollPosition,
  GridPosition,
  PositionFlavor,
} from '../../src/core/overlay-position.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One anchor, one filter family, and the expression it has to produce. */
interface PositionCase {
  readonly position: GridPosition;
  readonly flavor: PositionFlavor;
  readonly expression: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const POSITION_CASES: readonly PositionCase[] = [
  { position: 'top_left', flavor: 'drawtext', expression: 'x=10:y=10' },
  { position: 'top_left', flavor: 'overlay', expression: 'x=10:y=10' },
  { position: 'top_left', flavor: 'broll', expression: 'x=10:y=10' },
  { position: 'top_center', flavor: 'drawtext', expression: 'x=(w-text_w)/2:y=10' },
  { position: 'top_center', flavor: 'overlay', expression: 'x=(main_w-overlay_w)/2:y=10' },
  { position: 'top_center', flavor: 'broll', expression: 'x=(W-w)/2:y=10' },
  { position: 'top_right', flavor: 'drawtext', expression: 'x=w-text_w-10:y=10' },
  { position: 'top_right', flavor: 'overlay', expression: 'x=main_w-overlay_w-10:y=10' },
  { position: 'top_right', flavor: 'broll', expression: 'x=W-w-10:y=10' },
  { position: 'center_left', flavor: 'drawtext', expression: 'x=10:y=(h-text_h)/2' },
  { position: 'center_left', flavor: 'overlay', expression: 'x=10:y=(main_h-overlay_h)/2' },
  { position: 'center_left', flavor: 'broll', expression: 'x=10:y=(H-h)/2' },
  { position: 'center', flavor: 'drawtext', expression: 'x=(w-text_w)/2:y=(h-text_h)/2' },
  {
    position: 'center',
    flavor: 'overlay',
    expression: 'x=(main_w-overlay_w)/2:y=(main_h-overlay_h)/2',
  },
  { position: 'center', flavor: 'broll', expression: 'x=(W-w)/2:y=(H-h)/2' },
  { position: 'center_right', flavor: 'drawtext', expression: 'x=w-text_w-10:y=(h-text_h)/2' },
  {
    position: 'center_right',
    flavor: 'overlay',
    expression: 'x=main_w-overlay_w-10:y=(main_h-overlay_h)/2',
  },
  { position: 'center_right', flavor: 'broll', expression: 'x=W-w-10:y=(H-h)/2' },
  { position: 'bottom_left', flavor: 'drawtext', expression: 'x=10:y=h-text_h-10' },
  { position: 'bottom_left', flavor: 'overlay', expression: 'x=10:y=main_h-overlay_h-10' },
  { position: 'bottom_left', flavor: 'broll', expression: 'x=10:y=H-h-10' },
  { position: 'bottom_center', flavor: 'drawtext', expression: 'x=(w-text_w)/2:y=h-text_h-10' },
  {
    position: 'bottom_center',
    flavor: 'overlay',
    expression: 'x=(main_w-overlay_w)/2:y=main_h-overlay_h-10',
  },
  { position: 'bottom_center', flavor: 'broll', expression: 'x=(W-w)/2:y=H-h-10' },
  { position: 'bottom_right', flavor: 'drawtext', expression: 'x=w-text_w-10:y=h-text_h-10' },
  {
    position: 'bottom_right',
    flavor: 'overlay',
    expression: 'x=main_w-overlay_w-10:y=main_h-overlay_h-10',
  },
  { position: 'bottom_right', flavor: 'broll', expression: 'x=W-w-10:y=H-h-10' },
];

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it.each(POSITION_CASES)(
  'builds $position for $flavor as $expression',
  (row): void => {
    expect(positionXY(row.position, row.flavor)).toBe(row.expression);
  },
);

it('lists nine canonical anchors and their seventeen accepted spellings', (): void => {
  expect(GRID_POSITIONS).toHaveLength(9);
  expect(GRID_POSITION_VALUES).toHaveLength(17);
  expect(BROLL_POSITIONS).toHaveLength(10);
  expect(BROLL_POSITION_VALUES).toHaveLength(18);
});

it('replaces the hyphen alias of a position with the canonical spelling', (): void => {
  expect(normalizePosition('top-left')).toBe('top_left');
  expect(normalizePosition('bottom-center')).toBe('bottom_center');
  expect(normalizePosition('center')).toBe('center');
  expect(normalizePosition('fullscreen')).toBe('fullscreen');
});

it.each(GRID_POSITION_VALUES)('maps %s to one of the nine anchors', (value): void => {
  const canonical: GridPosition = normalizePosition(value);
  expect(GRID_POSITIONS).toContain(canonical);
});

it.each(BROLL_POSITION_VALUES)('maps %s to one of the ten b-roll anchors', (value): void => {
  const canonical: BrollPosition = normalizePosition(value);
  expect(BROLL_POSITIONS).toContain(canonical);
});

it.each(GRID_POSITIONS)('keeps the canonical spelling %s unchanged', (value): void => {
  expect(normalizePosition(value)).toBe(value);
});
