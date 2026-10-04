// ───────────────────────────────────────────────────────────────────
// MODULE: Field Schemas
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { z } from 'zod';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const OUTPUT_NAME_MAX_LENGTH = 64;
const NO_SEPARATOR_PATTERN = /^[^/\\]+$/u;

// ───────────────────────────────────────────────────────────────────
// 3. EXPORTS
// ───────────────────────────────────────────────────────────────────

/**
 * The `outputName` field every writing tool shares.
 *
 * A separator fails the schema, so a path never reaches the folder slug.
 */
export const outputNameField = z
  .string()
  .min(1)
  .max(OUTPUT_NAME_MAX_LENGTH)
  .regex(NO_SEPARATOR_PATTERN, 'Use a description with no / or \\ in it.')
  .describe(
    'Description of 1 to 64 characters used to name the new folder. '
    + 'It is not a path, so it holds no / or \\.',
  );
