// ───────────────────────────────────────────────────────────────────
// MODULE: Pinned Builds
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** A key naming one of the five bundle targets. */
export type PlatformKey = (typeof PLATFORM_KEYS)[number];

/** Which media binary an artifact or build refers to. */
export type PinnedComponent = 'ffmpeg' | 'ffprobe';

/** The compression format used by a pinned download. */
export type ArchiveKind = 'gzip' | 'zip';

/** One pinned download and the binary it unpacks to. */
export interface PinnedArtifact {
  /** Which binary this download provides. */
  readonly component: PinnedComponent;
  /** The https URL of the archive. */
  readonly url: string;
  /** The one https host a redirect from `url` may land on; null when `url` serves the file. */
  readonly redirectHost: string | null;
  /** The archive size in bytes. */
  readonly bytes: number;
  /** The archive SHA-256, lowercase hex. */
  readonly sha256: string;
  /** The compression format of the archive. */
  readonly archive: ArchiveKind;
  /** The one file a zip holds; absent for gzip. */
  readonly entry?: string;
  /** The SHA-256 of the unpacked binary, lowercase hex. */
  readonly binarySha256: string;
}

/** One platform's ffmpeg and ffprobe, both from the same build. */
export interface PinnedBuild {
  /** The bundle target this build serves. */
  readonly platform: PlatformKey;
  /** The text `ffmpeg -version` prints after "ffmpeg version ". */
  readonly version: string;
  /** The SPDX id of this build's licence. */
  readonly licence: string;
  /** The person or project that built these binaries. */
  readonly builder: string;
  /** The builder's page for this build. */
  readonly buildPage: string;
  /** The release this build came from. */
  readonly release: string;
  /** Where the corresponding source for this exact build lives. */
  readonly sourceUrls: readonly string[];
  /** The pinned ffmpeg and ffprobe downloads for this platform. */
  readonly artifacts: Readonly<Record<PinnedComponent, PinnedArtifact>>;
}

/** A platform key split into its operating system and CPU architecture. */
export interface PlatformParts {
  /** The operating system part of the key. */
  readonly platform: 'darwin' | 'win32' | 'linux';
  /** The CPU architecture part of the key. */
  readonly arch: 'arm64' | 'x64';
}

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** The five bundle targets, in build order. */
export const PLATFORM_KEYS = [
  'darwin-arm64',
  'darwin-x64',
  'win32-x64',
  'linux-x64',
  'linux-arm64',
] as const;

const FFMPEG_STATIC_RELEASE =
  'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/';
const RIEDL_RELEASE = 'https://ffmpeg.martin-riedl.de/download/macos/arm64/1789931890_9.0.2/';
// GitHub answers a release download with a 302 to a signed link on this host that expires.
const GITHUB_ASSET_HOST = 'release-assets.githubusercontent.com';
const GPL = 'GPL-3.0-or-later';
const JOHN_VAN_SICKLE_SOURCES: readonly string[] = [
  'https://ffmpeg.org/releases/ffmpeg-7.0.2.tar.xz',
  'https://johnvansickle.com/ffmpeg/release-source/',
];

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function gzipArtifact(
  component: PinnedComponent,
  key: PlatformKey,
  bytes: number,
  sha256: string,
  binarySha256: string,
): PinnedArtifact {
  const url = `${FFMPEG_STATIC_RELEASE}${component}-${key}.gz`;
  return Object.freeze({
    component,
    url,
    redirectHost: GITHUB_ASSET_HOST,
    bytes,
    sha256,
    archive: 'gzip',
    binarySha256,
  });
}

function zipArtifact(
  component: PinnedComponent,
  bytes: number,
  sha256: string,
  binarySha256: string,
): PinnedArtifact {
  const url = `${RIEDL_RELEASE}${component}.zip`;
  return Object.freeze({
    component,
    url,
    redirectHost: null,
    bytes,
    sha256,
    archive: 'zip',
    entry: component,
    binarySha256,
  });
}

function freezeBuild(build: PinnedBuild): PinnedBuild {
  return Object.freeze({
    ...build,
    sourceUrls: Object.freeze([...build.sourceUrls]),
    artifacts: Object.freeze({ ...build.artifacts }),
  });
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

// The darwin-arm64 build that ffmpeg-static fetches is configured non-free and says it is
// not redistributable, and ffprobe-static ships an x86_64 binary there, so that row has its
// own builder.

/** The pinned build per platform; frozen, so no caller can change a pin. */
export const PINNED_BUILDS: Readonly<Record<PlatformKey, PinnedBuild>> = Object.freeze({
  'darwin-arm64': freezeBuild({
    platform: 'darwin-arm64',
    version: '9.0.2-https://www.martin-riedl.de',
    licence: GPL,
    builder: 'Martin Riedl',
    buildPage: 'https://ffmpeg.martin-riedl.de/',
    release: 'martin-riedl.de macos/arm64 1789931890_9.0.2',
    sourceUrls: [
      'https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz',
      'https://git.martin-riedl.de/ffmpeg/build-script',
    ],
    artifacts: {
      ffmpeg: zipArtifact(
        'ffmpeg',
        28395699,
        'c8ed4c4e6978a03c485edbfe4e0a5dc2380f8a30bba5150531b31b094492d924',
        '2e11c6f90993cdb79fff84d3f90044d28316b310e75b3e030cfc9a54f2c9d384',
      ),
      ffprobe: zipArtifact(
        'ffprobe',
        28317701,
        'fcbe839537485eaee7a7a8bc5cbc0f90d53617e80943e8a5b2e31cb851197ea6',
        '2738aa46a7f9acbc8ab09a6715554c90f7de603171ac403726765685df6a0059',
      ),
    },
  }),
  'darwin-x64': freezeBuild({
    platform: 'darwin-x64',
    version: '6.1.1-tessus',
    licence: GPL,
    builder: 'evermeet.cx (Helmut K. C. Tessarek)',
    buildPage: 'https://evermeet.cx/ffmpeg/',
    release: 'ffmpeg-static b6.1.1',
    sourceUrls: ['https://ffmpeg.org/releases/ffmpeg-6.1.1.tar.xz'],
    artifacts: {
      ffmpeg: gzipArtifact(
        'ffmpeg',
        'darwin-x64',
        25296431,
        '929b375c1182d956c51f7ac25e0b2b0411fb01f6f407aa15c9758efeb4242106',
        'ebdddc936f61e14049a2d4b549a412b8a40deeff6540e58a9f2a2da9e6b18894',
      ),
      ffprobe: gzipArtifact(
        'ffprobe',
        'darwin-x64',
        25239438,
        'd4da574d6e2e197bd259b47d69cf262df9e312af24ad960444f6d806d3d4c186',
        'fa3add0ce901f7241abe0dfc0155d958fc834aca3f8ce61f87cc712ae669c1e0',
      ),
    },
  }),
  'win32-x64': freezeBuild({
    platform: 'win32-x64',
    version: '6.1.1-essentials_build-www.gyan.dev',
    licence: GPL,
    builder: 'gyan.dev (Gyan Doshi)',
    buildPage: 'https://www.gyan.dev/ffmpeg/builds/',
    release: 'ffmpeg-static b6.1.1',
    sourceUrls: [
      'https://ffmpeg.org/releases/ffmpeg-6.1.1.tar.xz',
      'https://github.com/FFmpeg/FFmpeg/commit/e38092ef93',
    ],
    artifacts: {
      ffmpeg: gzipArtifact(
        'ffmpeg',
        'win32-x64',
        29581307,
        '8883a3dffbd0a16cf4ef95206ea05283f78908dbfb118f73c83f4951dcc06d77',
        '04e1307997530f9cf2fe35cba2ca7e8875ca91da02f89d6c7243df819c94ad00',
      ),
      ffprobe: gzipArtifact(
        'ffprobe',
        'win32-x64',
        29521644,
        'f309e6223ad89d2fe54bccd420a7709b66fd27540674e92309578ed491a43c8d',
        '3a7e2dc003dc2cd1472827e4c7c4f056ae1ae0ae7c5bbc580c99b49827351ba4',
      ),
    },
  }),
  'linux-x64': freezeBuild({
    platform: 'linux-x64',
    version: '7.0.2-static https://johnvansickle.com/ffmpeg/',
    licence: GPL,
    builder: 'John Van Sickle',
    buildPage: 'https://johnvansickle.com/ffmpeg/',
    release: 'ffmpeg-static b6.1.1',
    sourceUrls: JOHN_VAN_SICKLE_SOURCES,
    artifacts: {
      ffmpeg: gzipArtifact(
        'ffmpeg',
        'linux-x64',
        29354986,
        'bfe8a8fc511530457b528c48d77b5737527b504a3797a9bc4866aeca69c2dffa',
        'e7e7fb30477f717e6f55f9180a70386c62677ef8a4d4d1a5d948f4098aa3eb99',
      ),
      ffprobe: gzipArtifact(
        'ffprobe',
        'linux-x64',
        29276839,
        '25d9b6ccb05e3d9de9e04e31e2506d8dd7f9f0418981965ac6df12e8d3afd067',
        '4f231a1960d83e403d08f7971e271707bec278a9ae18e21b8b5b03186668450d',
      ),
    },
  }),
  'linux-arm64': freezeBuild({
    platform: 'linux-arm64',
    version: '7.0.2-static https://johnvansickle.com/ffmpeg/',
    licence: GPL,
    builder: 'John Van Sickle',
    buildPage: 'https://johnvansickle.com/ffmpeg/',
    release: 'ffmpeg-static b6.1.1',
    sourceUrls: JOHN_VAN_SICKLE_SOURCES,
    artifacts: {
      ffmpeg: gzipArtifact(
        'ffmpeg',
        'linux-arm64',
        25568691,
        '754a678672298bc68156adff58aa7385a592c2b30b1d0ae8750c45c915c4bac0',
        '6bb182d0d75d23028db82e9e4f723ca69b853d055698486e6984ddb2c06fb8ce',
      ),
      ffprobe: gzipArtifact(
        'ffprobe',
        'linux-arm64',
        25493573,
        '2ab6aba60ee84412dff9188720703376cb4e7aaf7e0b5e43aa8249f2acae5bf8',
        'd17ae9b4c297d48e2521ba14e417bb0537c6ff77c584cdbcd6bb0d8d0307a2e8',
      ),
    },
  }),
});

/**
 * Resolves the bundle target that matches a platform and architecture pair.
 *
 * @param platform - The operating system name to match.
 * @param arch - The CPU architecture name to match.
 * @returns The matching platform key, or undefined when no bundle targets that pair.
 */
export function platformKeyOf(platform: string, arch: string): PlatformKey | undefined {
  const candidate = `${platform}-${arch}`;
  return PLATFORM_KEYS.find((key) => key === candidate);
}

/**
 * Splits a platform key into its operating system and CPU architecture.
 *
 * @param key - The platform key to split.
 * @returns The operating system and architecture parts the key names.
 */
export function platformParts(key: PlatformKey): PlatformParts {
  const [platform, arch] = key.split('-') as [PlatformParts['platform'], PlatformParts['arch']];
  return { platform, arch };
}

/**
 * Names the executable file for one component on one platform.
 *
 * @param component - The binary whose file name is wanted.
 * @param key - The platform whose naming convention applies.
 * @returns The file name, with an .exe suffix on Windows.
 */
export function executableFileName(component: PinnedComponent, key: PlatformKey): string {
  if (key === 'win32-x64') {
    return `${component}.exe`;
  }
  return component;
}
