/**
 * Curated High-Resolution Generative AI Media & Poster Presets
 * Ensures zero empty/black video frames across portfolios, modals, and previews.
 */

export const AI_MEDIA_PRESETS = [
  {
    id: 'preset-1',
    tool: 'Runway Gen-3 Alpha',
    category: 'Cyberpunk & Sci-Fi Video',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4',
    prompt: '/imagine prompt: futuristic mega-city at night, neon reflections in rainwater, anamorphic cinematic 8k --ar 16:9',
    pipeline: 'Midjourney v6 ➔ Runway Gen-3 Alpha ➔ Topaz 4K',
    seed: '482019482'
  },
  {
    id: 'preset-2',
    tool: 'Flux.1 Dev + ComfyUI',
    category: 'Synthetic Media & LoRA',
    poster: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-hand-holding-a-glowing-futuristic-device-41805-large.mp4',
    prompt: 'close-up portrait of android with exposed copper neural cables, volumetric amber lighting, macro photography',
    pipeline: 'Flux.1 Dev ➔ ControlNet Depth ➔ Blender Compositor',
    seed: '99102412'
  },
  {
    id: 'preset-3',
    tool: 'Kling AI 1.5 + Blender',
    category: '3D Synthetic & Drone Animatics',
    poster: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-flying-car-in-a-cyberpunk-city-41807-large.mp4',
    prompt: 'cinematic drone follow shot of high-tech flying vehicle gliding over glowing obsidian skyscrapers',
    pipeline: 'Blender ➔ Kling AI 1.5 ➔ After Effects',
    seed: '772183921'
  },
  {
    id: 'preset-4',
    tool: 'Sora + Topaz 4K',
    category: 'Luxury Commercial Fluid Motion',
    poster: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&auto=format&fit=crop&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-light-show-41808-large.mp4',
    prompt: 'photorealistic cinematic commercial shot, fluid amber beverage splashing with hyper-detailed crystal droplets',
    pipeline: 'Sora ➔ Topaz 4K AI ➔ DaVinci Resolve',
    seed: '10928374'
  },
  {
    id: 'preset-5',
    tool: 'ElevenLabs + Suno v3',
    category: 'Neural Voice & Sonic Branding',
    poster: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-soundwaves-in-a-dark-background-41806-large.mp4',
    prompt: 'spatial acoustic soundscape, multi-layered emotive frequencies, immersive binaural sonic architecture',
    pipeline: 'ElevenLabs Studio ➔ Suno v3 ➔ Logic Pro X Master',
    seed: '55192019'
  },
  {
    id: 'preset-6',
    tool: 'Midjourney v6 + Magnific AI',
    category: 'Autonomous Product & Brand Visuals',
    poster: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&auto=format&fit=crop&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-liquid-colors-rotating-41809-large.mp4',
    prompt: 'high fashion avant-garde editorial, iridescent textile physics, organic architectural silhouette, Hasselblad 100MP',
    pipeline: 'Midjourney v6 ➔ Magnific AI ➔ Spline 3D',
    seed: '30491823'
  }
];

export const DEFAULT_POSTER = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80';

/**
 * Determine if a URL is likely a video based on file extension or known video CDNs
 */
export function isLikelyVideo(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v') ||
    lower.includes('mixkit.co/videos') ||
    lower.includes('/video/')
  );
}

/**
 * Resolve an authoritative, guaranteed non-empty poster URL for any portfolio item or video
 */
export function resolvePoster(itemOrUrl, tool = '', fallbackIndex = 0) {
  if (typeof itemOrUrl === 'object' && itemOrUrl !== null) {
    if (itemOrUrl.poster) return itemOrUrl.poster;
    if (itemOrUrl.thumbnail_url) return itemOrUrl.thumbnail_url;
    if (itemOrUrl.thumbnail) return itemOrUrl.thumbnail;
    if (itemOrUrl.media_url && !isLikelyVideo(itemOrUrl.media_url)) return itemOrUrl.media_url;
    if (itemOrUrl.mediaUrl && !isLikelyVideo(itemOrUrl.mediaUrl)) return itemOrUrl.mediaUrl;
    
    // Match based on tool
    const itemTool = (itemOrUrl.tool || itemOrUrl.tools_used?.[0] || tool || '').toLowerCase();
    const matched = AI_MEDIA_PRESETS.find(p => p.tool.toLowerCase().includes(itemTool) || itemTool.includes(p.tool.toLowerCase().split(' ')[0]));
    if (matched) return matched.poster;
  } else if (typeof itemOrUrl === 'string' && itemOrUrl.trim()) {
    if (!isLikelyVideo(itemOrUrl) && (itemOrUrl.startsWith('http://') || itemOrUrl.startsWith('https://'))) {
      return itemOrUrl;
    }
  }

  // Fallback to indexed preset
  const preset = AI_MEDIA_PRESETS[Math.abs(fallbackIndex) % AI_MEDIA_PRESETS.length];
  return preset?.poster || DEFAULT_POSTER;
}
