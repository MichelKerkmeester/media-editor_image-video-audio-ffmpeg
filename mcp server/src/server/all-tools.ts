// ───────────────────────────────────────────────────────────────────
// MODULE: All Tools
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { audioConvertPropertiesTool } from '../tools/audio/convert-properties.js';
import { audioConvertTool } from '../tools/audio/convert.js';
import { audioExtractTool } from '../tools/audio/extract.js';
import { audioSetBitrateTool } from '../tools/audio/set-bitrate.js';
import { audioSetChannelsTool } from '../tools/audio/set-channels.js';
import { audioSetSampleRateTool } from '../tools/audio/set-sample-rate.js';
import { imageBatchResizeTool } from '../tools/image/batch-resize.js';
import { imageCompressTool } from '../tools/image/compress.js';
import { imageConvertTool } from '../tools/image/convert.js';
import { imageCropTool } from '../tools/image/crop.js';
import { imageFlipTool } from '../tools/image/flip.js';
import { imageProbeTool } from '../tools/image/probe.js';
import { imageResizeTool } from '../tools/image/resize.js';
import { imageRotateTool } from '../tools/image/rotate.js';
import { mediaHealthTool } from '../tools/media/health.js';
import { mediaProbeTool } from '../tools/media/probe.js';
import { mediaRepairTool } from '../tools/media/repair.js';
import { mediaRemoveSilenceTool } from '../tools/media/remove-silence.js';
import { mediaSetupFfmpegTool } from '../tools/media/setup-ffmpeg.js';
import { videoAddBRollTool } from '../tools/video/add-b-roll.js';
import { videoAddFadeTool } from '../tools/video/add-fade.js';
import { videoAddImageOverlayTool } from '../tools/video/add-image-overlay.js';
import { videoAddSubtitlesTool } from '../tools/video/add-subtitles.js';
import { videoAddTextOverlayTool } from '../tools/video/add-text-overlay.js';
import { videoConcatTool } from '../tools/video/concat.js';
import { videoConvertTool } from '../tools/video/convert.js';
import { videoConvertPropertiesTool } from '../tools/video/convert-properties.js';
import { videoHlsLadderTool } from '../tools/video/hls-ladder.js';
import { videoSetAspectRatioTool } from '../tools/video/set-aspect-ratio.js';
import { videoSetAudioBitrateTool } from '../tools/video/set-audio-bitrate.js';
import { videoSetAudioChannelsTool } from '../tools/video/set-audio-channels.js';
import { videoSetAudioCodecTool } from '../tools/video/set-audio-codec.js';
import { videoSetAudioSampleRateTool } from '../tools/video/set-audio-sample-rate.js';
import { videoSetBitrateTool } from '../tools/video/set-bitrate.js';
import { videoSetCodecTool } from '../tools/video/set-codec.js';
import { videoSetFrameRateTool } from '../tools/video/set-frame-rate.js';
import { videoSetResolutionTool } from '../tools/video/set-resolution.js';
import { videoSetSpeedTool } from '../tools/video/set-speed.js';
import { videoTrimTool } from '../tools/video/trim.js';

import type { AnyToolDefinition } from './tool-registry.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Every tool the server registers, in the row order of the contract's tool table. */
export const ALL_TOOLS: readonly AnyToolDefinition[] = [
  mediaHealthTool,
  imageResizeTool,
  imageConvertTool,
  imageCropTool,
  imageCompressTool,
  imageRotateTool,
  imageFlipTool,
  imageProbeTool,
  imageBatchResizeTool,
  audioExtractTool,
  videoTrimTool,
  audioConvertPropertiesTool,
  videoConvertPropertiesTool,
  videoSetAspectRatioTool,
  audioConvertTool,
  audioSetBitrateTool,
  audioSetSampleRateTool,
  audioSetChannelsTool,
  videoConvertTool,
  videoSetResolutionTool,
  videoSetCodecTool,
  videoSetBitrateTool,
  videoSetFrameRateTool,
  videoSetAudioCodecTool,
  videoSetAudioBitrateTool,
  videoSetAudioSampleRateTool,
  videoSetAudioChannelsTool,
  videoAddSubtitlesTool,
  videoAddTextOverlayTool,
  videoAddImageOverlayTool,
  videoConcatTool,
  videoSetSpeedTool,
  mediaRemoveSilenceTool,
  videoAddBRollTool,
  videoAddFadeTool,
  mediaProbeTool,
  mediaRepairTool,
  videoHlsLadderTool,
  mediaSetupFfmpegTool,
];
