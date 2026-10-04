// ───────────────────────────────────────────────────────────────────
// MODULE: Bundle Notices
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { sha256File } from './artifacts.js';
import { binaryDestinations } from './targets.js';

import type { PinnedBuild, PinnedComponent } from '../../src/core/pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** The package list rendered for a bundle stage, plus any packages lacking a licence. */
export interface PackageList {
  /** The ready-to-write list text, header first. */
  readonly text: string;
  /** Identifiers of packages whose manifests declare no licence. */
  readonly unlicensed: readonly string[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const COMPONENTS: readonly PinnedComponent[] = ['ffmpeg', 'ffprobe'];
const UPSTREAM_LINES: readonly string[] = [
  'Copyright (c) 2024 Hongyi Wang',
  'Copyright (c) 2025 misbahsy',
];
const LICENCE_PATH_PATTERN = /(?:assets\/)?licenses\/[A-Za-z0-9._-]+/g;
const LICENSING_HEADING = '## Licensing';
const PACKAGE_LIST_HEADER = 'Packages in this bundle, with the licence each declares.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(filePath: string): string | undefined {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

function isNonEmptyFile(filePath: string): boolean {
  try {
    const info = statSync(filePath);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

function listFolders(folder: string): string[] {
  try {
    return readdirSync(folder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function licenceOf(manifest: Record<string, unknown>): string {
  if (typeof manifest.license === 'string' && manifest.license.length > 0) {
    return manifest.license;
  }
  if (Array.isArray(manifest.licenses)) {
    const types = manifest.licenses
      .map((entry: unknown) => (isRecord(entry) ? entry.type : undefined))
      .filter((type): type is string => typeof type === 'string' && type.length > 0);
    if (types.length > 0) {
      return types.join(' OR ');
    }
  }
  return 'UNKNOWN';
}

function packageFolders(nodeModules: string): string[] {
  const folders: string[] = [];
  for (const name of listFolders(nodeModules)) {
    if (name.startsWith('.')) {
      continue;
    }
    if (name.startsWith('@')) {
      for (const scoped of listFolders(path.join(nodeModules, name))) {
        folders.push(path.join(nodeModules, name, scoped));
      }
      continue;
    }
    folders.push(path.join(nodeModules, name));
  }
  return folders;
}

function checkHolderLine(stage: string, file: string, holder: string, problems: string[]): void {
  const text = readText(path.join(stage, file)) ?? '';
  const pattern = new RegExp(`^Copyright \\(c\\) \\d{4} ${escapeRegExp(holder)}$`, 'm');
  if (!pattern.test(text)) {
    problems.push(`${file} does not name the rights holder ${holder}.`);
  }
}

async function checkBinaries(stage: string, build: PinnedBuild, problems: string[]): Promise<void> {
  const destinations = binaryDestinations(build.platform);
  for (const component of COMPONENTS) {
    const binary = path.join(stage, destinations[component]);
    if (!existsSync(binary)) {
      problems.push(`The ${component} binary is missing at ${destinations[component]}.`);
      continue;
    }
    const digest = await sha256File(binary);
    if (digest !== build.artifacts[component].binarySha256) {
      problems.push(`The ${component} binary does not match its pinned digest.`);
    }
    if (readFileSync(binary).indexOf(build.version) === -1) {
      problems.push(`The ${component} binary does not carry the version ${build.version}.`);
    }
  }
}

function checkLibvips(stage: string, problems: string[]): void {
  const imgFolder = path.join(stage, 'node_modules', '@img');
  const licence = readText(path.join(stage, 'licenses', 'libvips-LICENSE.txt')) ?? '';
  let sections = 0;
  for (const name of listFolders(imgFolder)) {
    const readme = readText(path.join(imgFolder, name, 'README.md'));
    if (readme === undefined) {
      continue;
    }
    const lines = readme.split('\n');
    // Some published READMEs mix CRLF and LF line endings, so the heading may end in a return.
    const start = lines.findIndex((line) => line.replace(/\r$/, '') === LICENSING_HEADING);
    if (start === -1) {
      continue;
    }
    sections += 1;
    if (!licence.includes(lines.slice(start).join('\n'))) {
      problems.push(`licenses/libvips-LICENSE.txt lacks the licensing section of @img/${name}.`);
    }
  }
  if (sections === 0) {
    problems.push('No @img package README with a licensing section was found.');
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Lists every installed package in a stage with the licence its manifest declares.
 *
 * @param stage - The bundle stage folder to scan.
 * @returns The rendered package list and the unlicensed package identifiers.
 */
export function listNodeModules(stage: string): PackageList {
  const entries: string[] = [];
  const unlicensed: string[] = [];
  for (const folder of packageFolders(path.join(stage, 'node_modules'))) {
    const raw = readText(path.join(folder, 'package.json'));
    if (raw === undefined) {
      continue;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.name !== 'string') {
      continue;
    }
    const version = typeof parsed.version === 'string' ? parsed.version : '0.0.0';
    const id = `${parsed.name}@${version}`;
    const licence = licenceOf(parsed);
    if (licence === 'UNKNOWN') {
      unlicensed.push(id);
    }
    entries.push(`${id} ${licence}`);
  }
  entries.sort((left, right) => left.localeCompare(right, 'en'));
  unlicensed.sort((left, right) => left.localeCompare(right, 'en'));
  return { text: `${PACKAGE_LIST_HEADER}\n\n${entries.join('\n')}\n`, unlicensed };
}

/**
 * Checks that every licence and attribution file a bundle stage must carry is present.
 *
 * @param stage - The bundle stage folder to check.
 * @param build - The pinned build the bundle carries.
 * @param holder - The rights holder named in the top-level licence files.
 * @returns One sentence per problem, empty when the stage may be packed.
 */
export async function checkNotices(
  stage: string,
  build: PinnedBuild,
  holder: string,
): Promise<string[]> {
  const problems: string[] = [];
  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES']) {
    if (!isNonEmptyFile(path.join(stage, file))) {
      problems.push(`${file} is missing or empty.`);
    }
  }
  const notices = readText(path.join(stage, 'THIRD_PARTY_NOTICES')) ?? '';
  for (const line of UPSTREAM_LINES) {
    if (!notices.includes(line)) {
      problems.push(`THIRD_PARTY_NOTICES lacks the line ${line}.`);
    }
  }
  checkHolderLine(stage, 'LICENSE', holder, problems);
  checkHolderLine(stage, 'THIRD_PARTY_NOTICES', holder, problems);
  for (const listed of new Set(notices.match(LICENCE_PATH_PATTERN) ?? [])) {
    if (!isNonEmptyFile(path.join(stage, listed))) {
      problems.push(`${listed} is named in THIRD_PARTY_NOTICES but missing or empty.`);
    }
  }
  if (existsSync(path.join(stage, 'licenses', 'ffmpeg-builds'))) {
    problems.push('licenses/ffmpeg-builds describes builds the bundle does not carry.');
  }
  const source = readText(path.join(stage, 'licenses', 'ffmpeg-SOURCE.md')) ?? '';
  const sourceParts = [
    `ffmpeg version ${build.version}`,
    ...COMPONENTS.map((component) => build.artifacts[component].binarySha256),
  ];
  if (!sourceParts.every((part) => source.includes(part))) {
    problems.push('licenses/ffmpeg-SOURCE.md does not describe the bundled build.');
  }
  await checkBinaries(stage, build, problems);
  const probeBin = path.join(stage, 'node_modules', 'ffprobe-static', 'bin');
  const platforms = listFolders(probeBin);
  const onlyPlatform = platforms[0];
  const arches = onlyPlatform === undefined ? [] : listFolders(path.join(probeBin, onlyPlatform));
  if (platforms.length !== 1 || arches.length !== 1) {
    problems.push('ffprobe-static must hold exactly one platform and one arch folder.');
  }
  checkLibvips(stage, problems);
  const packages = readText(path.join(stage, 'licenses', 'node-modules.txt'));
  if (packages === undefined) {
    problems.push('licenses/node-modules.txt is missing.');
  } else if (packages.split('\n').some((line) => line.endsWith(' UNKNOWN'))) {
    problems.push('licenses/node-modules.txt lists a package without a licence.');
  }
  return problems;
}
