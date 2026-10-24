// client/src/data/demoUsers.js

/**
 * GenLancer Authoritative Demo Accounts Fixture
 * Matches server database seed records with full credentials and profile metadata.
 */
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
    bio: "Cinematic AI Director & Generative Video Producer.",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=demo_user_101"
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
    bio: "Generative Concept Artist and Fashion Visualist.",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=demo_user_102"
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
    bio: "3D Generative Animator and Motion Graphics Specialist.",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=demo_user_103"
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
    bio: "Architectural & Environment AI Visualizer.",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=demo_user_104"
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
    bio: "Synthetic Voiceover Director & Multimodal Ad Creator.",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=demo_user_105"
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
    bio: "Global digital agency producing beverage campaigns.",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=brand_user_201"
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
    bio: "Next-gen energy beverage expanding globally.",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=brand_user_202"
  }
];

export const DEMO_CREATORS = DEMO_USERS.filter(u => u.role === 'creator');
export const DEMO_BRANDS = DEMO_USERS.filter(u => u.role === 'company');

export function getDemoUserByEmail(email) {
  if (!email) return null;
  return DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export default DEMO_USERS;
