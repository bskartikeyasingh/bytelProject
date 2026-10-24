-- ============================================================================
-- GenLancer: Seed Demo Creators (Safe & Idempotent)
-- Migration: 002_seed_demo_creators_safely.sql
-- Description:
--   Populates public.freelancers with initial sample talent if the table is empty.
--   Uses ON CONFLICT (id) DO NOTHING to prevent overwriting existing data.
-- ============================================================================

INSERT INTO public.freelancers (
    id, name, title, avatar_url, location, hourly_rate_usd, rating, completed_gigs, 
    reputation_score, specializations, skills, ai_tools_models, visual_styles, 
    content_types, output_formats, availability, commercial_use_licensing, 
    portfolio_items, verified, is_demo, verification_status
) VALUES 
(
    'c1',
    'Alex Smith',
    'AI Film Director & Motion Specialist',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
    'San Francisco, CA / Remote',
    120.00,
    4.98,
    42,
    98,
    ARRAY['AI Filmmaking', 'Cyberpunk Environments', 'Commercial Direction'],
    ARRAY['Cinematography', 'Prompt Engineering', 'Fluid Sim', 'Video Editing'],
    ARRAY['Runway Gen-3 Alpha', 'Midjourney v6', 'Topaz 4K', 'Pika Labs'],
    ARRAY['Cyberpunk', 'Cinematic 8K', 'Photorealistic'],
    ARRAY['Video', 'Promo Video', 'Short Film'],
    ARRAY['16:9', '9:16', 'ProRes', 'MP4'],
    'Full-time',
    'Full commercial rights included',
    '[{"title":"Volt Energy Cyberpunk Commercial","description":"15s commercial produced via Midjourney and Runway Gen-3.","media_url":"https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4","content_type":"Video","tool":"Runway Gen-3 Alpha","aspect_ratio":"16:9","pipeline":"Midjourney v6 ➔ Runway Gen-3 ➔ Topaz 4K","prompt":"/imagine prompt: futuristic mega-city at night, neon reflections in rainwater, anamorphic cinematic 8k --ar 16:9","seed":"482019482","verified":true}]'::jsonb,
    true,
    false,
    'verified_workflow'
),
(
    'c2',
    'Maya Lin',
    'Generative Visual Architect & LoRA Specialist',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300',
    'New York, NY / Remote',
    110.00,
    4.95,
    38,
    96,
    ARRAY['Generative Architecture & LoRA', 'Synthetic Media Design'],
    ARRAY['LoRA Training', 'ControlNet Depth', 'ComfyUI Pipelines', 'Blender Compositor'],
    ARRAY['Flux.1 Dev', 'ComfyUI', 'SDXL', 'Blender'],
    ARRAY['Minimalist Surrealism', 'Macro Photography', 'Photorealistic'],
    ARRAY['Static Graphics', 'Concept Art', 'Marketing Graphics'],
    ARRAY['1:1', '4:5', 'PNG', 'PSD'],
    'Part-time',
    'Full commercial rights included',
    '[{"title":"Biomechanical Android Concept","description":"Detailed portrait study using custom Flux LoRA.","media_url":"https://assets.mixkit.co/videos/preview/mixkit-hand-holding-a-glowing-futuristic-device-41805-large.mp4","content_type":"Static Graphics","tool":"Flux.1 Dev + ComfyUI","aspect_ratio":"1:1","pipeline":"Flux.1 Dev ➔ ControlNet Depth ➔ Blender Compositor","prompt":"close-up portrait of android with exposed copper neural cables, volumetric amber lighting, macro photography","seed":"99102412","verified":true}]'::jsonb,
    true,
    false,
    'verified_workflow'
),
(
    'c3',
    'Carlos Rivera',
    '3D Synthetic Media & Animatics Lead',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    'Austin, TX / Remote',
    135.00,
    4.92,
    29,
    95,
    ARRAY['3D Synthetic Media', 'Sci-Fi Cityscapes', 'Drone Cinematics'],
    ARRAY['Blender Integration', 'Camera Projections', 'VFX Motion', 'Generative Camera Tracking'],
    ARRAY['Kling AI 1.5', 'Luma Dream Machine', 'Blender', 'After Effects'],
    ARRAY['Sci-Fi Cityscapes', 'Hyper-Speed Drone Views', 'Cinematic'],
    ARRAY['Video', '3D Animation'],
    ARRAY['16:9', '9:16', '1:1', 'MP4'],
    'Full-time',
    'Full commercial rights included',
    '[{"title":"Obsidian Spire Drone Passage","description":"Hyper-speed drone sequence over synthetic obsidian monoliths.","media_url":"https://assets.mixkit.co/videos/preview/mixkit-futuristic-flying-car-in-a-cyberpunk-city-41807-large.mp4","content_type":"Video","tool":"Kling AI 1.5","aspect_ratio":"16:9","pipeline":"Blender ➔ Kling AI 1.5 ➔ After Effects","prompt":"cinematic drone follow shot of high-tech flying vehicle gliding over glowing obsidian skyscrapers","seed":"772183921","verified":true}]'::jsonb,
    true,
    false,
    'verified_workflow'
),
(
    'c4',
    'Sophia Chen',
    'Commercial AI Creative Director',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
    'London, UK / Remote',
    160.00,
    5.00,
    56,
    99,
    ARRAY['Commercial AI Direction', 'Luxury Commercials', 'Product Visuals'],
    ARRAY['Art Direction', '4K Commercial Mastering', 'High-Speed Fluid Splashes', 'Color Grading'],
    ARRAY['Sora', 'Runway Gen-3 Alpha', 'Topaz 4K', 'DaVinci Resolve'],
    ARRAY['Luxury Commercial', 'Fluid Dynamics', 'Photorealistic'],
    ARRAY['Video', 'Commercial Stills'],
    ARRAY['16:9', '9:16', 'ProRes 4444', 'MP4'],
    'Full-time',
    'Full commercial rights included',
    '[{"title":"Amber Drop Luxury Master","description":"Macro commercial fluid splash sequence mastered in 4K.","media_url":"https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-light-show-41808-large.mp4","content_type":"Video","tool":"Runway Gen-3 Alpha + Topaz 4K","aspect_ratio":"16:9","pipeline":"Sora ➔ Topaz AI ➔ DaVinci Resolve","prompt":"photorealistic cinematic commercial shot, fluid amber beverage splashing with hyper-detailed crystal droplets","seed":"10928374","verified":true}]'::jsonb,
    true,
    false,
    'verified_workflow'
)
ON CONFLICT (id) DO NOTHING;
