// ───────────────────────────────────────────────────────────────────
// MODULE: Media Fields Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  aspectRatioField,
  bitrateField,
  channelsField,
  frameRateField,
  paddingColorField,
  parseAspectRatio,
  parseBitrate,
  parseResolution,
  resolutionField,
  resolutionLabel,
  sampleRateField,
  scaleFilter,
  timeField,
} from '../../src/server/media-fields.js';

import type { ZodType } from 'zod';
import type { ParsedResolution } from '../../src/server/media-fields.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface BitrateCase {
  text: string;
  bits: number;
}

interface NumberCase {
  value: number;
  ok: boolean;
}

interface ResolutionCase {
  text: string;
  parsed: ParsedResolution | undefined;
}

interface AspectCase {
  text: string;
  width: number | undefined;
  height: number | undefined;
}

interface FieldCase {
  name: string;
  field: ZodType;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const VALID_BITRATES: readonly BitrateCase[] = [
  { text: '1k', bits: 1000 },
  { text: '192k', bits: 192000 },
  { text: '320k', bits: 320000 },
  { text: '2M', bits: 2000000 },
  { text: '2.5M', bits: 2500000 },
  { text: '100M', bits: 100000000 },
];

const INVALID_BITRATES: readonly string[] = [
  '999',
  '0k',
  '192',
  '192K',
  '1m',
  '100.1M',
  '101M',
  'k',
  '-5k',
  '1e3k',
  '',
];

const SAMPLE_RATES: readonly NumberCase[] = [
  { value: 8000, ok: true },
  { value: 384000, ok: true },
  { value: 7999, ok: false },
  { value: 384001, ok: false },
  { value: 8000.5, ok: false },
];

const CHANNELS: readonly NumberCase[] = [
  { value: 1, ok: true },
  { value: 8, ok: true },
  { value: 0, ok: false },
  { value: 9, ok: false },
  { value: 1.5, ok: false },
];

const FRAME_RATES: readonly NumberCase[] = [
  { value: 0.001, ok: true },
  { value: 240, ok: true },
  { value: 29.97, ok: true },
  { value: 0, ok: false },
  { value: 240.1, ok: false },
  { value: -1, ok: false },
];

const RESOLUTIONS: readonly ResolutionCase[] = [
  { text: '1280x720', parsed: { width: 1280, height: 720 } },
  { text: '720', parsed: { height: 720 } },
  { text: '1x1', parsed: { width: 1, height: 1 } },
  { text: '32768x32768', parsed: { width: 32768, height: 32768 } },
  { text: '32768', parsed: { height: 32768 } },
  { text: '0', parsed: undefined },
  { text: '0x720', parsed: undefined },
  { text: '1280x0', parsed: undefined },
  { text: '32769', parsed: undefined },
  { text: '1280x', parsed: undefined },
  { text: 'x720', parsed: undefined },
  { text: '12345678', parsed: undefined },
  { text: '1280X720', parsed: undefined },
  { text: 'preserve', parsed: undefined },
];

const ASPECTS: readonly AspectCase[] = [
  { text: '16:9', width: 16, height: 9 },
  { text: '4:3', width: 4, height: 3 },
  { text: '999:1', width: 999, height: 1 },
  { text: '0:9', width: undefined, height: undefined },
  { text: '16:0', width: undefined, height: undefined },
  { text: '1000:1', width: undefined, height: undefined },
  { text: '16/9', width: undefined, height: undefined },
  { text: '16:9:1', width: undefined, height: undefined },
  { text: '', width: undefined, height: undefined },
];

const SIZED: ParsedResolution = { width: 1280, height: 720 };
const HEIGHT_ONLY: ParsedResolution = { height: 720 };

const JSON_FIELDS: readonly FieldCase[] = [
  { name: 'bitrate', field: bitrateField('Bitrate from 1k to 100M.') },
  { name: 'sampleRate', field: sampleRateField('Sample rate in hertz.') },
  { name: 'channels', field: channelsField('Channel count.') },
  { name: 'frameRate', field: frameRateField('Frames per second.') },
  { name: 'resolution', field: resolutionField('Picture size in pixels.') },
  {
    name: 'resolutionPreserve',
    field: resolutionField('Picture size in pixels.', { allowPreserve: true }),
  },
  { name: 'aspectRatio', field: aspectRatioField('Target ratio as W:H.') },
  { name: 'paddingColor', field: paddingColorField('Pad colour as #RRGGBB.') },
  { name: 'time', field: timeField('Seconds, or a clock time.') },
];

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('parseBitrate', (): void => {
  it.each(VALID_BITRATES)('accepts $text', ({ text, bits }): void => {
    expect(parseBitrate(text)).toBe(bits);
  });

  it.each(INVALID_BITRATES)('rejects $text', (text): void => {
    expect(parseBitrate(text)).toBeUndefined();
  });
});

describe('numeric fields', (): void => {
  const bitrate = bitrateField('Bitrate from 1k to 100M.');
  const sampleRate = sampleRateField('Sample rate in hertz.');
  const channels = channelsField('Channel count.');
  const frameRate = frameRateField('Frames per second.');

  it.each(['1k', '100M'])('bitrateField accepts %s', (text): void => {
    expect(bitrate.safeParse(text).success).toBe(true);
  });

  it.each(['0k', '101M', '100.1M', '999'])(
    'bitrateField rejects %s',
    (text): void => {
      expect(bitrate.safeParse(text).success).toBe(false);
    },
  );

  it.each(SAMPLE_RATES)('sampleRateField $value', ({ value, ok }): void => {
    expect(sampleRate.safeParse(value).success).toBe(ok);
  });

  it.each(CHANNELS)('channelsField $value', ({ value, ok }): void => {
    expect(channels.safeParse(value).success).toBe(ok);
  });

  it.each(FRAME_RATES)('frameRateField $value', ({ value, ok }): void => {
    expect(frameRate.safeParse(value).success).toBe(ok);
  });
});

describe('resolution', (): void => {
  it.each(RESOLUTIONS)('parseResolution($text)', ({ text, parsed }): void => {
    expect(parseResolution(text)).toEqual(parsed);
  });

  it('builds the scale filter and the file token', (): void => {
    expect(scaleFilter(SIZED)).toBe('scale=1280:720');
    expect(scaleFilter(HEIGHT_ONLY)).toBe('scale=-2:720');
    expect(resolutionLabel(SIZED)).toBe('1280x720');
    expect(resolutionLabel(HEIGHT_ONLY)).toBe('h720');
  });

  it('rejects preserve unless the field allows it', (): void => {
    const required = resolutionField('Picture size in pixels.');
    const keeping = resolutionField('Picture size in pixels.', {
      allowPreserve: true,
    });

    expect(required.safeParse('1280x720').success).toBe(true);
    expect(required.safeParse('720').success).toBe(true);
    expect(required.safeParse('preserve').success).toBe(false);
    expect(required.safeParse('0').success).toBe(false);
    expect(keeping.safeParse('preserve').success).toBe(true);
    expect(keeping.safeParse('1280x720').success).toBe(true);
    expect(keeping.safeParse('0').success).toBe(false);
  });
});

describe('aspect ratio', (): void => {
  const field = aspectRatioField('Target ratio as W:H.');

  it.each(ASPECTS)('parseAspectRatio($text)', (row): void => {
    if (row.width === undefined || row.height === undefined) {
      expect(parseAspectRatio(row.text)).toBeUndefined();
      expect(field.safeParse(row.text).success).toBe(false);
      return;
    }
    expect(parseAspectRatio(row.text)).toEqual({
      width: row.width,
      height: row.height,
    });
    expect(field.safeParse(row.text).success).toBe(true);
  });
});

describe('paddingColorField', (): void => {
  const field = paddingColorField('Pad colour as #RRGGBB.');

  it('defaults to black and accepts a hex colour', (): void => {
    expect(field.parse(undefined)).toBe('#000000');
    expect(field.safeParse('#FF00aa').success).toBe(true);
    expect(field.safeParse('red').success).toBe(false);
    expect(field.safeParse('#fff').success).toBe(false);
    expect(field.safeParse('#GGGGGG').success).toBe(false);
  });
});

describe('timeField', (): void => {
  const field = timeField('Seconds, or a clock time.');

  it.each([5, '00:00:05', '5.5'])('accepts %s', (value): void => {
    expect(field.safeParse(value).success).toBe(true);
  });

  it.each([-1, '30s'])('rejects %s', (value): void => {
    expect(field.safeParse(value).success).toBe(false);
  });
});

describe('json schema', (): void => {
  it.each(JSON_FIELDS)('$name emits a schema', ({ field }): void => {
    expect(() => {
      z.toJSONSchema(z.object({ field }));
    }).not.toThrow();
  });
});
