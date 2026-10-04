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
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function boundedText(separatorMessage: string): z.ZodString {
  return z
    .string()
    .min(1)
    .max(OUTPUT_NAME_MAX_LENGTH)
    .regex(NO_SEPARATOR_PATTERN, separatorMessage);
}

// ───────────────────────────────────────────────────────────────────
// 4. EXPORTS
// ───────────────────────────────────────────────────────────────────

/**
 * A readable name of 1 to 64 characters with no slash or backslash.
 *
 * A separator fails the schema, so a path never reaches the slug.
 *
 * @returns A new schema the caller describes
 */
export function readableNameSchema(): z.ZodString {
  return boundedText('Use a name with no / or \\ in it.');
}

/**
 * The `outputName` field every writing tool shares.
 *
 * A separator fails the schema, so a path never reaches the folder slug.
 */
export const outputNameField = boundedText('Use a description with no / or \\ in it.')
  .describe(
    'Description of 1 to 64 characters. It names the numbered folder when '
    + 'the call writes one. It is not a path, so it holds no / or \\.',
  );

/**
 * The optional readable file name every one-folder writing tool accepts.
 *
 * The tool keeps the extension of what it wrote, so a trailing extension in
 * the name is dropped.
 */
export const fileNameField = readableNameSchema()
  .optional()
  .describe(
    'Readable name for the written file, such as "team offsite hero". It is '
    + 'slugged to lowercase words joined by hyphens, and the tool adds the '
    + 'extension. Omitted, the file is named after the input plus the operation.',
  );

/**
 * The optional folder choice every one-folder writing tool accepts.
 */
export const subfolderField = z
  .boolean()
  .optional()
  .describe(
    'true writes into a new numbered folder named from outputName. false '
    + 'writes into the export root. Omitted, one file goes to the export root '
    + 'and several files get a folder.',
  );
