// ───────────────────────────────────────────────────────────────────
// MODULE: Source Notice
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { PinnedBuild, PinnedComponent } from './pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const COMPONENTS: readonly PinnedComponent[] = ['ffmpeg', 'ffprobe'];

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Renders the notice that records the provenance and licence of a pinned ffmpeg build.
 *
 * @param build - The pinned build the notice describes, bundled or installed by setup.
 * @returns The Markdown text of the source notice.
 */
export function renderSourceNotice(build: PinnedBuild): string {
  const lines = [
    '# The ffmpeg and ffprobe build',
    '',
    '| Field | Value |',
    '|---|---|',
    `| Version line | \`ffmpeg version ${build.version}\` |`,
    `| Licence | ${build.licence} |`,
    `| Builder | ${build.builder}, ${build.buildPage} |`,
    `| Release | ${build.release} |`,
    '',
    'The first line of ffmpeg -version starts with the version line above, and media_health '
      + 'reports that line.',
    '',
    '## Binaries',
    '',
    '| Binary | Download | Download SHA-256 | Binary SHA-256 |',
    '|---|---|---|---|',
  ];
  for (const component of COMPONENTS) {
    const artifact = build.artifacts[component];
    lines.push(
      `| ${component} | ${artifact.url} | ${artifact.sha256} | ${artifact.binarySha256} |`,
    );
  }
  lines.push('', '## Corresponding source', '');
  for (const url of build.sourceUrls) {
    lines.push(`- ${url}`);
  }
  lines.push('', 'The full licence text is in licenses/ffmpeg-LICENSE.txt.');
  return `${lines.join('\n')}\n`;
}
