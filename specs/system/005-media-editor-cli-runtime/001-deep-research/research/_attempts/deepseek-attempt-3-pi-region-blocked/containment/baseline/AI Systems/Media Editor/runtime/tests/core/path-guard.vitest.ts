// ───────────────────────────────────────────────────────────────────
// MODULE: Path Guard Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import {
  assertOutputNotOnInput,
  assertRootsConfigured,
  isInsideRoot,
  isUncPath,
  resolveInputPath,
  resolveInputPaths,
  validatePathString,
  verifyUnchanged,
} from '../../src/core/path-guard.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL = 'video_trim';
const PARAMETER = 'inputPath';
const WINDOWS_EXTENDED = '\\\\?\\C:\\media\\a.mp4';
const WINDOWS_DEVICE = '\\\\.\\C:\\media\\a.mp4';
const WINDOWS_STREAM = 'C:\\media\\a.mp4:stream';
const WINDOWS_UNC = '\\\\server\\share\\a.mp4';
const WINDOWS_UNC_SLASH = '//server/share/a.mp4';
const WINDOWS_UNC_MIXED = '\\/server\\share/a.mp4';
const POSIX_STREAM = '/tmp/a.mp4:stream';

const scratch = mkdtempSync(path.join(tmpdir(), 'media-editor-path-guard-'));
const scratchReal = realpathSync.native(scratch);

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function mediaError(run: () => void): MediaError {
  try {
    run();
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a MediaError.');
}

function probeCaseSensitive(parent: string): boolean {
  mkdirSync(parent, { recursive: true });
  mkdirSync(path.join(parent, 'CaseProbe'));
  try {
    return !statSync(path.join(parent, 'caseprobe')).isDirectory();
  } catch (error: unknown) {
    if (error instanceof Error) {
      return true;
    }
    return true;
  }
}

function probeNormalizesNames(parent: string): boolean {
  mkdirSync(parent, { recursive: true });
  const nfcName = 'caf\u00e9';
  const nfdName = nfcName.normalize('NFD');
  mkdirSync(path.join(parent, nfdName));
  const stored = readdirSync(parent).find((name) => name.normalize('NFC') === nfcName);
  return stored !== nfdName;
}

function probeOtherDrive(): string | undefined {
  if (process.platform !== 'win32') {
    return undefined;
  }
  const current = path.win32.parse(tmpdir()).root.toUpperCase();
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const letter of letters) {
    const drive = `${letter}:\\`;
    if (drive.toUpperCase() === current) {
      continue;
    }
    try {
      if (statSync(drive).isDirectory()) {
        return drive;
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        continue;
      }
    }
  }
  return undefined;
}

const volumeIsCaseSensitive = probeCaseSensitive(
  path.join(scratchReal, 'case-probe'),
);
const filesystemNormalizesNames = probeNormalizesNames(
  path.join(scratchReal, 'norm-probe'),
);
const otherDriveRoot = probeOtherDrive();

function makeRoot(name: string): { root: string; file: string; fileReal: string } {
  const rootDir = path.join(scratchReal, name);
  mkdirSync(rootDir, { recursive: true });
  const root = realpathSync.native(rootDir);
  const file = path.join(root, 'clip.mp4');
  writeFileSync(file, 'clip');
  return {
    root,
    file,
    fileReal: realpathSync.native(file),
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

const rootDir = path.join(scratchReal, 'roots', 'media');
mkdirSync(rootDir, { recursive: true });
const rootReal = realpathSync.native(rootDir);
const clipPath = path.join(rootReal, 'clip.mp4');
writeFileSync(clipPath, 'clip');
const clipReal = realpathSync.native(clipPath);
mkdirSync(path.join(rootReal, 'clips'));
const quotedPath = path.join(rootReal, 'it\'s a clip.mp4');
writeFileSync(quotedPath, 'quote');
const quotedReal = realpathSync.native(quotedPath);

const outsideDir = path.join(scratchReal, 'elsewhere');
mkdirSync(outsideDir);
const outsidePath = path.join(outsideDir, 'secret.png');
writeFileSync(outsidePath, 'secret');
const outsideReal = realpathSync.native(outsidePath);

const siblingDir = path.join(scratchReal, 'roots', 'media-private');
mkdirSync(siblingDir);
const siblingPath = path.join(siblingDir, 'pic.png');
writeFileSync(siblingPath, 'pic');
const siblingReal = realpathSync.native(siblingPath);

const secretPath = path.join(scratchReal, 'roots', 'secret.png');
writeFileSync(secretPath, 'secret');
const secretReal = realpathSync.native(secretPath);

const second = makeRoot('second-root');

afterAll((): void => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('isInsideRoot', (): void => {
  it('accepts a path equal to the root or inside it', (): void => {
    expect(isInsideRoot('/media', '/media', '/')).toBe(true);
    expect(isInsideRoot('/media/', '/media', '/')).toBe(true);
    expect(isInsideRoot('/media', '/media/', '/')).toBe(true);
    expect(isInsideRoot('/media/pic.png', '/media', '/')).toBe(true);
    expect(isInsideRoot('C:\\media', 'C:\\media', '\\')).toBe(true);
    expect(isInsideRoot('C:\\media\\a.mp4', 'C:\\media', '\\')).toBe(true);
  });

  it('rejects a sibling that only shares a string prefix', (): void => {
    expect(isInsideRoot('/media-private', '/media', '/')).toBe(false);
    expect(isInsideRoot('/media-private/pic.png', '/media', '/')).toBe(false);
    expect(isInsideRoot('C:\\media-private', 'C:\\media', '\\')).toBe(false);
    expect(isInsideRoot('C:\\media-private\\pic.png', 'C:\\media', '\\')).toBe(false);
  });

  it('treats a root of / as containing every absolute path', (): void => {
    expect(isInsideRoot('/etc/passwd', '/', '/')).toBe(true);
    expect(isInsideRoot('/media/a', '/', '/')).toBe(true);
    expect(isInsideRoot('/', '/', '/')).toBe(true);
    expect(isInsideRoot('media/a', '/', '/')).toBe(false);
  });

  it('compares Windows paths by whole segments and does not fold case', (): void => {
    expect(isInsideRoot('D:\\clips\\a.mp4', 'C:\\media', '\\')).toBe(false);
    expect(isInsideRoot('c:\\media\\pic.png', 'C:\\Media', '\\')).toBe(false);
    expect(isInsideRoot(WINDOWS_UNC, '\\\\server\\share', '\\')).toBe(true);
    expect(isInsideRoot(WINDOWS_UNC, '\\\\server\\other', '\\')).toBe(false);
    expect(isInsideRoot(WINDOWS_UNC, '\\\\other\\share', '\\')).toBe(false);
  });

  it('treats an NFD spelling and its NFC twin as the same path', (): void => {
    const root = '/roots/caf\u00e9';
    const input = `${root.normalize('NFD')}/pic.png`;
    expect(isInsideRoot(input, root, '/')).toBe(true);
    expect(isInsideRoot(root, root.normalize('NFD'), '/')).toBe(true);
  });
});

describe('isUncPath', (): void => {
  it('accepts every two-separator spelling and rejects other forms', (): void => {
    expect(isUncPath('\\\\server\\share\\a.mp4')).toBe(true);
    expect(isUncPath(WINDOWS_UNC_SLASH)).toBe(true);
    expect(isUncPath(WINDOWS_UNC_MIXED)).toBe(true);
    expect(isUncPath('/\\server\\share\\a.mp4')).toBe(true);
    expect(isUncPath('\\\\?\\C:\\a.mp4')).toBe(false);
    expect(isUncPath('\\\\.\\pipe\\x')).toBe(false);
    expect(isUncPath('//?/C:/a.mp4')).toBe(false);
    expect(isUncPath('//./pipe/x')).toBe(false);
    expect(isUncPath('C:\\a.mp4')).toBe(false);
    expect(isUncPath('/a/b')).toBe(false);
    expect(isUncPath('\\a\\b')).toBe(false);
  });
});

describe('validatePathString', (): void => {
  it('rejects Windows special paths on win32 only', (): void => {
    for (const value of [
      WINDOWS_EXTENDED,
      WINDOWS_DEVICE,
      WINDOWS_STREAM,
    ]) {
      const winError = mediaError((): void => {
        validatePathString(value, PARAMETER, 'win32');
      });
      expect(winError.code).toBe(ERROR_CODES.INVALID_INPUT);
      expect(winError.details).toEqual({
        parameter: PARAMETER,
        value,
        reason: 'windows-special-path',
      });

      const otherError = mediaError((): void => {
        validatePathString(value, PARAMETER, 'linux');
      });
      expect(otherError.code).toBe(ERROR_CODES.INVALID_INPUT);
      expect(otherError.details).toEqual({
        parameter: PARAMETER,
        value,
        reason: 'relative-path',
      });
    }

    for (const value of ['//?/C:/media/a.mp4', '//./C:/media/a.mp4']) {
      const winError = mediaError((): void => {
        validatePathString(value, PARAMETER, 'win32');
      });
      expect(winError.details).toEqual({
        parameter: PARAMETER,
        value,
        reason: 'windows-special-path',
      });
      expect((): void => {
        validatePathString(value, PARAMETER, 'linux');
      }).not.toThrow();
    }

    expect((): void => {
      validatePathString('C:\\media\\a.mp4', PARAMETER, 'win32');
    }).not.toThrow();
    expect((): void => {
      validatePathString(POSIX_STREAM, PARAMETER, 'linux');
    }).not.toThrow();

    const streamOnWindows = mediaError((): void => {
      validatePathString(POSIX_STREAM, PARAMETER, 'win32');
    });
    expect(streamOnWindows.details).toEqual({
      parameter: PARAMETER,
      value: POSIX_STREAM,
      reason: 'windows-special-path',
    });

    const relativeStream = mediaError((): void => {
      validatePathString('clip.mp4:stream', PARAMETER, 'win32');
    });
    expect(relativeStream.details).toEqual({
      parameter: PARAMETER,
      value: 'clip.mp4:stream',
      reason: 'relative-path',
    });
  });
});

describe('resolveInputPath', (): void => {
  it('accepts a regular file inside a root', (): void => {
    const resolved = resolveInputPath(
      clipPath,
      'input',
      [rootReal],
      PARAMETER,
      TOOL,
    );
    expect(resolved.rawPath).toBe(clipPath);
    expect(resolved.realPath).toBe(clipReal);
    expect(resolved.role).toBe('input');
  });

  it('accepts a file inside a later root', (): void => {
    const resolved = resolveInputPath(
      second.file,
      'subtitle',
      [rootReal, second.root],
      PARAMETER,
      TOOL,
    );
    expect(resolved.realPath).toBe(second.fileReal);
    expect(resolved.role).toBe('subtitle');
  });

  it('accepts a traversal that stays inside the root', (): void => {
    const raw = `${rootReal}${path.sep}clips${path.sep}..${path.sep}clip.mp4`;
    const resolved = resolveInputPath(raw, 'input', [rootReal], PARAMETER, TOOL);
    expect(resolved.realPath).toBe(clipReal);
    expect(resolved.rawPath).toBe(raw);
  });

  it('rejects a traversal that leaves the root', (): void => {
    const raw = `${rootReal}${path.sep}..${path.sep}secret.png`;
    const error = mediaError((): void => {
      resolveInputPath(raw, 'input', [rootReal], PARAMETER, TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
    expect(error.details).toEqual({
      path: raw,
      realPath: secretReal,
      allowedRoots: [rootReal],
      reason: 'outside-root',
    });
  });

  it('rejects a sibling folder that shares a string prefix', (): void => {
    const error = mediaError((): void => {
      resolveInputPath(siblingPath, 'input', [rootReal], PARAMETER, TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
    expect(error.details).toEqual({
      path: siblingPath,
      realPath: siblingReal,
      allowedRoots: [rootReal],
      reason: 'sibling-prefix',
    });
  });

  it('rejects a symlink inside a root that points outside', (): void => {
    const link = path.join(rootReal, 'link.png');
    symlinkSync(outsidePath, link);
    const error = mediaError((): void => {
      resolveInputPath(link, 'overlay-image', [rootReal], PARAMETER, TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
    expect(error.details).toEqual({
      path: link,
      realPath: outsideReal,
      allowedRoots: [rootReal],
      reason: 'symlink-target',
    });
  });

  it('accepts a root that is itself a symlink', (): void => {
    const target = path.join(scratchReal, 'mnt', 'big', 'media');
    mkdirSync(target, { recursive: true });
    const picture = path.join(target, 'pic.png');
    writeFileSync(picture, 'pic');
    const data = path.join(scratchReal, 'data');
    mkdirSync(data);
    const link = path.join(data, 'media');
    symlinkSync(target, link, 'dir');
    const linkedRoot = realpathSync.native(link);
    const input = path.join(link, 'pic.png');
    const resolved = resolveInputPath(input, 'input', [linkedRoot], PARAMETER, TOOL);
    expect(linkedRoot).toBe(realpathSync.native(target));
    expect(resolved.realPath).toBe(realpathSync.native(picture));
  });

  it('rejects an absolute path outside every root', (): void => {
    const error = mediaError((): void => {
      resolveInputPath(outsidePath, 'input', [rootReal], PARAMETER, TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
    expect(error.details).toEqual({
      path: outsidePath,
      realPath: outsideReal,
      allowedRoots: [rootReal],
      reason: 'outside-root',
    });
  });

  it('rejects a relative path', (): void => {
    const value = 'clip.mp4';
    const error = mediaError((): void => {
      resolveInputPath(value, 'input', [rootReal], PARAMETER, TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(error.details).toEqual({
      parameter: PARAMETER,
      value,
      reason: 'relative-path',
    });
  });

  it('rejects an empty string as a relative path', (): void => {
    const error = mediaError((): void => {
      resolveInputPath('', 'input', [rootReal], PARAMETER, TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(error.details).toEqual({
      parameter: PARAMETER,
      value: '',
      reason: 'relative-path',
    });
  });

  it('rejects a NUL byte before the absolute-path check', (): void => {
    const value = `${rootReal}\0hidden`;
    const error = mediaError((): void => {
      resolveInputPath(value, 'input', [rootReal], PARAMETER, TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(error.details).toEqual({
      parameter: PARAMETER,
      value,
      reason: 'nul-byte',
    });
  });

  it('rejects a lone surrogate before any other path check', (): void => {
    const value = `${rootReal}/\uD800`;
    const error = mediaError((): void => {
      resolveInputPath(value, 'input', [rootReal], PARAMETER, TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(error.details).toEqual({
      parameter: PARAMETER,
      value,
      reason: 'not-utf8',
    });

    const mixed = '\uD800\0';
    const mixedError = mediaError((): void => {
      resolveInputPath(mixed, 'input', [rootReal], PARAMETER, TOOL);
    });
    expect(mixedError.details).toEqual({
      parameter: PARAMETER,
      value: mixed,
      reason: 'not-utf8',
    });
  });

  it('rejects a missing file', (): void => {
    const missing = path.join(rootReal, 'missing.png');
    const error = mediaError((): void => {
      resolveInputPath(missing, 'subtitle', [rootReal], PARAMETER, TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.INPUT_NOT_FOUND);
    expect(error.details).toEqual({
      path: missing,
      role: 'subtitle',
    });
  });

  it('rejects a directory', (): void => {
    const directory = path.join(rootReal, 'clips');
    const error = mediaError((): void => {
      resolveInputPath(directory, 'overlay-image', [rootReal], PARAMETER, TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.INPUT_NOT_FOUND);
    expect(error.details).toEqual({
      path: directory,
      role: 'overlay-image',
    });
  });

  it('rejects a directory symlink loop', (): void => {
    const loopRoot = path.join(scratchReal, 'loop-root');
    mkdirSync(loopRoot);
    const loop = path.join(loopRoot, 'loop');
    symlinkSync(loop, loop);
    const error = mediaError((): void => {
      resolveInputPath(loop, 'input', [rootReal], PARAMETER, TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.INPUT_NOT_FOUND);
    expect(error.details).toEqual({
      path: loop,
      role: 'input',
    });
  });

  it('fails closed when no root is configured', (): void => {
    const error = mediaError((): void => {
      resolveInputPath('clip.mp4', 'input', [], PARAMETER, TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.CONFIG_MISSING);
    expect(error.details).toEqual({
      setting: 'allowedRoots',
      tool: TOOL,
      reason: 'unset',
    });
    expect((): void => {
      assertRootsConfigured([rootReal], TOOL);
    }).not.toThrow();
  });

  it('accepts a file name that contains a quote', (): void => {
    const resolved = resolveInputPath(
      quotedPath,
      'font',
      [rootReal],
      PARAMETER,
      TOOL,
    );
    expect(resolved.realPath).toBe(quotedReal);
    expect(resolved.role).toBe('font');
  });

  it.skipIf(process.platform !== 'win32')(
    'accepts a drive-letter path inside the roots',
    (): void => {
      const resolved = resolveInputPath(
        clipPath,
        'input',
        [rootReal],
        PARAMETER,
        TOOL,
      );
      expect(resolved.realPath).toBe(clipReal);
    },
  );

  it.skipIf(process.platform !== 'win32' || otherDriveRoot === undefined)(
    'rejects a drive letter outside the roots',
    (): void => {
      if (otherDriveRoot === undefined) {
        return;
      }
      const error = mediaError((): void => {
        resolveInputPath(otherDriveRoot, 'input', [rootReal], PARAMETER, TOOL);
      });
      expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
      expect(error.details).toEqual({
        path: otherDriveRoot,
        realPath: realpathSync.native(otherDriveRoot),
        allowedRoots: [rootReal],
        reason: 'outside-root',
      });
    },
  );

  // A missing share fails canonicalization before the root check, and probing
  // a UNC server can block. Segment containment is asserted without that call.
  it.skipIf(process.platform !== 'win32')(
    'keeps a UNC path for the root check on Windows',
    (): void => {
      expect((): void => {
        validatePathString(WINDOWS_UNC, PARAMETER, 'win32');
      }).not.toThrow();
      expect(isInsideRoot(WINDOWS_UNC, '\\\\server\\share', '\\')).toBe(true);
      expect(isInsideRoot(WINDOWS_UNC, rootReal, '\\')).toBe(false);
    },
  );

  it('rejects a Windows UNC path no root names before a file system call', (): void => {
    const error = mediaError((): void => {
      resolveInputPath(WINDOWS_UNC, 'input', [rootReal], PARAMETER, TOOL, 'win32');
    });
    expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
    expect(error.details).toEqual({
      path: WINDOWS_UNC,
      realPath: WINDOWS_UNC,
      allowedRoots: [rootReal],
      reason: 'outside-root',
    });
  });

  it('rejects a slash or mixed UNC path no root names before a file system call', (): void => {
    for (const spelling of [WINDOWS_UNC_SLASH, WINDOWS_UNC_MIXED]) {
      const error = mediaError((): void => {
        resolveInputPath(spelling, 'input', [rootReal], PARAMETER, TOOL, 'win32');
      });
      expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
      expect(error.details).toEqual({
        path: spelling,
        realPath: spelling,
        allowedRoots: [rootReal],
        reason: 'outside-root',
      });
    }
  });

  it('reads a forward-slash UNC path against the root once a root names it', (): void => {
    const error = mediaError((): void => {
      resolveInputPath(
        WINDOWS_UNC_SLASH,
        'input',
        ['\\\\server\\share'],
        PARAMETER,
        TOOL,
        'win32',
      );
    });
    expect(error.code).toBe(ERROR_CODES.INPUT_NOT_FOUND);
  });

  it('canonicalizes a Windows UNC path once a root names it', (): void => {
    const shareRoot = '\\\\server\\share';
    const error = mediaError((): void => {
      resolveInputPath(WINDOWS_UNC, 'input', [shareRoot], PARAMETER, TOOL, 'win32');
    });
    expect(error.code).toBe(ERROR_CODES.INPUT_NOT_FOUND);
    expect(error.details).toEqual({
      path: WINDOWS_UNC,
      role: 'input',
    });
  });

  it.skipIf(process.platform === 'win32')(
    'rejects a UNC string that is not absolute on this platform',
    (): void => {
      const error = mediaError((): void => {
        resolveInputPath(WINDOWS_UNC, 'input', [rootReal], PARAMETER, TOOL);
      });
      expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
      expect(error.details).toEqual({
        parameter: PARAMETER,
        value: WINDOWS_UNC,
        reason: 'relative-path',
      });
    },
  );

  it.skipIf(volumeIsCaseSensitive)(
    'accepts a case variant on a case-insensitive volume',
    (): void => {
      const base = path.join(scratchReal, 'case-insensitive');
      mkdirSync(base);
      const folder = path.join(base, 'Media');
      mkdirSync(folder);
      const picture = path.join(folder, 'pic.png');
      writeFileSync(picture, 'pic');
      const folderReal = realpathSync.native(folder);
      const leaf = path.basename(folderReal);
      const flipped = leaf === leaf.toLowerCase()
        ? leaf.toUpperCase()
        : leaf.toLowerCase();
      const input = path.join(path.dirname(folderReal), flipped, 'pic.png');
      const resolved = resolveInputPath(
        input,
        'input',
        [folderReal],
        PARAMETER,
        TOOL,
      );
      expect(resolved.realPath).toBe(realpathSync.native(picture));
    },
  );

  it.skipIf(!volumeIsCaseSensitive)(
    'rejects a different-case folder on a case-sensitive volume',
    (): void => {
      const base = path.join(scratchReal, 'case-sensitive');
      mkdirSync(base);
      const upper = path.join(base, 'Media');
      const lower = path.join(base, 'media');
      mkdirSync(upper);
      mkdirSync(lower);
      const picture = path.join(lower, 'pic.png');
      writeFileSync(picture, 'pic');
      const upperReal = realpathSync.native(upper);
      const error = mediaError((): void => {
        resolveInputPath(picture, 'input', [upperReal], PARAMETER, TOOL);
      });
      expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
      expect(error.details).toMatchObject({
        path: picture,
        allowedRoots: [upperReal],
        reason: 'outside-root',
      });
    },
  );

  it.skipIf(filesystemNormalizesNames)(
    'accepts an NFD spelling when the root is stored NFC',
    (): void => {
      const base = path.join(scratchReal, 'unicode-root');
      mkdirSync(base);
      const nfcName = 'caf\u00e9';
      const nfdName = nfcName.normalize('NFD');
      const nfdDir = path.join(base, nfdName);
      mkdirSync(nfdDir);
      const picture = path.join(nfdDir, 'pic.png');
      writeFileSync(picture, 'pic');
      const nfcRoot = path.join(base, nfcName);
      const resolved = resolveInputPath(
        picture,
        'font',
        [nfcRoot],
        PARAMETER,
        TOOL,
      );
      expect(resolved.realPath).toBe(realpathSync.native(picture));
    },
  );
});

describe('resolveInputPaths', (): void => {
  it('returns every path when each one is inside a root', (): void => {
    const resolved = resolveInputPaths(
      [clipPath, quotedPath],
      'input',
      [rootReal],
      'inputPaths',
      TOOL,
    );
    expect(resolved.map((entry) => entry.realPath)).toEqual([clipReal, quotedReal]);
  });

  it('rejects a Windows UNC path in a list before a file system call', (): void => {
    const error = mediaError((): void => {
      resolveInputPaths(
        [WINDOWS_UNC],
        'input',
        [rootReal],
        'inputPaths',
        TOOL,
        'win32',
      );
    });
    expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
    expect(error.details).toEqual({
      path: WINDOWS_UNC,
      realPath: WINDOWS_UNC,
      allowedRoots: [rootReal],
      reason: 'outside-root',
    });
  });

  it('rejects the whole list when the last entry is outside', (): void => {
    const error = mediaError((): void => {
      resolveInputPaths(
        [clipPath, outsidePath],
        'input',
        [rootReal],
        'inputPaths',
        TOOL,
      );
    });
    expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
    expect(error.details).toEqual({
      path: outsidePath,
      realPath: outsideReal,
      allowedRoots: [rootReal],
      reason: 'outside-root',
    });
  });
});

describe('verifyUnchanged', (): void => {
  it('accepts a path that still resolves to the same file', (): void => {
    const resolved = resolveInputPath(clipPath, 'input', [rootReal], PARAMETER, TOOL);
    expect((): void => {
      verifyUnchanged(resolved, [rootReal]);
    }).not.toThrow();
  });

  it('rejects a symlink whose target was swapped', (): void => {
    const swapRoot = path.join(scratchReal, 'swap-root');
    mkdirSync(swapRoot);
    const swapReal = realpathSync.native(swapRoot);
    const inside = path.join(swapReal, 'inside.png');
    writeFileSync(inside, 'inside');
    const link = path.join(swapReal, 'link.png');
    symlinkSync(inside, link);
    const resolved = resolveInputPath(link, 'input', [swapReal], PARAMETER, TOOL);
    rmSync(link);
    symlinkSync(outsidePath, link);
    const error = mediaError((): void => {
      verifyUnchanged(resolved, [swapReal]);
    });
    expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
    expect(error.details).toEqual({
      path: link,
      realPath: outsideReal,
      allowedRoots: [swapReal],
      reason: 'changed-after-check',
    });
  });

  it('rejects a path that disappeared after the check', (): void => {
    const goneRoot = path.join(scratchReal, 'gone-root');
    mkdirSync(goneRoot);
    const goneReal = realpathSync.native(goneRoot);
    const file = path.join(goneReal, 'gone.png');
    writeFileSync(file, 'gone');
    const resolved = resolveInputPath(file, 'font', [goneReal], PARAMETER, TOOL);
    rmSync(file);
    const error = mediaError((): void => {
      verifyUnchanged(resolved, [goneReal]);
    });
    expect(error.code).toBe(ERROR_CODES.INPUT_NOT_FOUND);
    expect(error.details).toEqual({
      path: file,
      role: 'font',
    });
  });
});

describe('assertOutputNotOnInput', (): void => {
  it('rejects an output equal to an input', (): void => {
    const error = mediaError((): void => {
      assertOutputNotOnInput(clipPath, [outsidePath, clipPath]);
    });
    expect(error.code).toBe(ERROR_CODES.OUTPUT_EXISTS);
    expect(error.details).toEqual({
      path: clipPath,
      stage: 'pre-check',
      input: clipPath,
    });

    const nfc = `${rootReal}/caf\u00e9.mp4`;
    const nfd = nfc.normalize('NFD');
    const folded = mediaError((): void => {
      assertOutputNotOnInput(nfd, [nfc]);
    });
    expect(folded.details).toEqual({
      path: nfd,
      stage: 'pre-check',
      input: nfc,
    });
  });

  it('rejects an output nested inside an input path', (): void => {
    const nested = `${clipPath}${path.sep}extra`;
    const error = mediaError((): void => {
      assertOutputNotOnInput(nested, [clipPath]);
    });
    expect(error.code).toBe(ERROR_CODES.OUTPUT_EXISTS);
    expect(error.details).toEqual({
      path: nested,
      stage: 'pre-check',
      input: clipPath,
    });
  });

  it('accepts an output that is not on an input path', (): void => {
    const planned = path.join(rootReal, 'exports', 'clip-out.mp4');
    expect((): void => {
      assertOutputNotOnInput(planned, [clipPath]);
    }).not.toThrow();
    expect((): void => {
      assertOutputNotOnInput(rootReal, [clipPath]);
    }).not.toThrow();
    expect((): void => {
      assertOutputNotOnInput(`${clipPath}-extra`, [clipPath]);
    }).not.toThrow();
  });
});
