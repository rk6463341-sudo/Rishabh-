import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Lazy/Safe Gemini initialization
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

// 1. Health & Config status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    appName: 'FrameNova AI',
    timestamp: new Date().toISOString(),
  });
});

// 2. AI Video Highlight Analysis
app.post('/api/ai/analyze-highlights', async (req, res) => {
  try {
    const {
      duration = 60,
      contentType = 'general',
      targetClipDuration = 30,
      clipCount = 4,
      transcript = '',
      energyPeaks = [],
    } = req.body;

    // If Gemini is not configured, inform client so it uses the robust local browser signal analyzer
    if (!ai) {
      return res.status(200).json({
        fallback: true,
        reason: 'Gemini API key not configured. Using client-side audio energy & segment analysis.',
        clips: null,
      });
    }

    const prompt = `You are an elite short-form video editor for TikTok, YouTube Shorts, and Instagram Reels.
Analyze this video data to select the top ${clipCount} most engaging, high-retention candidate clips.

Video Parameters:
- Total Duration: ${duration.toFixed(1)} seconds
- Content Type: ${contentType}
- Target Clip Length: ~${targetClipDuration} seconds (acceptable range: 10s to ${Math.min(90, Math.max(20, targetClipDuration * 1.5))}s)
${transcript ? `- Detected Speech/Transcript: "${transcript.slice(0, 4000)}"` : '- Transcript: Not provided (use audio peaks and pacing)'}
${energyPeaks.length > 0 ? `- Audio Energy Peaks (seconds): ${JSON.stringify(energyPeaks.slice(0, 15))}` : ''}

Selection Criteria:
1. Strong Opening Hook: The first 3 seconds must immediately grab attention or pose a compelling question.
2. Emotional or Informative Payoff: The segment must deliver a punchy takeaway or climax.
3. Coherent boundaries: Never cut mid-sentence or mid-thought.
4. Editorial Quality Score (0-100): Rate viral retention potential honestly based on hook strength, clarity, and pacing.

Provide candidate clips within [0, ${duration.toFixed(1)}] with start, end, title, reason, score, and key topics.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Punchy catchy title for social media' },
              startTime: { type: Type.NUMBER, description: 'Clip start time in seconds' },
              endTime: { type: Type.NUMBER, description: 'Clip end time in seconds' },
              editorialScore: { type: Type.NUMBER, description: 'Estimated editorial quality score from 50 to 99' },
              hookReason: { type: Type.STRING, description: 'Why this moment makes an effective hook' },
              suggestedAspect: { type: Type.STRING, description: 'e.g. 9:16 or 1:1' },
              suggestedHashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['title', 'startTime', 'endTime', 'editorialScore', 'hookReason'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    return res.json({
      fallback: false,
      clips: parsed,
    });
  } catch (error: any) {
    console.error('Error analyzing video highlights with Gemini:', error);
    return res.status(200).json({
      fallback: true,
      error: error.message || 'Gemini analysis failed. Using browser fallback.',
      clips: null,
    });
  }
});

// 3. AI Social Media Planner & Caption Generator
app.post('/api/ai/social-planner', async (req, res) => {
  try {
    const { title, clipDuration, context = '', platform = 'all' } = req.body;

    if (!ai) {
      return res.json({
        fallback: true,
        data: {
          hookVariations: [
            `Stop scrolling if you want to know about ${title || 'this'}!`,
            `The truth about ${title || 'this video'} nobody is talking about...`,
            `Here is why ${title || 'this clip'} changed everything:`,
          ],
          captions: {
            youtube: `Watch this full breakdown! 🔥 Like & Subscribe for more daily insights. #${title?.replace(/\s+/g, '') || 'shorts'} #viral #trending`,
            instagram: `Save this for later! 📌 Double tap if this resonated with you. What do you think in the comments below? 👇`,
            tiktok: `Wait until the end... 🤯 Drop your thoughts below! #fyp #foryou #viral #trending`,
            x: `Key takeaway from today: ${title || 'Watch this breakdown'}. What are your thoughts? 🧵👇`,
          },
          hashtags: ['#viral', '#shorts', '#reels', '#trending', '#contentcreator', '#framenova'],
          bestPostingTime: '12:00 PM - 3:00 PM or 7:00 PM - 9:00 PM (Peak audience activity)',
        },
      });
    }

    const prompt = `Generate high-converting social media metadata for a short-form video clip titled "${title}" (${clipDuration}s). Context: "${context}". Target platform: ${platform}.
Include:
- 3 punchy, curiosity-driven viral hook variations
- Platform-optimized captions for YouTube Shorts, Instagram Reels, TikTok, and X
- High-relevance hashtags (5-8 tags)
- Recommended posting time slot advice`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hookVariations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            captions: {
              type: Type.OBJECT,
              properties: {
                youtube: { type: Type.STRING },
                instagram: { type: Type.STRING },
                tiktok: { type: Type.STRING },
                x: { type: Type.STRING },
              },
              required: ['youtube', 'instagram', 'tiktok', 'x'],
            },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            bestPostingTime: { type: Type.STRING },
          },
          required: ['hookVariations', 'captions', 'hashtags', 'bestPostingTime'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ fallback: false, data: parsed });
  } catch (error: any) {
    console.error('Error generating social plan:', error);
    return res.json({
      fallback: true,
      error: error.message,
      data: null,
    });
  }
});

// Vite Middleware integration for dev / static for prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FrameNova Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
