// server/scripts/seedDatabase.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env if available
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be configured in server/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export const DEMO_USERS = [
  { 
    id: "demo_user_101", 
    email: "aarav@genlancer.demo", 
    password: "Aarav@123",
    role: "creator", 
    name: "Aarav Sharma", 
    specialization: "AI Filmmaking & Commercial Video", 
    skills: ["Prompt Engineering", "Camera Motion Control", "Video Synthesis"], 
    tools: ["Runway Gen-3 Alpha", "Midjourney v6", "Kling AI"], 
    score: 96, 
    hourly: 95, 
    verified: true, 
    bio: "Cinematic AI Director & Generative Video Producer." 
  },
  { 
    id: "demo_user_102", 
    email: "nisha@genlancer.demo", 
    password: "Nisha@123",
    role: "creator", 
    name: "Nisha Patel", 
    specialization: "Generative Fashion & Brand Identity", 
    skills: ["LoRA Training", "ControlNet Composition", "Texture Synthesis"], 
    tools: ["Flux.1 Pro", "ComfyUI", "Stable Diffusion XL"], 
    score: 94, 
    hourly: 85, 
    verified: true, 
    bio: "Generative Concept Artist and Fashion Visualist." 
  },
  { 
    id: "demo_user_103", 
    email: "rohan@genlancer.demo", 
    password: "Rohan@123",
    role: "creator", 
    name: "Rohan Mehta", 
    specialization: "3D Motion & Generative VFX", 
    skills: ["3D Gaussian Splatting", "AnimateDiff", "Sound Sync"], 
    tools: ["Luma Dream Machine", "ComfyUI", "Suno AI"], 
    score: 91, 
    hourly: 75, 
    verified: true, 
    bio: "3D Generative Animator and Motion Graphics Specialist." 
  },
  { 
    id: "demo_user_104", 
    email: "priya@genlancer.demo", 
    password: "Priya@123",
    role: "creator", 
    name: "Priya Nair", 
    specialization: "Architectural AI & Spatial Design", 
    skills: ["DepthMap ControlNet", "Inpainting/Outpainting", "Lighting Simulation"], 
    tools: ["Midjourney v6", "Magnific AI", "Stable Diffusion XL"], 
    score: 89, 
    hourly: 70, 
    verified: false, 
    bio: "Architectural & Environment AI Visualizer." 
  },
  { 
    id: "demo_user_105", 
    email: "ethan@genlancer.demo", 
    password: "Ethan@123",
    role: "creator", 
    name: "Ethan Brooks", 
    specialization: "Multimodal AI Commercials", 
    skills: ["Voice Cloning", "Lip-Sync Animation", "Multi-Language Localization"], 
    tools: ["ElevenLabs", "HeyGen", "Flux.1 Schnell"], 
    score: 92, 
    hourly: 80, 
    verified: true, 
    bio: "Synthetic Voiceover Director & Multimodal Ad Creator." 
  },
  { 
    id: "brand_user_201", 
    email: "apex@brand.demo", 
    password: "Apex@123",
    role: "company", 
    name: "Apex Media Studios", 
    specialization: "Brand Agency", 
    skills: ["Campaign Briefing"], 
    tools: ["GenLancer Brief Builder"], 
    score: 0, 
    hourly: 0, 
    verified: true, 
    bio: "Global digital agency producing beverage campaigns." 
  },
  { 
    id: "brand_user_202", 
    email: "veloce@brand.demo", 
    password: "Veloce@123",
    role: "company", 
    name: "Veloce Energy", 
    specialization: "Consumer Brand", 
    skills: ["Commercial Licensing"], 
    tools: ["GenLancer Brief Builder"], 
    score: 0, 
    hourly: 0, 
    verified: true, 
    bio: "Next-gen energy beverage expanding globally." 
  }
];

export const PORTFOLIOS = [
  { 
    creator_id: "demo_user_101", 
    title: "Cyberpunk Neon Street Chase", 
    media_url: "https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-vehicles-41551-large.mp4", 
    thumbnail_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop", 
    media_type: "video", 
    model_used: "Runway Gen-3 + Kling AI", 
    prompt_summary: "Cinematic 35mm anamorphic drone shot." 
  },
  { 
    creator_id: "demo_user_101", 
    title: "Luxury Mineral Water Commercial", 
    media_url: "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=800&auto=format&fit=crop", 
    thumbnail_url: "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=800&auto=format&fit=crop", 
    media_type: "image", 
    model_used: "Flux.1 Pro + ComfyUI", 
    prompt_summary: "Suspended crystalline water droplets around an ice-carved glass bottle." 
  },
  { 
    creator_id: "demo_user_102", 
    title: "Haute Couture Bioluminescent Collection", 
    media_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop", 
    thumbnail_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop", 
    media_type: "image", 
    model_used: "Midjourney v6 + Custom LoRA", 
    prompt_summary: "Avant-garde haute couture, bioluminescent spun silk gown." 
  },
  { 
    creator_id: "demo_user_103", 
    title: "Zero-G Kinetic Geometry", 
    media_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop", 
    thumbnail_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop", 
    media_type: "image", 
    model_used: "ComfyUI + AnimateDiff", 
    prompt_summary: "Abstract chrome torus floating in fluid zero-gravity dynamics." 
  },
  { 
    creator_id: "demo_user_104", 
    title: "Minimalist Eco-Resort Interior", 
    media_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop", 
    thumbnail_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop", 
    media_type: "image", 
    model_used: "Stable Diffusion XL + ControlNet", 
    prompt_summary: "Brutalist concrete framed with warm cedar timber." 
  },
  { 
    creator_id: "demo_user_105", 
    title: "Global Multilingual App Promo", 
    media_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop", 
    thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop", 
    media_type: "image", 
    model_used: "ElevenLabs + HeyGen AI", 
    prompt_summary: "Split-screen tech advertisement featuring localized AI avatar presenters." 
  }
];

export async function seed() {
  console.log("=================================================");
  console.log("🧹 PURGING LEGACY RECORDS ACROSS SUPABASE TABLES");
  console.log("=================================================");

  // 1. Purge child tables first to respect foreign key constraints
  try {
    await supabase.from('messages').delete().neq('message_id', '00000000-0000-0000-0000-000000000000');
    console.log("✓ Cleared messages table");
  } catch (e) {
    try { 
      await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
      console.log("✓ Cleared messages table");
    } catch (_) {}
  }

  try {
    await supabase.from('collaboration_requests').delete().neq('request_id', '00000000-0000-0000-0000-000000000000');
    console.log("✓ Cleared collaboration_requests table");
  } catch (_) {}

  try {
    await supabase.from('collaborations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("✓ Cleared collaborations table");
  } catch (_) {}

  try {
    await supabase.from('briefs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("✓ Cleared briefs table");
  } catch (_) {}

  try {
    await supabase.from('portfolios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("✓ Cleared portfolios table");
  } catch (_) {}

  try {
    await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("✓ Cleared profiles table");
  } catch (_) {}

  try {
    await supabase.from('freelancers').delete().neq('id', '');
    console.log("✓ Cleared freelancers table");
  } catch (_) {}

  console.log("\n=================================================");
  console.log("🌱 INSERTING FRESH USER PROFILES");
  console.log("=================================================");

  for (const user of DEMO_USERS) {
    // A. Upsert into 'profiles' table
    try {
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: user.name,
        role: user.role,
        bio: user.bio,
        specialization: user.specialization,
        skills: user.skills,
        tools: user.tools,
        ai_score: user.score,
        is_verified: user.verified,
        hourly_rate: user.hourly
      });

      if (!profileErr) {
        console.log(`✓ Seeded profile: ${user.name} (${user.role})`);
      } else if (!profileErr.message.includes('schema cache')) {
        console.warn(`Notice on profiles for ${user.name}:`, profileErr.message);
      }
    } catch (_) {}

    // B. Dual-sync to 'freelancers' table for creators to guarantee live directory integration
    if (user.role === 'creator') {
      const creatorPortfolios = PORTFOLIOS
        .filter(p => p.creator_id === user.id)
        .map((p, idx) => ({
          id: `pf-${user.id}-${idx + 1}`,
          title: p.title,
          media_url: p.media_url,
          mediaUrl: p.media_url,
          thumbnail_url: p.thumbnail_url,
          thumbnailUrl: p.thumbnail_url,
          media_type: p.media_type,
          mediaType: p.media_type,
          model_used: p.model_used,
          modelUsed: p.model_used,
          prompt_summary: p.prompt_summary,
          promptSummary: p.prompt_summary,
          created_at: new Date().toISOString()
        }));

      const flPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        hourly_rate_usd: user.hourly,
        skills: user.skills,
        portfolio_items: creatorPortfolios,
        availability: 'Available',
        ai_tools_models: user.tools,
        commercial_use_licensing: 'Full commercial rights included',
        specializations: [user.specialization],
        content_types: creatorPortfolios.map(p => p.media_type === 'video' ? 'Video' : 'Static Graphics'),
        visual_styles: ['Cinematic', 'Hyperrealistic'],
        output_formats: ['MP4 4K', 'PNG 8K']
      };

      try {
        const { error: flErr } = await supabase.from('freelancers').upsert(flPayload);
        if (!flErr) {
          console.log(`✓ Synced talent directory: ${user.name} (Score: ${user.score})`);
        } else {
          console.warn(`Notice on freelancers for ${user.name}:`, flErr.message);
        }
      } catch (flErr) {
        console.warn(`Freelancers sync exception for ${user.name}:`, flErr.message);
      }
    }
  }

  console.log("\n=================================================");
  console.log("🎨 INSERTING PORTFOLIO ARTIFACTS WITH VISUAL POSTERS");
  console.log("=================================================");

  for (const item of PORTFOLIOS) {
    try {
      const { error: portErr } = await supabase.from('portfolios').insert(item);
      if (!portErr) {
        console.log(`✓ Seeded portfolio artifact: ${item.title} (${item.media_type})`);
      } else if (!portErr.message.includes('schema cache')) {
        console.warn(`Notice on portfolios for ${item.title}:`, portErr.message);
      }
    } catch (_) {}
  }

  // 3. Provision Supabase Auth accounts for instant password sign-in
  console.log("\n=================================================");
  console.log("🔐 PROVISIONING SUPABASE AUTH CREDENTIALS");
  console.log("=================================================");

  try {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    for (const user of DEMO_USERS) {
      const existing = users?.find(u => u.email.toLowerCase() === user.email.toLowerCase());
      const metadata = {
        full_name: user.name,
        role: user.role === 'company' ? 'company' : 'freelancer',
        specialization: user.specialization
      };

      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, {
          password: user.password,
          email_confirm: true,
          user_metadata: metadata,
          app_metadata: { role: metadata.role, provider: 'email' }
        });
        console.log(`✓ Updated Supabase Auth credentials for ${user.email} (Password: ${user.password})`);
      } else {
        await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: metadata,
          app_metadata: { role: metadata.role, provider: 'email' }
        });
        console.log(`✓ Created Supabase Auth account for ${user.email} (Password: ${user.password})`);
      }
    }
  } catch (authErr) {
    console.warn('Supabase Auth provisioning note:', authErr.message);
  }

  console.log("\n=================================================");
  console.log("✅ SEED COMPLETED SUCCESSFULLY!");
  console.log("Database is fresh, synced, and error-free.");
  console.log("=================================================");
}

// Auto-run if executed directly via node
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal seed failure:', err);
      process.exit(1);
    });
}
