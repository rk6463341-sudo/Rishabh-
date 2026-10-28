export type AspectRatio = '9:16' | '1:1' | '16:9' | '4:5';

export type ContentType =
  | 'general'
  | 'podcast'
  | 'educational'
  | 'commentary'
  | 'storytelling'
  | 'gaming'
  | 'interview';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  fileSize: number;
  fileName: string;
  mimeType: string;
  hasAudio: boolean;
  thumbnail?: string;
}

export interface CaptionWord {
  word: string;
  startTime: number;
  endTime: number;
}

export interface CaptionCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  words?: CaptionWord[];
}

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number; // in pt/px relative to 1080p
  fontWeight: string;
  textColor: string;
  highlightColor: string;
  outlineColor: string;
  outlineWidth: number;
  bgColor: string;
  bgOpacity: number;
  position: 'top' | 'middle' | 'bottom';
  yPercent: number; // 0 to 100
  textTransform: 'uppercase' | 'none';
  shadow: boolean;
  boxPadding: number;
  borderRadius: number;
}

export interface ClipCandidate {
  id: string;
  projectId: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  editorialScore: number; // 50 to 99
  hookReason: string;
  selected: boolean;
  aspect: AspectRatio;
  panX: number; // 0.0 to 1.0 (0.5 is center)
  panY: number; // 0.0 to 1.0 (0.5 is center)
  zoom: number; // 1.0 to 2.0
  tags: string[];
  captions?: CaptionCue[];
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
}

export interface BrandKit {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontTitle: string;
  fontBody: string;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  captionStyle: CaptionStyle;
}

export interface SocialPost {
  id: string;
  projectId: string;
  clipId?: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'x';
  title: string;
  caption: string;
  hashtags: string[];
  scheduledDate?: string;
  status: 'draft' | 'ready' | 'posted';
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  metadata: VideoMetadata;
  videoUrl?: string; // Blob or Object URL in memory
  videoDataKey?: string; // Key in IndexedDB if stored as blob
  clips: ClipCandidate[];
  captions: CaptionCue[];
  activeClipId?: string;
  brandKitId?: string;
  selectedTemplateId?: string;
}

export interface ExportJob {
  id: string;
  clipId: string;
  clipTitle: string;
  aspect: AspectRatio;
  status: 'idle' | 'rendering' | 'completed' | 'failed';
  progress: number; // 0 to 100
  downloadUrl?: string;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
  fileSizeBytes?: number;
}

export interface AppSettings {
  defaultAspect: AspectRatio;
  defaultClipDuration: number;
  defaultContentType: ContentType;
  exportResolution: '1080p' | '720p';
  exportFps: 30 | 60;
  exportFormat: 'webm' | 'mp4';
  burnSubtitlesByDefault: boolean;
  autoTranscribeOnImport: boolean;
}
