// ───────────────────────────────────────────────────────────────────
// MODULE: Bundle Notices Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { checkNotices, listNodeModules } from '../../scripts/bundle/notices.js';
import { binaryDestinations } from '../../scripts/bundle/targets.js';
import { PINNED_BUILDS } from '../../src/core/pinned-builds.js';
import { renderSourceNotice } from '../../src/core/source-notice.js';

import type { PinnedBuild } from '../../src/core/pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const VERSION = '9.9.9-test';
const HOLDER = 'Test Holder';
const FFMPEG_BYTES = `fake ffmpeg ${VERSION} build`;
const FFPROBE_BYTES = `fake ffprobe ${VERSION} build`;
const README_LICENSING = '## Licensing\n\nlibvips is used under the LGPL.\n';
const NOTICES_TEXT = [
  'THIRD_PARTY_NOTICES',
  '',
  `Copyright (c) 2026 ${HOLDER}`,
  '',
  'Copyright (c) 2024 Hongyi Wang',
  'Copyright (c) 2025 misbahsy',
  '',
  'one component                     licenses/one-LICENSE.txt',
  'prebuilt libvips behind sharp     licenses/libvips-LICENSE.txt',
  '',
].join('\n');

const createdFolders: string[] = [];

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function tempFolder(prefix: string): string {
  const folder = mkdtempSync(path.join(os.tmpdir(), prefix));
  createdFolders.push(folder);
  return folder;
}

function write(stage: string, relative: string, content: string): void {
  const target = path.join(stage, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function fakeBuild(ffmpegText: string = FFMPEG_BYTES): PinnedBuild {
  const base = 'https://example.test/';
  return {
    platform: 'linux-x64',
    version: VERSION,
    licence: 'GPL-3.0-or-later',
    builder: 'Test Builder',
    buildPage: `${base}builds/`,
    release: 'test release',
    sourceUrls: [`${base}source.tar.xz`],
    artifacts: {
      ffmpeg: {
        component: 'ffmpeg',
        url: `${base}ffmpeg.gz`,
        redirectHost: null,
        bytes: 10,
        sha256: sha256('ffmpeg archive'),
        archive: 'gzip',
        binarySha256: sha256(ffmpegText),
      },
      ffprobe: {
        component: 'ffprobe',
        url: `${base}ffprobe.gz`,
        redirectHost: null,
        bytes: 10,
        sha256: sha256('ffprobe archive'),
        archive: 'gzip',
        binarySha256: sha256(FFPROBE_BYTES),
      },
    },
  };
}

/** Write a stage that passes every notice rule, then return it with its build. */
function completeStage(ffmpegText: string = FFMPEG_BYTES): { stage: string; build: PinnedBuild } {
  const stage = tempFolder('media-editor-notices-');
  const build = fakeBuild(ffmpegText);
  const destinations = binaryDestinations('linux-x64');
  write(stage, 'LICENSE', `MIT License\n\nCopyright (c) 2026 ${HOLDER}\n`);
  write(stage, 'THIRD_PARTY_NOTICES', NOTICES_TEXT);
  write(stage, 'licenses/one-LICENSE.txt', 'one licence text\n');
  write(stage, 'licenses/libvips-LICENSE.txt', `Header\n\n${README_LICENSING}`);
  write(stage, 'node_modules/@img/sharp-linux-x64/README.md', `# pkg\n\n${README_LICENSING}`);
  write(stage, 'licenses/ffmpeg-SOURCE.md', renderSourceNotice(build));
  write(stage, 'licenses/node-modules.txt', 'Packages in this bundle.\n\na-pkg@1.0.0 MIT\n');
  write(stage, destinations.ffmpeg, ffmpegText);
  write(stage, destinations.ffprobe, FFPROBE_BYTES);
  return { stage, build };
}

interface BreakCase {
  readonly name: string;
  readonly breakStage: (stage: string, build: PinnedBuild) => void;
}

const BREAK_CASES: readonly BreakCase[] = [
  {
    name: 'a licence file the notices name is missing',
    breakStage: (stage: string): void => unlinkSync(path.join(stage, 'licenses/one-LICENSE.txt')),
  },
  {
    name: 'a licence file the notices name is empty',
    breakStage: (stage: string): void => write(stage, 'licenses/one-LICENSE.txt', ''),
  },
  {
    name: 'an upstream copyright line is missing',
    breakStage: (stage: string): void => {
      write(stage, 'THIRD_PARTY_NOTICES', NOTICES_TEXT.replace('Copyright (c) 2025 misbahsy', ''));
    },
  },
  {
    name: 'the licence file does not name the rights holder',
    breakStage: (stage: string): void => write(stage, 'LICENSE', 'MIT License\n\nNo holder\n'),
  },
  {
    name: 'a per-build licence folder is left in the stage',
    breakStage: (stage: string): void => {
      mkdirSync(path.join(stage, 'licenses/ffmpeg-builds'), { recursive: true });
    },
  },
  {
    name: 'the source notice lacks the version line',
    breakStage: (stage: string, build: PinnedBuild): void => {
      const notice = renderSourceNotice(build).replace(`ffmpeg version ${VERSION}`, 'ffmpeg');
      write(stage, 'licenses/ffmpeg-SOURCE.md', notice);
    },
  },
  {
    name: 'a binary no longer matches its pinned digest',
    breakStage: (stage: string): void => {
      appendFileSync(path.join(stage, binaryDestinations('linux-x64').ffmpeg), 'x');
    },
  },
  {
    name: 'ffprobe-static holds a second arch folder',
    breakStage: (stage: string): void => {
      mkdirSync(path.join(stage, 'node_modules/ffprobe-static/bin/linux/arm64'), {
        recursive: true,
      });
    },
  },
  {
    name: 'the libvips licence lacks a package licensing section',
    breakStage: (stage: string): void => {
      write(stage, 'licenses/libvips-LICENSE.txt', 'Some other licence text\n');
    },
  },
  {
    name: 'no sharp package carries a licensing section',
    breakStage: (stage: string): void => {
      unlinkSync(path.join(stage, 'node_modules/@img/sharp-linux-x64/README.md'));
    },
  },
  {
    name: 'the package list has a package without a licence',
    breakStage: (stage: string): void => {
      const list = 'Packages.\n\na-pkg@1.0.0 MIT\nb-pkg@2.0.0 UNKNOWN\n';
      write(stage, 'licenses/node-modules.txt', list);
    },
  },
];

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

afterAll((): void => {
  for (const folder of createdFolders) {
    rmSync(folder, { recursive: true, force: true });
  }
});

describe('renderSourceNotice', (): void => {
  it('names the version, every download, every digest and every source', (): void => {
    const build = PINNED_BUILDS['darwin-arm64'];
    const notice = renderSourceNotice(build);
    expect(notice).toContain(`ffmpeg version ${build.version}`);
    for (const artifact of Object.values(build.artifacts)) {
      expect(notice).toContain(artifact.url);
      expect(notice).toContain(artifact.sha256);
      expect(notice).toContain(artifact.binarySha256);
    }
    for (const url of build.sourceUrls) {
      expect(notice).toContain(url);
    }
    expect(notice).toContain('licenses/ffmpeg-LICENSE.txt');
    expect(notice.endsWith('\n')).toBe(true);
  });
});

describe('listNodeModules', (): void => {
  it('lists every package sorted with its licence and reports the unlicensed', (): void => {
    const stage = tempFolder('media-editor-packages-');
    const pkg = (folder: string, fields: Record<string, unknown>): void => {
      write(stage, `node_modules/${folder}/package.json`, JSON.stringify(fields));
    };
    pkg('b-pkg', { name: 'b-pkg', version: '1.0.0', license: 'MIT' });
    pkg('@scope/a-pkg', { name: '@scope/a-pkg', version: '1.0.0', license: 'ISC' });
    pkg('c-pkg', {
      name: 'c-pkg',
      version: '1.0.0',
      licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }],
    });
    pkg('d-pkg', { name: 'd-pkg', version: '1.0.0' });
    const list = listNodeModules(stage);
    const lines = list.text.split('\n').slice(2).filter((line) => line.length > 0);
    expect(lines).toEqual([
      '@scope/a-pkg@1.0.0 ISC',
      'b-pkg@1.0.0 MIT',
      'c-pkg@1.0.0 MIT OR Apache-2.0',
      'd-pkg@1.0.0 UNKNOWN',
    ]);
    expect(list.unlicensed).toEqual(['d-pkg@1.0.0']);
  });
});

describe('checkNotices', (): void => {
  it('finds nothing wrong in a complete stage', async (): Promise<void> => {
    const { stage, build } = completeStage();
    await expect(checkNotices(stage, build, HOLDER)).resolves.toEqual([]);
  });

  it.each(BREAK_CASES)(
    'reports exactly one problem when $name',
    async (breakCase: BreakCase): Promise<void> => {
      const { stage, build } = completeStage();
      breakCase.breakStage(stage, build);
      const problems = await checkNotices(stage, build, HOLDER);
      expect(problems).toHaveLength(1);
    },
  );

  it('finds a licensing heading in a README with CRLF line endings', async (): Promise<void> => {
    const { stage, build } = completeStage();
    const crlfSection = README_LICENSING.replace(/\n/g, '\r\n');
    write(stage, 'node_modules/@img/sharp-linux-x64/README.md', `# pkg\r\n\r\n${crlfSection}`);
    write(stage, 'licenses/libvips-LICENSE.txt', `Header\n\n${crlfSection}`);
    await expect(checkNotices(stage, build, HOLDER)).resolves.toEqual([]);
  });

  it('reports a binary without the version when its digest is pinned', async (): Promise<void> => {
    const { stage, build } = completeStage('fake ffmpeg without the version');
    const problems = await checkNotices(stage, build, HOLDER);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(VERSION);
  });
});
