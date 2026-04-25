/**
 * NexLoad FFmpeg Service
 * Audio extraction and media conversion using ffmpeg-kit
 */

export type AudioQuality = '128' | '192' | '320' | 'flac';

export interface ConversionProgress {
  percentage: number;
  time: string;
  speed: string;
}

export interface ConversionResult {
  success: boolean;
  outputPath: string;
  duration?: number;
  error?: string;
}

type ProgressCallback = (progress: ConversionProgress) => void;

/**
 * Convert a video file to MP3 audio
 */
export const convertToMp3 = async (
  inputPath: string,
  outputPath: string,
  quality: AudioQuality = '320',
  onProgress?: ProgressCallback
): Promise<ConversionResult> => {
  try {
    // Dynamic import for FFmpeg Kit
    const { FFmpegKit, ReturnCode } = require('ffmpeg-kit-react-native');

    let cmd: string;

    if (quality === 'flac') {
      cmd = `-i "${inputPath}" -codec:a flac -y "${outputPath}"`;
    } else {
      cmd = `-i "${inputPath}" -codec:a libmp3lame -b:a ${quality}k -id3v2_version 3 -y "${outputPath}"`;
    }

    console.log(`[FFmpeg] Converting: ${cmd}`);

    const session = await FFmpegKit.execute(cmd);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      return { success: true, outputPath };
    } else {
      const logs = await session.getLogsAsString();
      return { success: false, outputPath, error: logs || 'FFmpeg conversion failed' };
    }
  } catch (error: any) {
    console.error('[FFmpeg] Conversion error:', error);
    return {
      success: false,
      outputPath,
      error: error.message || 'FFmpeg not available',
    };
  }
};

/**
 * Extract audio from video with ID3 tag embedding
 */
export const extractAudioWithTags = async (
  inputPath: string,
  outputPath: string,
  quality: AudioQuality,
  tags: {
    title?: string;
    artist?: string;
    album?: string;
    albumArtPath?: string;
  }
): Promise<ConversionResult> => {
  try {
    const { FFmpegKit, ReturnCode } = require('ffmpeg-kit-react-native');

    let cmd = `-i "${inputPath}"`;

    // Add album art if available
    if (tags.albumArtPath) {
      cmd += ` -i "${tags.albumArtPath}"`;
    }

    if (quality === 'flac') {
      cmd += ` -codec:a flac`;
    } else {
      cmd += ` -codec:a libmp3lame -b:a ${quality}k`;
    }

    // Add ID3 tags
    if (tags.title) cmd += ` -metadata title="${tags.title}"`;
    if (tags.artist) cmd += ` -metadata artist="${tags.artist}"`;
    if (tags.album) cmd += ` -metadata album="${tags.album}"`;

    // Embed album art
    if (tags.albumArtPath) {
      cmd += ` -map 0:a -map 1:v -codec:v:0 copy -disposition:v:0 attached_pic`;
    }

    cmd += ` -id3v2_version 3 -y "${outputPath}"`;

    const session = await FFmpegKit.execute(cmd);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      return { success: true, outputPath };
    } else {
      const logs = await session.getLogsAsString();
      return { success: false, outputPath, error: logs || 'FFmpeg conversion failed' };
    }
  } catch (error: any) {
    return {
      success: false,
      outputPath,
      error: error.message || 'FFmpeg not available',
    };
  }
};

/**
 * Get media file duration in seconds
 */
export const getMediaDuration = async (filePath: string): Promise<number> => {
  try {
    const { FFprobeKit } = require('ffmpeg-kit-react-native');
    const session = await FFprobeKit.getMediaInformation(filePath);
    const info = await session.getMediaInformation();
    return parseFloat(info?.getDuration() || '0');
  } catch {
    return 0;
  }
};

/**
 * Check if FFmpeg is available
 */
export const isFFmpegAvailable = async (): Promise<boolean> => {
  try {
    const { FFmpegKit } = require('ffmpeg-kit-react-native');
    const session = await FFmpegKit.execute('-version');
    const returnCode = await session.getReturnCode();
    return returnCode?.getValue() === 0;
  } catch {
    return false;
  }
};
