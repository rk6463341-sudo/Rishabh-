import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Sparkles,
  Copy,
  Check,
  Share2,
  Clock,
  Plus,
  Trash2,
  ListChecks,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { Project, SocialPost, ClipCandidate } from '../types';
import { storage } from '../services/storage';

interface SocialPlannerViewProps {
  project: Project | null;
  scheduledClip?: ClipCandidate | null;
}

export const SocialPlannerView: React.FC<SocialPlannerViewProps> = ({
  project,
  scheduledClip,
}) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'youtube' | 'instagram' | 'tiktok' | 'x'>('all');
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // New post draft form state
  const [postTitle, setPostTitle] = useState(scheduledClip?.title || '');
  const [postCaption, setPostCaption] = useState('');
  const [postPlatform, setPostPlatform] = useState<SocialPost['platform']>('youtube');
  const [postDate, setPostDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [aiSuggestions, setAiSuggestions] = useState<{
    hooks: string[];
    captions: Record<string, string>;
    hashtags: string[];
    bestTime: string;
  } | null>(null);

  useEffect(() => {
    storage.getSocialPosts().then(setPosts);
  }, []);

  useEffect(() => {
    if (scheduledClip) {
      setPostTitle(scheduledClip.title);
      handleGenerateHooks(scheduledClip.title, scheduledClip.duration);
    }
  }, [scheduledClip]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleGenerateHooks = async (title: string, duration: number = 30) => {
    if (!title) return;
    setIsGeneratingHooks(true);
    try {
      const res = await fetch('/api/ai/social-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          clipDuration: duration,
          context: project?.name || '',
          platform: postPlatform,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setAiSuggestions({
            hooks: json.data.hookVariations || [],
            captions: json.data.captions || {},
            hashtags: json.data.hashtags || [],
            bestTime: json.data.bestPostingTime || '12:00 PM - 3:00 PM',
          });

          // Autofill caption for chosen platform
          if (json.data.captions && json.data.captions[postPlatform]) {
            setPostCaption(json.data.captions[postPlatform]);
          }
        }
      }
    } catch (e) {
      console.warn('AI hook generator fallback:', e);
    } finally {
      setIsGeneratingHooks(false);
    }
  };

  const handleSavePost = async () => {
    if (!postTitle.trim()) return;
    const newPost: SocialPost = {
      id: `post_${Date.now()}`,
      projectId: project?.id || 'general',
      clipId: scheduledClip?.id,
      platform: postPlatform,
      title: postTitle,
      caption: postCaption,
      hashtags: aiSuggestions?.hashtags || ['#shorts', '#viral', '#trending'],
      scheduledDate: postDate,
      status: 'ready',
    };

    await storage.saveSocialPost(newPost);
    const updated = await storage.getSocialPosts();
    setPosts(updated);
    setPostTitle('');
    setPostCaption('');
  };

  const handleDeletePost = async (id: string) => {
    await storage.deleteSocialPost(id);
    setPosts(posts.filter((p) => p.id !== id));
  };

  const filteredPosts =
    selectedPlatform === 'all'
      ? posts
      : posts.filter((p) => p.platform === selectedPlatform);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121520] border border-[#1E2333]">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-violet-400" />
            <span>Social Media Distribution Planner</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate high-converting viral hooks, platform-optimized captions, hashtags, and schedule your release queue.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Hook & Post Composer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>AI Viral Hook & Caption Composer</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Video Clip Title / Core Theme
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="e.g. Why Most People Fail At AI Video Editing"
                    className="flex-1 bg-[#0B0D13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={() => handleGenerateHooks(postTitle)}
                    disabled={isGeneratingHooks || !postTitle}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition shadow-md disabled:opacity-40"
                  >
                    {isGeneratingHooks ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>Generate AI Hooks</span>
                  </button>
                </div>
              </div>

              {/* AI Hook Variations Selector */}
              {aiSuggestions && aiSuggestions.hooks.length > 0 && (
                <div className="p-3 rounded-xl bg-[#0E111A] border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    Thumb-Stopping Viral Hooks (Click to use)
                  </span>
                  <div className="space-y-1.5">
                    {aiSuggestions.hooks.map((hook, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setPostTitle(hook);
                          setPostCaption(`${hook}\n\n${postCaption}`);
                        }}
                        className="w-full text-left p-2 rounded-lg bg-[#141824] hover:bg-[#1A2030] text-xs text-slate-200 transition border border-slate-800/80 flex items-center justify-between group"
                      >
                        <span className="truncate pr-2">"{hook}"</span>
                        <Copy className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Platform Selector */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {(['youtube', 'instagram', 'tiktok', 'x'] as const).map((plat) => (
                  <button
                    key={plat}
                    onClick={() => {
                      setPostPlatform(plat);
                      if (aiSuggestions?.captions[plat]) {
                        setPostCaption(aiSuggestions.captions[plat]);
                      }
                    }}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition border ${
                      postPlatform === plat
                        ? 'border-violet-500 bg-violet-950/40 text-violet-200 shadow'
                        : 'border-slate-800 bg-[#0B0D13] text-slate-400 hover:text-white'
                    }`}
                  >
                    {plat === 'youtube'
                      ? 'Shorts'
                      : plat === 'instagram'
                      ? 'Reels'
                      : plat === 'tiktok'
                      ? 'TikTok'
                      : 'X / Twitter'}
                  </button>
                ))}
              </div>

              {/* Caption body textarea */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1">
                  <span>Caption & Description</span>
                  <button
                    onClick={() => handleCopy(postCaption, 'caption_draft')}
                    className="text-violet-400 hover:text-violet-300 flex items-center gap-1 text-[11px]"
                  >
                    {copiedField === 'caption_draft' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedField === 'caption_draft' ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Write your video description, call-to-action, or let AI generate it..."
                  className="w-full bg-[#0B0D13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-violet-500"
                />
              </div>

              {/* Hashtag Suggestions */}
              {aiSuggestions?.hashtags && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {aiSuggestions.hashtags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setPostCaption((prev) => `${prev} ${tag}`)}
                      className="px-2 py-0.5 rounded-md bg-[#161B29] hover:bg-[#1E2538] text-[11px] font-mono text-cyan-300 border border-slate-800"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Schedule Date & Save to Queue */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="date"
                  value={postDate}
                  onChange={(e) => setPostDate(e.target.value)}
                  className="bg-[#0B0D13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                />
                <button
                  onClick={handleSavePost}
                  disabled={!postTitle.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-violet-950 transition disabled:opacity-40"
                >
                  Save to Schedule Queue
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Distribution Schedule Queue & Checklist (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Optimal Posting Checklist */}
          <div className="p-4 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <ListChecks className="w-4 h-4 text-emerald-400" />
              <span>Posting Checklist & Best Times</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-2.5 rounded-xl bg-[#0E111A] border border-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Peak Window:</strong> {aiSuggestions?.bestTime || '12:00 PM - 3:00 PM or 7:00 PM - 9:00 PM'}
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc pl-4">
                <li>Verify vertical safe zones: bottom 20% clear of UI buttons</li>
                <li>First 2.5 seconds must feature immediate vocal or visual motion</li>
                <li>Add keyword tags to both title and description</li>
              </ul>
            </div>
          </div>

          {/* Scheduled Posts Queue */}
          <div className="p-4 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Distribution Queue ({filteredPosts.length})
              </h4>
              <div className="flex gap-1">
                {(['all', 'youtube', 'tiktok', 'instagram'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPlatform(p)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                      selectedPlatform === p ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {filteredPosts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No scheduled posts yet. Fill out the composer on the left to queue content.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3 rounded-xl bg-[#0E111A] border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-violet-950 text-violet-300 border border-violet-800">
                        {post.platform}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {post.scheduledDate}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold text-white line-clamp-1">{post.title}</h5>

                    <p className="text-[11px] text-slate-400 line-clamp-2">{post.caption}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => handleCopy(`${post.title}\n\n${post.caption}`, post.id)}
                        className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        {copiedField === post.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedField === post.id ? 'Copied!' : 'Copy Payload'}</span>
                      </button>

                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
