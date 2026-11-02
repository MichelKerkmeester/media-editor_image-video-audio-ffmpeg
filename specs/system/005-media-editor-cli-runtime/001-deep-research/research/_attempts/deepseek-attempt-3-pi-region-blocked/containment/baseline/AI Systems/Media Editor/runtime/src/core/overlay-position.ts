// ───────────────────────────────────────────────────────────────────
// MODULE: Overlay Position
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One of the nine anchors the text, image and b-roll overlays share. */
export type GridPosition =
  | 'top_left'
  | 'top_center'
  | 'top_right'
  | 'center_left'
  | 'center'
  | 'center_right'
  | 'bottom_left'
  | 'bottom_center'
  | 'bottom_right';

/** A grid anchor as a schema accepts it: the canonical spelling or its hyphen alias. */
export type GridPositionValue =
  | GridPosition
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/** The grid anchors plus the full-frame anchor only the b-roll tool offers. */
export type BrollPosition = GridPosition | 'fullscreen';

/** A b-roll anchor as a schema accepts it. */
export type BrollPositionValue = GridPositionValue | 'fullscreen';

/** The filter family an x and y expression is written for. */
export type PositionFlavor = 'drawtext' | 'overlay' | 'broll';

/** The four size names a filter family uses inside its expressions. */
interface FlavorDimensions {
  readonly frameWidth: string;
  readonly frameHeight: string;
  readonly itemWidth: string;
  readonly itemHeight: string;
}

/** Where one anchor sits on each axis. */
interface GridAnchor {
  readonly horizontal: 'left' | 'center' | 'right';
  readonly vertical: 'top' | 'center' | 'bottom';
}

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Pixel gap between an anchored overlay and the frame edge. */
const INSET_PX = 10;

/** The nine canonical anchors, in the order the compositing schemas list them. */
export const GRID_POSITIONS = [
  'top_left',
  'top_center',
  'top_right',
  'center_left',
  'center',
  'center_right',
  'bottom_left',
  'bottom_center',
  'bottom_right',
] as const satisfies readonly GridPosition[];

/** Every spelling a grid position field accepts, each canonical value then its alias. */
export const GRID_POSITION_VALUES = [
  'top_left',
  'top-left',
  'top_center',
  'top-center',
  'top_right',
  'top-right',
  'center_left',
  'center-left',
  'center',
  'center_right',
  'center-right',
  'bottom_left',
  'bottom-left',
  'bottom_center',
  'bottom-center',
  'bottom_right',
  'bottom-right',
] as const satisfies readonly GridPositionValue[];

/** The canonical anchors plus the full-frame b-roll anchor. */
export const BROLL_POSITIONS = [
  ...GRID_POSITIONS,
  'fullscreen',
] as const satisfies readonly BrollPosition[];

/** Every spelling a b-roll position field accepts. */
export const BROLL_POSITION_VALUES = [
  ...GRID_POSITION_VALUES,
  'fullscreen',
] as const satisfies readonly BrollPositionValue[];

/** The canonical value behind one accepted spelling. */
const CANONICAL_POSITION = {
  top_left: 'top_left',
  'top-left': 'top_left',
  top_center: 'top_center',
  'top-center': 'top_center',
  top_right: 'top_right',
  'top-right': 'top_right',
  center_left: 'center_left',
  'center-left': 'center_left',
  center: 'center',
  center_right: 'center_right',
  'center-right': 'center_right',
  bottom_left: 'bottom_left',
  'bottom-left': 'bottom_left',
  bottom_center: 'bottom_center',
  'bottom-center': 'bottom_center',
  bottom_right: 'bottom_right',
  'bottom-right': 'bottom_right',
  fullscreen: 'fullscreen',
} as const satisfies Record<BrollPositionValue, BrollPosition>;

// The filters spell the same four sizes differently, so one anchor needs one
// expression per family rather than one shared string.
const FLAVOR_DIMENSIONS: Record<PositionFlavor, FlavorDimensions> = {
  drawtext: { frameWidth: 'w', frameHeight: 'h', itemWidth: 'text_w', itemHeight: 'text_h' },
  overlay: {
    frameWidth: 'main_w',
    frameHeight: 'main_h',
    itemWidth: 'overlay_w',
    itemHeight: 'overlay_h',
  },
  broll: { frameWidth: 'W', frameHeight: 'H', itemWidth: 'w', itemHeight: 'h' },
};

const GRID_ANCHORS: Record<GridPosition, GridAnchor> = {
  top_left: { horizontal: 'left', vertical: 'top' },
  top_center: { horizontal: 'center', vertical: 'top' },
  top_right: { horizontal: 'right', vertical: 'top' },
  center_left: { horizontal: 'left', vertical: 'center' },
  center: { horizontal: 'center', vertical: 'center' },
  center_right: { horizontal: 'right', vertical: 'center' },
  bottom_left: { horizontal: 'left', vertical: 'bottom' },
  bottom_center: { horizontal: 'center', vertical: 'bottom' },
  bottom_right: { horizontal: 'right', vertical: 'bottom' },
};

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function horizontalExpression(
  dimensions: FlavorDimensions,
  anchor: GridAnchor['horizontal'],
): string {
  if (anchor === 'left') {
    return `${INSET_PX}`;
  }
  if (anchor === 'center') {
    return `(${dimensions.frameWidth}-${dimensions.itemWidth})/2`;
  }
  return `${dimensions.frameWidth}-${dimensions.itemWidth}-${INSET_PX}`;
}

function verticalExpression(
  dimensions: FlavorDimensions,
  anchor: GridAnchor['vertical'],
): string {
  if (anchor === 'top') {
    return `${INSET_PX}`;
  }
  if (anchor === 'center') {
    return `(${dimensions.frameHeight}-${dimensions.itemHeight})/2`;
  }
  return `${dimensions.frameHeight}-${dimensions.itemHeight}-${INSET_PX}`;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Replace the hyphen aliases of a position with their canonical spelling.
 *
 * @param value - A position the schema accepted
 * @returns The canonical anchor
 */
export function normalizePosition(value: GridPositionValue): GridPosition;
export function normalizePosition(value: BrollPositionValue): BrollPosition;
export function normalizePosition(value: BrollPositionValue): BrollPosition {
  return CANONICAL_POSITION[value];
}

/**
 * The x and y options of one grid anchor, for the given filter family.
 *
 * The inset is 10 px. The b-roll and overlay families use the short and long
 * names of the `overlay` filter, and drawtext uses its text box names.
 *
 * @param position - Canonical anchor
 * @param flavor - Filter family that will read the expression
 * @returns `x=<expression>:y=<expression>`
 */
export function positionXY(position: GridPosition, flavor: PositionFlavor): string {
  const dimensions = FLAVOR_DIMENSIONS[flavor];
  const anchor = GRID_ANCHORS[position];
  const x = horizontalExpression(dimensions, anchor.horizontal);
  const y = verticalExpression(dimensions, anchor.vertical);
  return `x=${x}:y=${y}`;
}
