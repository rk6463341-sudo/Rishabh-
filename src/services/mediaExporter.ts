import { AspectRatio, CaptionCue, CaptionStyle, BrandKit } from '../types';

export interface RenderOptions {
  videoUrl: string;
  startTime: number;
  endTime: number;
  aspect: AspectRatio;
  resolution: '1080p' | '720p';
  panX: number; // 0 to 1
  panY: number; // 0 to 1
  zoom: number; // 1 to 2
  volume: number; // 0 to 1
  isMuted: boolean;
  captions?: CaptionCue[];
  captionStyle?: CaptionStyle;
  brandKit?: BrandKit;
  onProgress?: (progress: number, secondsRemaining: number) => void;
  signal?: AbortSignal;
}

export interface RenderResult {
  blob: Blob;
  downloadUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSec: number;
}

export class MediaExporter {
  /**
   * Render and export an actual playable video clip directly in the browser
   */
  static async renderClip(options: RenderOptions): Promise<RenderResult> {
    const {
      videoUrl,
      startTime,
      endTime,
      aspect,
      resolution,
      panX = 0.5,
      panY = 0.5,
      zoom = 1.0,
      volume = 1.0,
      isMuted = false,
      captions = [],
      captionStyle,
      brandKit,
      onProgress,
      signal,
    } = options;

    const clipDuration = Math.max(1, endTime - startTime);

    // Determine target canvas dimensions
    let targetWidth = 1080;
    let targetHeight = 1920;

    if (resolution === '720p') {
      if (aspect === '9:16') {
        targetWidth = 720;
        targetHeight = 1280;
      } else if (aspect === '1:1') {
        targetWidth = 720;
        targetHeight = 720;
      } else if (aspect === '16:9') {
        targetWidth = 1280;
        targetHeight = 720;
      } else if (aspect === '4:5') {
        targetWidth = 720;
        targetHeight = 900;
      }
    } else {
      // 1080p
      if (aspect === '9:16') {
        targetWidth = 1080;
        targetHeight = 1920;
      } else if (aspect === '1:1') {
        targetWidth = 1080;
        targetHeight = 1080;
      } else if (aspect === '16:9') {
        targetWidth = 1920;
        targetHeight = 1080;
      } else if (aspect === '4:5') {
        targetWidth = 1080;
        targetHeight = 1350;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // Create an isolated HTML5 Video element
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = isMuted || volume === 0;
    video.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume));
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video element for rendering'));
    });

    // Create audio destination
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    let audioCtx: AudioContext | null = null;
    let audioSource: MediaElementAudioSourceNode | null = null;
    let audioDest: MediaStreamAudioDestinationNode | null = null;

    try {
      audioCtx = new AudioCtx();
      audioSource = audioCtx.createMediaElementSource(video);
      audioDest = audioCtx.createMediaStreamDestination();
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(isMuted ? 0 : volume, audioCtx.currentTime);
      audioSource.connect(gainNode);
      gainNode.connect(audioDest);
    } catch {
      // Audio capture from element might fail if already connected or muted
    }

    // Set up canvas capture stream
    const canvasStream = canvas.captureStream(30);
    const streamTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

    if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
      streamTracks.push(...audioDest.stream.getAudioTracks());
    }

    const combinedStream = new MediaStream(streamTracks);

    // Pick best supported MIME type
    const candidateMimes = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    let selectedMime = 'video/webm';
    for (const mime of candidateMimes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    const recorder = new MediaRecorder(combinedStream, {
      mimeType: selectedMime,
      videoBitsPerSecond: resolution === '1080p' ? 8_000_000 : 4_500_000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    video.currentTime = startTime;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    return new Promise<RenderResult>((resolve, reject) => {
      let animFrameId: number;
      let isAborted = false;

      const cleanup = () => {
        cancelAnimationFrame(animFrameId);
        video.pause();
        video.src = '';
        video.load();
        audioCtx?.close().catch(() => {});
      };

      if (signal) {
        signal.addEventListener('abort', () => {
          isAborted = true;
          cleanup();
          try {
            if (recorder.state !== 'inactive') recorder.stop();
          } catch {}
          reject(new Error('Export aborted by user'));
        });
      }

      recorder.onstop = () => {
        cleanup();
        if (isAborted) return;

        const finalBlob = new Blob(chunks, { type: selectedMime });
        const downloadUrl = URL.createObjectURL(finalBlob);

        resolve({
          blob: finalBlob,
          downloadUrl,
          mimeType: selectedMime,
          fileSizeBytes: finalBlob.size,
          durationSec: clipDuration,
        });
      };

      recorder.onerror = (e) => {
        cleanup();
        reject(new Error(`Recording error: ${e}`));
      };

      // Start recording
      recorder.start(100);
      video.play().catch(reject);

      const renderLoop = () => {
        if (isAborted) return;

        const curTime = video.currentTime;
        const elapsed = curTime - startTime;
        const progressPct = Math.min(100, Math.max(0, (elapsed / clipDuration) * 100));
        const remainingSec = Math.max(0, clipDuration - elapsed);

        if (onProgress) {
          onProgress(Math.round(progressPct), Math.round(remainingSec));
        }

        if (curTime >= endTime || video.ended) {
          recorder.stop();
          return;
        }

        // Draw cropped video frame
        const vW = video.videoWidth || 1280;
        const vH = video.videoHeight || 720;

        // Calculate aspect ratios
        const videoRatio = vW / vH;
        const targetRatio = targetWidth / targetHeight;

        let srcW = vW;
        let srcH = vH;

        if (videoRatio > targetRatio) {
          // Video is wider than target crop
          srcW = vH * targetRatio;
        } else {
          // Video is taller than target crop
          srcH = vW / targetRatio;
        }

        // Apply zoom
        srcW = srcW / zoom;
        srcH = srcH / zoom;

        // Apply panX and panY
        const maxOffsetW = vW - srcW;
        const maxOffsetH = vH - srcH;

        const srcX = Math.max(0, Math.min(maxOffsetW, maxOffsetW * panX));
        const srcY = Math.max(0, Math.min(maxOffsetH, maxOffsetH * panY));

        ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, targetWidth, targetHeight);

        // Burn Captions
        if (captions && captions.length > 0 && captionStyle) {
          const activeCue = captions.find(
            (c) => curTime >= c.startTime && curTime <= c.endTime
          );

          if (activeCue) {
            renderSubtitleOnCanvas(ctx, activeCue, curTime, captionStyle, targetWidth, targetHeight);
          }
        }

        // Burn Brand Watermark
        if (brandKit && brandKit.watermarkText) {
          renderWatermark(ctx, brandKit, targetWidth, targetHeight);
        }

        animFrameId = requestAnimationFrame(renderLoop);
      };

      animFrameId = requestAnimationFrame(renderLoop);
    });
  }
}

/**
 * Renders high-fidelity subtitle cues onto the canvas with word-level highlight
 */
function renderSubtitleOnCanvas(
  ctx: CanvasRenderingContext2D,
  cue: CaptionCue,
  currentTime: number,
  style: CaptionStyle,
  targetWidth: number,
  targetHeight: number
) {
  const scale = targetWidth / 1080; // normalize to 1080p
  const fontSize = Math.round(style.fontSize * scale);
  const outlineWidth = Math.round(style.outlineWidth * scale);

  ctx.save();
  ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textToDraw = style.textTransform === 'uppercase' ? cue.text.toUpperCase() : cue.text;

  // Split into multiple lines if text exceeds 85% width
  const maxWidth = targetWidth * 0.85;
  const words = textToDraw.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const w of words) {
    const testLine = currentLine ? `${currentLine} ${w}` : w;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = w;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.28;
  const totalTextHeight = lines.length * lineHeight;

  // Calculate Y position
  const yCenter = (style.yPercent / 100) * targetHeight;
  const startY = yCenter - totalTextHeight / 2 + lineHeight / 2;

  // Draw background pill if opacity > 0
  if (style.bgOpacity > 0) {
    const padding = style.boxPadding * scale * 2;
    let maxLineWidth = 0;
    lines.forEach((l) => {
      const w = ctx.measureText(l).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });

    ctx.fillStyle = hexToRgba(style.bgColor, style.bgOpacity);
    const boxX = targetWidth / 2 - maxLineWidth / 2 - padding;
    const boxY = yCenter - totalTextHeight / 2 - padding / 2;
    const boxW = maxLineWidth + padding * 2;
    const boxH = totalTextHeight + padding;
    const radius = style.borderRadius * scale;

    ctx.beginPath();
    ctx.roundRect?.(boxX, boxY, boxW, boxH, radius);
    ctx.fill();
  }

  // Draw lines
  lines.forEach((line, lineIdx) => {
    const lineY = startY + lineIdx * lineHeight;

    // Check if we have word timing for dynamic word spotlighting
    const lineWords = line.split(' ');
    const lineTotalWidth = ctx.measureText(line).width;
    let wordStartX = targetWidth / 2 - lineTotalWidth / 2;

    lineWords.forEach((word) => {
      const wordMetrics = ctx.measureText(word + ' ');
      const wordCenterX = wordStartX + ctx.measureText(word).width / 2;

      // Check if word is currently spoken based on active cue time range
      let isWordActive = false;
      if (cue.words && cue.words.length > 0) {
        const found = cue.words.find(
          (cw) =>
            currentTime >= cw.startTime &&
            currentTime <= cw.endTime &&
            cw.word.toLowerCase() === word.toLowerCase()
        );
        if (found) isWordActive = true;
      } else {
        // Linear timing estimate if individual word tokens weren't provided
        const cueDuration = Math.max(0.5, cue.endTime - cue.startTime);
        const progress = (currentTime - cue.startTime) / cueDuration;
        const totalWords = words.length;
        const curWordIdx = Math.min(totalWords - 1, Math.floor(progress * totalWords));
        // Match word index
        if (words[curWordIdx]?.toUpperCase() === word.toUpperCase()) {
          isWordActive = true;
        }
      }

      ctx.save();
      ctx.textAlign = 'center';

      if (isWordActive) {
        // Slight scale bounce for active word
        ctx.fillStyle = style.highlightColor;
      } else {
        ctx.fillStyle = style.textColor;
      }

      // Draw drop shadow
      if (style.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 12 * scale;
        ctx.shadowOffsetX = 3 * scale;
        ctx.shadowOffsetY = 4 * scale;
      }

      // Draw stroke outline
      if (outlineWidth > 0) {
        ctx.strokeStyle = style.outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(word, wordCenterX, lineY);
      }

      // Fill text
      ctx.fillText(word, wordCenterX, lineY);
      ctx.restore();

      wordStartX += wordMetrics.width;
    });
  });

  ctx.restore();
}

/**
 * Renders brand watermark in the selected corner
 */
function renderWatermark(
  ctx: CanvasRenderingContext2D,
  brandKit: BrandKit,
  targetWidth: number,
  targetHeight: number
) {
  const scale = targetWidth / 1080;
  const padding = 36 * scale;
  const fontSize = Math.round(20 * scale);

  ctx.save();
  ctx.globalAlpha = brandKit.watermarkOpacity;
  ctx.font = `700 ${fontSize}px "${brandKit.fontTitle}", sans-serif`;

  let x = padding;
  let y = padding + fontSize;

  if (brandKit.watermarkPosition === 'top-right') {
    ctx.textAlign = 'right';
    x = targetWidth - padding;
    y = padding + fontSize;
  } else if (brandKit.watermarkPosition === 'bottom-left') {
    ctx.textAlign = 'left';
    x = padding;
    y = targetHeight - padding;
  } else if (brandKit.watermarkPosition === 'bottom-right') {
    ctx.textAlign = 'right';
    x = targetWidth - padding;
    y = targetHeight - padding;
  } else {
    ctx.textAlign = 'left';
  }

  // Draw pill background
  const textWidth = ctx.measureText(brandKit.watermarkText).width;
  ctx.fillStyle = 'rgba(11, 13, 19, 0.65)';
  const boxX = ctx.textAlign === 'right' ? x - textWidth - 14 * scale : x - 14 * scale;
  const boxY = y - fontSize - 6 * scale;
  const boxW = textWidth + 28 * scale;
  const boxH = fontSize + 16 * scale;

  ctx.beginPath();
  ctx.roundRect?.(boxX, boxY, boxW, boxH, 8 * scale);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(brandKit.watermarkText, x, y);
  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
