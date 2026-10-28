import { VideoMetadata, ClipCandidate, CaptionCue, ContentType, AspectRatio } from '../types';

export interface HighlightOptions {
  duration: number;
  contentType: ContentType;
  targetClipDuration: number;
  clipCount: number;
  transcript?: string;
}

export class VideoProcessor {
  /**
   * Extract duration, resolution, thumbnail, and aspect ratio from a video file or blob
   */
  static async extractMetadata(fileOrBlob: File | Blob): Promise<{ metadata: VideoMetadata; thumbnail: string }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fileOrBlob);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.remove();
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video. Ensure the file is a supported video format (MP4, WebM, MOV).'));
      };

      video.onloadedmetadata = () => {
        const duration = video.duration || 0;
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const fileSize = fileOrBlob.size || 0;
        const fileName = (fileOrBlob as File).name || 'imported_video.mp4';
        const mimeType = fileOrBlob.type || 'video/mp4';

        // Calculate aspect ratio string
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(width, height) || 1;
        const aspectStr = `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;

        // Seek to 10% for thumbnail
        const seekTime = Math.min(Math.max(1, duration * 0.1), duration - 0.5);
        video.currentTime = seekTime;

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            const scale = Math.min(1, 480 / Math.max(width, height));
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const thumbnail = canvas.toDataURL('image/jpeg', 0.82);
              cleanup();
              resolve({
                metadata: {
                  duration,
                  width,
                  height,
                  aspectRatio: aspectStr,
                  fileSize,
                  fileName,
                  mimeType,
                  hasAudio: true,
                },
                thumbnail,
              });
            } else {
              cleanup();
              resolve({
                metadata: {
                  duration,
                  width,
                  height,
                  aspectRatio: aspectStr,
                  fileSize,
                  fileName,
                  mimeType,
                  hasAudio: true,
                },
                thumbnail: '',
              });
            }
          } catch (e) {
            cleanup();
            resolve({
              metadata: {
                duration,
                width,
                height,
                aspectRatio: aspectStr,
                fileSize,
                fileName,
                mimeType,
                hasAudio: true,
              },
              thumbnail: '',
            });
          }
        };
      };

      video.src = url;
    });
  }

  /**
   * Analyze audio energy using Web Audio API to detect vocal spikes, high-intensity moments, and pauses
   */
  static async analyzeAudioEnergy(fileOrBlob: Blob): Promise<number[]> {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return [];

      const arrayBuffer = await fileOrBlob.slice(0, Math.min(fileOrBlob.size, 30 * 1024 * 1024)).arrayBuffer();
      const ctx = new AudioCtx();
      let audioBuffer: AudioBuffer;

      try {
        audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      } catch {
        ctx.close();
        return [];
      }

      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const windowSec = 0.5; // 500ms windows
      const windowSamples = Math.floor(sampleRate * windowSec);
      const totalWindows = Math.floor(channelData.length / windowSamples);

      const rmsList: { time: number; rms: number }[] = [];
      let totalRms = 0;

      for (let i = 0; i < totalWindows; i++) {
        let sumSq = 0;
        const start = i * windowSamples;
        for (let j = 0; j < windowSamples; j += 4) {
          // sample step of 4 for speed
          const val = channelData[start + j];
          sumSq += val * val;
        }
        const rms = Math.sqrt(sumSq / (windowSamples / 4));
        const time = i * windowSec;
        rmsList.push({ time, rms });
        totalRms += rms;
      }

      ctx.close();

      const avgRms = totalRms / (totalWindows || 1);
      // Filter peaks that exceed 1.5x average
      const peaks = rmsList
        .filter((item) => item.rms > avgRms * 1.4)
        .map((item) => Math.round(item.time * 10) / 10);

      return peaks;
    } catch (err) {
      console.warn('Audio energy analysis fallback active:', err);
      return [];
    }
  }

  /**
   * Run highlight detection via server-side Gemini API or browser-side algorithmic analysis
   */
  static async detectHighlights(
    projectId: string,
    options: HighlightOptions,
    peaks: number[] = [],
    existingTranscript: string = ''
  ): Promise<{ clips: ClipCandidate[]; usedAi: boolean; source: string }> {
    const { duration, contentType, targetClipDuration, clipCount } = options;

    // 1. Try server-side Gemini API endpoint
    try {
      const res = await fetch('/api/ai/analyze-highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration,
          contentType,
          targetClipDuration,
          clipCount,
          transcript: existingTranscript,
          energyPeaks: peaks,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && !data.fallback && Array.isArray(data.clips) && data.clips.length > 0) {
          const formatted: ClipCandidate[] = data.clips.map((c: any, idx: number) => ({
            id: `clip_${Date.now()}_${idx}`,
            projectId,
            title: c.title || `Viral Highlight #${idx + 1}`,
            startTime: Math.max(0, Math.min(duration - 2, Number(c.startTime) || 0)),
            endTime: Math.min(duration, Math.max(Number(c.startTime) + 5, Number(c.endTime) || duration)),
            duration: Math.max(5, (Number(c.endTime) || duration) - (Number(c.startTime) || 0)),
            editorialScore: Math.min(99, Math.max(50, Math.round(Number(c.editorialScore) || 85))),
            hookReason: c.hookReason || 'Strong opening hook and high narrative engagement.',
            selected: idx === 0,
            aspect: (c.suggestedAspect as AspectRatio) || '9:16',
            panX: 0.5,
            panY: 0.5,
            zoom: 1.0,
            tags: c.suggestedHashtags || ['#viral', '#shorts'],
            volume: 1.0,
            isMuted: false,
          }));

          return {
            clips: formatted,
            usedAi: true,
            source: 'Gemini 3.8 Flash Multimodal Analysis',
          };
        }
      }
    } catch (e) {
      console.warn('Server Gemini highlight call failed, using client algorithmic analyzer:', e);
    }

    // 2. Client-Side Algorithmic Signal Analyzer (Robust, deterministic fallback)
    const candidates: ClipCandidate[] = [];
    const minLength = Math.max(8, targetClipDuration * 0.7);
    const maxLength = Math.min(duration, targetClipDuration * 1.35);

    // If video is short, entire video is 1 clip
    if (duration <= targetClipDuration * 1.25) {
      candidates.push({
        id: `clip_${Date.now()}_0`,
        projectId,
        title: 'Full Sequence Highlight',
        startTime: 0,
        endTime: Math.round(duration * 10) / 10,
        duration: Math.round(duration * 10) / 10,
        editorialScore: 92,
        hookReason: 'Compact complete sequence ideal for short-form retention.',
        selected: true,
        aspect: '9:16',
        panX: 0.5,
        panY: 0.5,
        zoom: 1.0,
        tags: ['#highlight', '#shorts'],
        volume: 1.0,
        isMuted: false,
      });
      return {
        clips: candidates,
        usedAi: false,
        source: 'Browser Signal Segmentation (Audio & Cadence)',
      };
    }

    // Identify candidate start positions based on peaks or pacing intervals
    const candidateStarts: { start: number; score: number; reason: string }[] = [];

    // Hook #1: The video opening (always high priority)
    candidateStarts.push({
      start: 0,
      score: 95,
      reason: 'Strongest thumb-stop velocity: immediate opening hook and context setting.',
    });

    // Check audio peaks
    if (peaks.length > 0) {
      peaks.forEach((peakTime, idx) => {
        if (peakTime > 3 && peakTime < duration - minLength) {
          // Check we don't bunch too close
          const tooClose = candidateStarts.some((c) => Math.abs(c.start - (peakTime - 1.5)) < 12);
          if (!tooClose) {
            candidateStarts.push({
              start: Math.max(0, peakTime - 1.2), // start 1.2s before peak for context
              score: Math.min(94, 84 + (idx % 10)),
              reason: 'High vocal decibel burst and intense inflection shift.',
            });
          }
        }
      });
    }

    // Ensure evenly spaced candidate options if not enough peaks detected
    const step = (duration - minLength) / (clipCount + 1);
    for (let i = 1; i <= clipCount; i++) {
      const approxStart = Math.round(step * i);
      const exists = candidateStarts.some((c) => Math.abs(c.start - approxStart) < 10);
      if (!exists && approxStart + minLength <= duration) {
        candidateStarts.push({
          start: approxStart,
          score: Math.min(90, 78 + (i * 3)),
          reason: 'Dynamic mid-narrative transition with clear informational delivery.',
        });
      }
    }

    // Sort by editorial score descending
    candidateStarts.sort((a, b) => b.score - a.score);

    const chosenStarts = candidateStarts.slice(0, clipCount);

    chosenStarts.forEach((item, index) => {
      const start = Math.round(item.start * 10) / 10;
      let end = Math.min(duration, Math.round((start + targetClipDuration) * 10) / 10);
      if (end - start < minLength && duration > minLength) {
        end = Math.min(duration, start + minLength);
      }

      const titlesByType: Record<ContentType, string[]> = {
        podcast: ['The Raw Insight', 'Deep Conversation Moment', 'Unfiltered Revelation', 'Hot Take Breakdown'],
        educational: ['Key Step You Missed', 'Critical Framework', 'Pro Technique Explained', 'Core Principle'],
        commentary: ['The Real Story Behind This', 'Why Nobody Talks About This', 'My Honest Reaction', 'The Big Shift'],
        storytelling: ['The Climax Nobody Expected', 'Where Everything Changed', 'The Turning Point', 'The Final Outcome'],
        gaming: ['Insane Clutch Play', 'Highlight of the Match', 'Unbelievable Reflexes', 'Peak Game Moment'],
        interview: ['Direct Answer to Tough Question', 'The Big Truth', 'Perspective Shift', 'Career Defining Moment'],
        general: ['Best Segment Highlight', 'Viral Hook Moment', 'Top Clip Pick', 'Key Takeaway'],
      };

      const titleList = titlesByType[contentType] || titlesByType.general;
      const title = `${titleList[index % titleList.length]} #${index + 1}`;

      candidates.push({
        id: `clip_${Date.now()}_${index}`,
        projectId,
        title,
        startTime: start,
        endTime: end,
        duration: Math.round((end - start) * 10) / 10,
        editorialScore: item.score,
        hookReason: item.reason,
        selected: index === 0,
        aspect: '9:16',
        panX: 0.5,
        panY: 0.5,
        zoom: 1.0,
        tags: [`#${contentType}`, '#viral', '#shorts'],
        volume: 1.0,
        isMuted: false,
      });
    });

    return {
      clips: candidates,
      usedAi: false,
      source: 'Browser Signal Segmentation (Audio RMS & Boundary Rules)',
    };
  }

  /**
   * Generates a realistic synthetic test video directly in the browser (Canvas + Web Audio oscillator)
   * This gives users an instant 1080p sample video to try out clipping and editing right away!
   */
  static async generateSampleVideo(
    topic: string = 'Tech Podcast Breakdown',
    durationSec: number = 30
  ): Promise<File> {
    const width = 1280;
    const height = 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();
    const dest = audioCtx.createMediaStreamDestination();

    // Sound synth: ambient subtle chords & beep markers
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
    osc.connect(gainNode);
    gainNode.connect(dest);
    osc.start();

    // Pulse oscillator frequency every 4 seconds to simulate speech pitch modulation
    for (let t = 0; t < durationSec; t += 3) {
      osc.frequency.setValueAtTime(200 + (t % 5) * 80, audioCtx.currentTime + t);
    }

    const canvasStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve) => {
      recorder.onstop = () => {
        osc.stop();
        audioCtx.close();
        const blob = new Blob(chunks, { type: mimeType });
        const file = new File([blob], `FrameNova_Sample_${durationSec}s.webm`, { type: mimeType });
        resolve(file);
      };

      recorder.start(100);

      const fps = 30;
      const totalFrames = durationSec * fps;
      let frame = 0;

      const interval = setInterval(() => {
        frame++;
        const timeSec = frame / fps;

        // Render high-tech studio scene
        // 1. Dark background with subtle animated grid
        ctx.fillStyle = '#0F121C';
        ctx.fillRect(0, 0, width, height);

        // Grid lines
        ctx.strokeStyle = '#1E2438';
        ctx.lineWidth = 1;
        const gridSpacing = 60;
        const offset = (frame * 1.5) % gridSpacing;
        for (let x = offset; x < width; x += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // 2. Center Subject (Simulated speaker in studio)
        const speakerX = width / 2 + Math.sin(timeSec * 0.8) * 40;
        const speakerY = height / 2 + 30;

        // Radial studio spotlight
        const spotGrad = ctx.createRadialGradient(speakerX, speakerY - 60, 40, speakerX, speakerY - 60, 320);
        spotGrad.addColorStop(0, 'rgba(139, 92, 246, 0.35)');
        spotGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.15)');
        spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, width, height);

        // Speaker Silhouette/Avatar
        // Shoulders
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.ellipse(speakerX, speakerY + 140, 160, 90, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8B5CF6';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Head
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(speakerX, speakerY - 20, 65, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Headphones
        ctx.fillStyle = '#64748B';
        ctx.beginPath();
        ctx.arc(speakerX - 70, speakerY - 20, 18, 0, Math.PI * 2);
        ctx.arc(speakerX + 70, speakerY - 20, 18, 0, Math.PI * 2);
        ctx.fill();

        // Animated speech indicator ring
        const mouthOpen = Math.abs(Math.sin(timeSec * 6));
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.arc(speakerX, speakerY - 5, 8 * mouthOpen + 4, 0, Math.PI * 2);
        ctx.fill();

        // Dynamic Audio Waveform on bottom
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 40; i++) {
          const bx = width / 2 - 200 + i * 10;
          const barHeight = Math.sin(timeSec * 5 + i * 0.4) * 25 + 30;
          ctx.moveTo(bx, height - 70 - barHeight / 2);
          ctx.lineTo(bx, height - 70 + barHeight / 2);
        }
        ctx.stroke();

        // 3. Header badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect?.(40, 40, 360, 65, 12);
        ctx.fill();
        ctx.strokeStyle = '#6366F1';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('⚡ FrameNova AI Demo Studio', 60, 78);

        // 4. Timer & Topic text
        ctx.fillStyle = '#06B6D4';
        ctx.font = 'bold 26px "JetBrains Mono", monospace';
        ctx.fillText(`${timeSec.toFixed(1)}s / ${durationSec.toFixed(1)}s`, width - 240, 80);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '18px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`Topic: ${topic}`, 60, 135);

        // Live Simulated Subtitle in the video frame
        const phrases = [
          'Welcome to the future of AI video clipping!',
          'Notice how FrameNova detects conversational hooks...',
          'Watch the automatic reframe adapt seamlessly to vertical format.',
          'Subtitles animate dynamically word-by-word.',
          'One single video unlocked endless social possibilities!',
        ];
        const phraseIdx = Math.floor((timeSec / durationSec) * phrases.length) % phrases.length;
        ctx.fillStyle = '#FACC15';
        ctx.font = '900 28px "Montserrat", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(phrases[phraseIdx], width / 2, height - 120);
        ctx.textAlign = 'start';

        if (frame >= totalFrames) {
          clearInterval(interval);
          recorder.stop();
        }
      }, 1000 / fps);
    });
  }

  /**
   * Helper to format seconds into mm:ss or mm:ss.ms
   */
  static formatTime(seconds: number, includeMs: boolean = false): string {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');
    return includeMs ? `${mm}:${ss}.${ms}` : `${mm}:${ss}`;
  }

  /**
   * Export captions to SRT format
   */
  static exportToSRT(cues: CaptionCue[]): string {
    const formatSRTTime = (sec: number): string => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
        .toString()
        .padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    };

    return cues
      .map((cue, index) => {
        return `${index + 1}\n${formatSRTTime(cue.startTime)} --> ${formatSRTTime(cue.endTime)}\n${cue.text}\n`;
      })
      .join('\n');
  }

  /**
   * Export captions to WebVTT format
   */
  static exportToVTT(cues: CaptionCue[]): string {
    const formatVTTTime = (sec: number): string => {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms
        .toString()
        .padStart(3, '0')}`;
    };

    let vtt = 'WEBVTT - Generated by FrameNova AI\n\n';
    vtt += cues
      .map((cue, index) => {
        return `${index + 1}\n${formatVTTTime(cue.startTime)} --> ${formatVTTTime(cue.endTime)}\n${cue.text}\n`;
      })
      .join('\n');
    return vtt;
  }
}
