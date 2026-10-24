import { GoogleGenerativeAI } from '@google/generative-ai';
import searchService from './searchService.js';

/**
 * AI Campaign Brief Service
 * Handles AI-assisted brief creation, section regeneration, deterministic fallback,
 * semantic completeness evaluation, clarification questions, field source attribution,
 * and strict normalization/validation for creator discovery.
 */
class BriefService {
  constructor() {
    this.requiredFieldsWeight = {
      goal: 15,
      product_service: 10,
      target_audience: 10,
      required_skills: 10,
      deliverables: 15,
      budget: 15,
      timeline: 10,
      style_tone: 10,
      tools: 5
    };
  }

  /**
   * Evaluates semantic completeness across the 9 core campaign dimensions.
   * Returns a score [0-100], missing fields list, and targeted clarification questions.
   */
  evaluateCompleteness(briefData = {}, rawPrompt = '') {
    const text = String(rawPrompt || '').toLowerCase();
    const scores = {};
    const missing = [];
    const questions = [];

    // 1. Goal / Title (15%)
    const goalVal = briefData.goal || briefData.title || briefData.project_title || '';
    if (typeof goalVal === 'string' && goalVal.trim().length >= 4) {
      scores.goal = this.requiredFieldsWeight.goal;
    } else {
      scores.goal = 0;
      missing.push({
        field: 'goal',
        label: 'Campaign Goal / Title',
        severity: 'critical'
      });
      questions.push('What is the core objective or title of this campaign?');
    }

    // 2. Product / Service (10%)
    const prodVal = briefData.product_service || briefData.product || '';
    if (typeof prodVal === 'string' && prodVal.trim().length >= 3) {
      scores.product_service = this.requiredFieldsWeight.product_service;
    } else {
      scores.product_service = 0;
      missing.push({
        field: 'product_service',
        label: 'Product or Service Details',
        severity: 'medium'
      });
      questions.push('What specific product, service, or offering is being featured?');
    }

    // 3. Target Audience (10%)
    let audStr = '';
    if (typeof briefData.target_audience === 'string') audStr = briefData.target_audience;
    else if (typeof briefData.targetAudience === 'object' && briefData.targetAudience !== null) {
      audStr = briefData.targetAudience.primaryAudience || briefData.targetAudience.demographics || '';
    } else if (typeof briefData.target_audience === 'object' && briefData.target_audience !== null) {
      audStr = briefData.target_audience.primaryAudience || briefData.target_audience.demographics || '';
    }
    if (audStr.trim().length >= 5) {
      scores.target_audience = this.requiredFieldsWeight.target_audience;
    } else {
      scores.target_audience = 0;
      missing.push({
        field: 'target_audience',
        label: 'Target Audience Profile',
        severity: 'medium'
      });
      questions.push('Who is your target audience (e.g. demographic, interests, or consumer pain points)?');
    }

    // 4. Required Skills & Niche (10%)
    const skills = briefData.required_skills || briefData.skills || [];
    if (Array.isArray(skills) && skills.length > 0) {
      scores.required_skills = this.requiredFieldsWeight.required_skills;
    } else {
      scores.required_skills = 0;
      missing.push({
        field: 'required_skills',
        label: 'Required Creator Skills',
        severity: 'medium'
      });
      questions.push('What specific creator capabilities do you need (e.g. Cinematography, Prompt Engineering, Fluid Sim)?');
    }

    // 5. Deliverables & Content Formats (15%)
    let delivVal = briefData.deliverables || briefData.keyDeliverables || [];
    const delivCount = Array.isArray(delivVal) ? delivVal.length : (delivVal.trim ? (delivVal.trim().length > 3 ? 1 : 0) : 0);
    const aspectVal = briefData.aspect_ratio || briefData.aspectRatio || briefData.output_format || '';
    if (delivCount > 0 && aspectVal) {
      scores.deliverables = this.requiredFieldsWeight.deliverables;
    } else if (delivCount > 0) {
      scores.deliverables = Math.round(this.requiredFieldsWeight.deliverables * 0.7);
      missing.push({
        field: 'content_formats',
        label: 'Target Aspect Ratio / Format',
        severity: 'medium'
      });
      questions.push('Which aspect ratio or output resolution do you need (16:9 Widescreen, 9:16 Vertical, or 1:1)?');
    } else {
      scores.deliverables = 0;
      missing.push({
        field: 'deliverables',
        label: 'Deliverables List',
        severity: 'critical'
      });
      questions.push('What exact final assets and deliverables are required (e.g. 3x 15s 4K video ads)?');
    }

    // 6. Budget Range (15%)
    const bStr = String(briefData.budget || briefData.budget_range?.formatted || briefData.max_budget || '').trim();
    const hasBudgetNum = /\d+/.test(bStr);
    const hasPromptBudget = /\$|\bbudget\b|\bescrow\b|\bcost\b/i.test(text);
    const isBudgetSupplied = hasBudgetNum && (!rawPrompt || hasPromptBudget || briefData.field_sources?.budget === 'user_provided');
    if (isBudgetSupplied) {
      scores.budget = this.requiredFieldsWeight.budget;
    } else {
      scores.budget = 0;
      missing.push({
        field: 'budget',
        label: 'Budget Range / Escrow Cap',
        severity: 'critical'
      });
      questions.push('What is your allocated budget range or escrow cap for this campaign?');
    }

    // 7. Timeline & Deadline (10%)
    const timeVal = String(briefData.timeline || briefData.deadline || '').trim();
    const hasPromptTimeline = /\bdeadline\b|\bby\b|\bdeliver\b|\bweek\b|\bmonth\b|\bdays\b/i.test(text);
    const isTimelineSupplied = timeVal.length >= 3 && (!rawPrompt || hasPromptTimeline || briefData.field_sources?.timeline === 'user_provided');
    if (isTimelineSupplied) {
      scores.timeline = this.requiredFieldsWeight.timeline;
    } else {
      scores.timeline = 0;
      missing.push({
        field: 'timeline',
        label: 'Delivery Timeline / Deadline',
        severity: 'medium'
      });
      questions.push('What is your expected delivery timeline or target launch date?');
    }

    // 8. Style, Tone & Platforms (10%)
    const styleVal = briefData.style || briefData.design_aesthetic || briefData.visualIdentity?.designAesthetic || '';
    const toneVal = briefData.tone || briefData.toneAndVoice || [];
    const hasStyle = String(styleVal).trim().length >= 3 || (Array.isArray(toneVal) && toneVal.length > 0);
    if (hasStyle) {
      scores.style_tone = this.requiredFieldsWeight.style_tone;
    } else {
      scores.style_tone = 0;
      missing.push({
        field: 'style_tone',
        label: 'Style, Tone & Platform Aesthetic',
        severity: 'low'
      });
      questions.push('What visual style, tone, or aesthetic do you prefer (e.g. Cyberpunk, Minimalist, Luxury HDR)?');
    }

    // 9. Required Tools / Models (5%)
    const tools = briefData.tools || briefData.requiredTools || briefData.ai_tools_models || [];
    if ((Array.isArray(tools) && tools.length > 0) || (typeof tools === 'string' && tools.trim().length > 2)) {
      scores.tools = this.requiredFieldsWeight.tools;
    } else {
      scores.tools = 0;
      missing.push({
        field: 'tools',
        label: 'Required AI Model Pipeline',
        severity: 'low'
      });
      questions.push('Do you require a specific generative AI model pipeline (e.g. Runway Gen-3, Midjourney v6, ComfyUI)?');
    }

    const totalCompleteness = Object.values(scores).reduce((a, b) => a + b, 0);

    return {
      completeness_score: Math.min(100, Math.max(0, totalCompleteness)),
      completeness_breakdown: scores,
      missing_information: missing.map(m => m.label),
      missing_fields: missing,
      clarification_questions: questions
    };
  }

  /**
   * Deterministic Fallback Brief Generator
   * Runs whenever Gemini is unconfigured, unreachable, or returns invalid JSON.
   */
  generateStructuredBriefFallback(rawIdea = '', userMeta = {}) {
    const text = String(rawIdea || '').trim();
    const searchReqs = searchService.extractRequirements(text, userMeta);

    // Extract budget heuristics (do not invent fictional numbers if unspecified)
    let budgetDisplay = userMeta.budget || null;
    let budgetMin = null;
    let budgetMax = null;
    const budgetMatch = text.match(/\$?(\d+[\d,]*)\s*(?:k\b|\s*-\s*\$?(\d+[\d,]*)\s*k?)?/i);
    if (budgetMatch && (/\$|budget|escrow|cost|k\b/i.test(text) || budgetMatch[0].includes('$'))) {
      let b1 = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
      if (/k/i.test(budgetMatch[0])) b1 *= 1000;
      if (budgetMatch[2]) {
        let b2 = parseInt(budgetMatch[2].replace(/,/g, ''), 10);
        if (/k/i.test(budgetMatch[0])) b2 *= 1000;
        budgetMin = Math.min(b1, b2);
        budgetMax = Math.max(b1, b2);
        budgetDisplay = `$${budgetMin.toLocaleString()} - $${budgetMax.toLocaleString()}`;
      } else if (b1 > 0) {
        budgetMin = Math.round(b1 * 0.8);
        budgetMax = b1;
        budgetDisplay = `$${b1.toLocaleString()}`;
      }
    }

    // Extract product/service
    const words = text.split(/\s+/).filter(Boolean);
    const titleSnippet = words.slice(0, 6).join(' ');
    const productGuess = userMeta.product_service || userMeta.product || `${titleSnippet || 'Creative Campaign'} Solution`;

    // Extract aspect ratio
    let aspectGuess = userMeta.aspect_ratio || userMeta.aspectRatio || '16:9';
    if (/9:16|vertical|reels|tiktok|shorts/i.test(text)) aspectGuess = '9:16';
    else if (/1:1|square|instagram post/i.test(text)) aspectGuess = '1:1';
    else if (/16:9|landscape|youtube|cinematic/i.test(text)) aspectGuess = '16:9';

    // Extract timeline
    let timelineGuess = userMeta.timeline || userMeta.deadline || null;
    if (!timelineGuess) {
      const timeMatch = text.match(/(\d+\s*(?:day|week|month)s?|by\s+[A-Za-z]+\s+\d+)/i);
      if (timeMatch) timelineGuess = timeMatch[0];
    }

    // Tools & skills
    const tools = (searchReqs.ai_tools_models && searchReqs.ai_tools_models.length > 0)
      ? searchReqs.ai_tools_models
      : ['Runway Gen-3 Alpha', 'Midjourney v6'];

    const skills = (searchReqs.required_skills && searchReqs.required_skills.length > 0)
      ? searchReqs.required_skills
      : ['Prompt Engineering', 'AI Video Generation', 'Cinematography'];

    // Deliverables list
    const deliverablesList = [
      {
        item: `Master ${searchReqs.content_type || 'Commercial Video'} Deliverable`,
        format: aspectGuess,
        description: `High-fidelity 4K rendered commercial asset in ${aspectGuess} ratio.`,
        priority: 'High'
      },
      {
        item: 'AI Pipeline & Prompt Specification',
        format: 'Markdown / JSON',
        description: 'Documented prompt seeds, model checkpoints, and workflows.',
        priority: 'Medium'
      }
    ];

    const draftBrief = {
      title: `${titleSnippet.toUpperCase()} CAMPAIGN`,
      goal: text.length > 100 ? `${text.slice(0, 97)}...` : text,
      product_service: productGuess,
      niche: searchReqs.specialization || 'AI Commercial Production',
      target_audience: {
        primaryAudience: userMeta.audience || 'Tech-forward consumers & digital audience',
        demographics: 'Ages 18-40, digital natives',
        psychographics: 'Values high visual craft, modern aesthetics, and cutting-edge tech',
        keyPainPoints: ['Generic stock footage feel', 'Slow turnaround times'],
        valueProposition: 'Instant high-production value generative commercial'
      },
      required_skills: skills,
      tools: tools,
      deliverables: deliverablesList,
      aspect_ratio: aspectGuess,
      budget: budgetDisplay,
      budget_range: {
        min: budgetMin,
        max: budgetMax,
        currency: 'USD',
        formatted: budgetDisplay
      },
      timeline: timelineGuess,
      style: `${searchReqs.visual_style || 'Cinematic Photorealistic'} with dynamic volumetric lighting and premium color grade.`,
      tone: ['Bold', 'Cinematic', 'Cutting-Edge', 'Premium'],
      platforms: aspectGuess === '9:16' ? ['TikTok', 'Instagram Reels', 'YouTube Shorts'] : ['YouTube', 'Website', 'Commercial Broadcast'],
      experience_level: 'Commercial / Senior',

      // Backward compatible fields for legacy components
      brandNameSuggestions: [
        { name: `${titleSnippet.toUpperCase()} PRO`, rationale: 'Dynamic and tech-forward project label' },
        { name: 'NEXTGEN CAMPAIGN', rationale: 'Emphasizes generative modern media' }
      ],
      tagline: 'Precision AI Production for Modern Brands.',
      missionStatement: `Deliver state-of-the-art ${searchReqs.content_type || 'creative'} production.`,
      visionStatement: 'Push generative storytelling into premier commercial broadcast tier.',
      brandArchetype: 'The Creator / The Pioneer',
      toneAndVoice: ['Innovative', 'Cinematic', 'High-End', 'Dynamic'],
      targetAudience: {
        primaryAudience: userMeta.audience || 'Tech-forward consumers & digital audience',
        demographics: 'Ages 18-40, digital natives',
        psychographics: 'Values high visual craft, modern aesthetics, and cutting-edge tech',
        keyPainPoints: ['Generic stock footage feel', 'Slow turnaround times'],
        valueProposition: 'Instant high-production value generative commercial'
      },
      visualIdentity: {
        colorPalette: [
          { name: 'Obsidian Void', hex: '#0B0B0F', usage: 'Dominant dark tone' },
          { name: 'Electric Orange', hex: '#FF6B00', usage: 'Primary brand accent' },
          { name: 'Pure White', hex: '#FFFFFF', usage: 'High-contrast typography' }
        ],
        typographyMood: 'Clean, bold, modern, and geometric sans-serif.',
        designAesthetic: `${searchReqs.visual_style || 'Cinematic Photorealistic'} generative imagery with HDR lighting.`
      },
      keyDeliverables: deliverablesList,
      executiveSummary: `Creative project brief for ${text}. Focuses on delivering verified high-fidelity assets using AI toolchains.`
    };

    // Completeness evaluation
    const evaluation = this.evaluateCompleteness(draftBrief, text);

    // Track field attributions
    const fieldSources = {
      goal: text.length > 5 ? 'user_provided' : 'ai_inferred',
      product_service: userMeta.product_service ? 'user_provided' : 'ai_inferred',
      target_audience: userMeta.audience ? 'user_provided' : 'ai_inferred',
      required_skills: searchReqs.required_skills?.length ? 'user_provided' : 'ai_inferred',
      deliverables: 'ai_inferred',
      aspect_ratio: /16:9|9:16|1:1/i.test(text) ? 'user_provided' : 'ai_inferred',
      budget: budgetMatch ? 'user_provided' : 'ai_inferred',
      timeline: /day|week|month|by/i.test(text) ? 'user_provided' : 'ai_inferred',
      style: searchReqs.visual_style ? 'user_provided' : 'ai_inferred',
      tools: searchReqs.ai_tools_models?.length ? 'user_provided' : 'ai_inferred',
      platforms: 'ai_inferred'
    };

    return {
      ...draftBrief,
      ...evaluation,
      field_sources: fieldSources,
      generation_method: 'Deterministic Heuristics Engine (Rule-based Fallback)',
      model_used: 'deterministic-fallback',
      is_fallback: true
    };
  }

  /**
   * Generates or enhances a brief using Google Gemini with automatic fallback on failure
   */
  async generateBriefWithAI(rawIdea = '', userMeta = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidApiKey = Boolean(apiKey && apiKey !== 'your_gemini_api_key_here' && !apiKey.startsWith('placeholder'));

    if (!hasValidApiKey) {
      return this.generateStructuredBriefFallback(rawIdea, userMeta);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

    const promptInstructions = `
You are an expert Creative Director and AI Campaign Architect for GenLancer, an elite marketplace for generative AI video & 3D creators.
A client has described their campaign in natural language:
"${rawIdea.trim()}"

Transform this idea into a structured campaign brief returned STRICTLY as valid JSON without markdown wrapping.
CRITICAL INSTRUCTIONS:
- DO NOT invent a specific budget number if the client did NOT mention budget or money. Set "budget" to null or empty string.
- DO NOT invent a timeline if the client did NOT mention one. Set "timeline" to null or empty string.
- Identify the explicit deliverables requested, or suggest 2 realistic deliverable packages if unspecified.
- Infer appropriate generative tools (e.g. Runway Gen-3 Alpha, Flux.1 Dev, Midjourney v6) based on style.

JSON SCHEMA:
{
  "title": "Short punchy campaign title (4-8 words)",
  "goal": "Core objective and campaign goal",
  "product_service": "The specific product or service being promoted",
  "niche": "e.g. Beverage Commercial, SaaS 3D Explainer, Fashion VFX",
  "target_audience": {
    "primaryAudience": "Description of the target segment",
    "demographics": "Age, gender, location, lifestyle",
    "psychographics": "Values, desires, interests",
    "keyPainPoints": ["Point 1", "Point 2"],
    "valueProposition": "Why this campaign resonates with them"
  },
  "required_skills": ["Skill 1", "Skill 2", "Skill 3"],
  "tools": ["Tool 1", "Tool 2"],
  "deliverables": [
    { "item": "Name of deliverable", "format": "16:9 or 9:16 or 1:1", "description": "Specific requirements", "priority": "High/Medium" }
  ],
  "aspect_ratio": "16:9 or 9:16 or 1:1",
  "budget": "Budget string if mentioned by user, else null",
  "timeline": "Timeline string if mentioned by user, else null",
  "style": "Visual aesthetic, lighting, camera trajectory, motion language",
  "tone": ["Tone 1", "Tone 2", "Tone 3"],
  "platforms": ["Platform 1", "Platform 2"],
  "experience_level": "Commercial / Senior",
  "brandNameSuggestions": [
    { "name": "Brand/Campaign Name", "rationale": "Short explanation" }
  ],
  "tagline": "A punchy memorable slogan",
  "executiveSummary": "A cohesive 2-sentence summary of the campaign"
}
`;

    let responseText = null;
    let modelUsed = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent(promptInstructions);
        responseText = result.response.text();
        modelUsed = modelName;
        break;
      } catch (err) {
        console.warn(`Gemini model ${modelName} call failed, trying next candidate:`, err.message);
      }
    }

    if (!responseText) {
      console.warn('All Gemini models failed. Engaging deterministic fallback.');
      return this.generateStructuredBriefFallback(rawIdea, userMeta);
    }

    let parsed = null;
    try {
      let cleanText = responseText.trim();
      if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
      if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
      parsed = JSON.parse(cleanText.trim());
    } catch (parseErr) {
      console.warn('Malformed JSON from Gemini. Recovering with fallback:', parseErr.message);
      return this.generateStructuredBriefFallback(rawIdea, userMeta);
    }

    // Merge with backward-compatible fields
    const brief = {
      ...parsed,
      targetAudience: parsed.target_audience || parsed.targetAudience,
      keyDeliverables: parsed.deliverables || parsed.keyDeliverables,
      visualIdentity: {
        designAesthetic: parsed.style,
        typographyMood: 'Clean modern sans-serif',
        colorPalette: [
          { name: 'Obsidian Void', hex: '#0B0B0F', usage: 'Background' },
          { name: 'Electric Orange', hex: '#FF6B00', usage: 'Accent' }
        ]
      },
      toneAndVoice: parsed.tone || ['Bold', 'Cinematic', 'Dynamic']
    };

    // Track field attributions and avoid inventing unknown budget/timeline
    const lower = rawIdea.toLowerCase();
    const hasUserBudget = /\$|\bbudget\b|\bescrow\b|\bcost\b/i.test(lower);
    const hasUserTimeline = /day|week|month|deadline|by/i.test(lower);

    if (!hasUserBudget) {
      brief.budget = null;
    }
    if (!hasUserTimeline) {
      brief.timeline = null;
    }

    const fieldSources = {
      goal: 'user_provided',
      product_service: parsed.product_service && lower.includes(parsed.product_service.toLowerCase().split(' ')[0]) ? 'user_provided' : 'ai_inferred',
      target_audience: userMeta.audience ? 'user_provided' : 'ai_inferred',
      required_skills: 'ai_inferred',
      deliverables: 'ai_inferred',
      aspect_ratio: /16:9|9:16|1:1/i.test(lower) ? 'user_provided' : 'ai_inferred',
      budget: hasUserBudget ? 'user_provided' : 'ai_inferred',
      timeline: hasUserTimeline ? 'user_provided' : 'ai_inferred',
      style: 'ai_inferred',
      tools: 'ai_inferred',
      platforms: 'ai_inferred'
    };
    brief.field_sources = fieldSources;

    // Completeness evaluation
    const evaluation = this.evaluateCompleteness(brief, rawIdea);

    return {
      ...brief,
      ...evaluation,
      field_sources: fieldSources,
      generation_method: `Google Gemini (${modelUsed})`,
      model_used: modelUsed,
      is_fallback: false
    };
  }

  /**
   * Regenerates a single specific section of an existing brief.
   * Allows focused iteration without overwriting the entire brief.
   */
  async regenerateSection(sectionName, currentBrief = {}, rawIdea = '') {
    const text = rawIdea || currentBrief.goal || currentBrief.title || '';
    const fallback = this.generateStructuredBriefFallback(text, currentBrief);

    const updated = { ...currentBrief };
    const fieldSources = { ...(currentBrief.field_sources || {}) };

    switch (sectionName) {
      case 'deliverables':
        updated.deliverables = fallback.deliverables;
        updated.keyDeliverables = fallback.keyDeliverables;
        updated.aspect_ratio = fallback.aspect_ratio;
        fieldSources.deliverables = 'ai_inferred';
        fieldSources.aspect_ratio = 'ai_inferred';
        break;

      case 'audience':
        updated.target_audience = fallback.target_audience;
        updated.targetAudience = fallback.targetAudience;
        fieldSources.target_audience = 'ai_inferred';
        break;

      case 'style':
      case 'visual_style':
        updated.style = fallback.style;
        updated.tone = fallback.tone;
        updated.visualIdentity = fallback.visualIdentity;
        fieldSources.style = 'ai_inferred';
        break;

      case 'skills_tools':
        updated.required_skills = fallback.required_skills;
        updated.tools = fallback.tools;
        fieldSources.required_skills = 'ai_inferred';
        fieldSources.tools = 'ai_inferred';
        break;

      case 'budget_timeline':
        updated.budget = fallback.budget;
        updated.timeline = fallback.timeline;
        fieldSources.budget = 'ai_inferred';
        fieldSources.timeline = 'ai_inferred';
        break;

      default:
        // Regenerate concept / title
        updated.title = fallback.title;
        updated.product_service = fallback.product_service;
        fieldSources.goal = 'ai_inferred';
        fieldSources.product_service = 'ai_inferred';
        break;
    }

    const evaluation = this.evaluateCompleteness(updated, text);

    return {
      ...updated,
      ...evaluation,
      field_sources: fieldSources,
      regenerated_section: sectionName
    };
  }

  /**
   * Validates and normalizes the brief into search parameters before matching creators.
   * Enforces that required parameters are present, sanitizes formats, and generates search criteria.
   */
  validateAndNormalizeBrief(briefInput = {}) {
    const errors = [];
    const warnings = [];

    // Title / Goal validation
    const title = (briefInput.title || briefInput.goal || briefInput.project_title || '').trim();
    if (!title || title.length < 3) {
      errors.push('Campaign title or goal is required (minimum 3 characters).');
    }

    // Deliverables / content format validation
    let deliverables = briefInput.deliverables || briefInput.keyDeliverables || [];
    if (typeof deliverables === 'string') {
      deliverables = deliverables.split(/[;\n]/).map(d => d.trim()).filter(Boolean);
    }
    const hasDeliverables = Array.isArray(deliverables) && deliverables.length > 0;
    if (!hasDeliverables && !briefInput.content_type) {
      warnings.push('Deliverables list is empty. Defaulting to Master Video Deliverable.');
      deliverables = ['Master Video Deliverable'];
    }

    // Budget normalization
    let minBudget = 0;
    let maxBudget = 5000;
    const rawBudget = String(briefInput.budget || briefInput.max_budget || '');
    const numMatches = rawBudget.match(/\d+[\d,]*/g);
    if (numMatches && numMatches.length > 0) {
      const parsedNums = numMatches.map(n => parseInt(n.replace(/,/g, ''), 10)).filter(n => !isNaN(n) && n > 0);
      if (parsedNums.length >= 2) {
        minBudget = Math.min(...parsedNums);
        maxBudget = Math.max(...parsedNums);
      } else if (parsedNums.length === 1) {
        maxBudget = parsedNums[0];
        minBudget = Math.round(maxBudget * 0.7);
      }
    } else if (briefInput.budget_tier) {
      if (briefInput.budget_tier.includes('1,000') || briefInput.budget_tier.includes('Standard')) maxBudget = 2200;
      else if (briefInput.budget_tier.includes('3,500') || briefInput.budget_tier.includes('Commercial')) maxBudget = 3500;
      else if (briefInput.budget_tier.includes('4,500') || briefInput.budget_tier.includes('Enterprise')) maxBudget = 4500;
      else if (briefInput.budget_tier.includes('7,500')) maxBudget = 7500;
    }

    // Aspect ratio normalization
    let outputFormat = briefInput.aspect_ratio || briefInput.aspectRatio || briefInput.output_format || '16:9';
    if (outputFormat.includes('9:16')) outputFormat = '9:16';
    else if (outputFormat.includes('1:1')) outputFormat = '1:1';
    else if (outputFormat.includes('4:5')) outputFormat = '4:5';
    else outputFormat = '16:9';

    // Tools normalization
    let tools = briefInput.tools || briefInput.requiredTools || briefInput.ai_tools_models || [];
    if (typeof tools === 'string') {
      tools = tools.split(/[,;\n]/).map(t => t.trim()).filter(Boolean);
    }
    if (!Array.isArray(tools) || tools.length === 0) {
      tools = ['Runway Gen-3 Alpha'];
    }

    // Skills normalization
    let skills = briefInput.required_skills || briefInput.skills || [];
    if (typeof skills === 'string') {
      skills = skills.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(skills) || skills.length === 0) {
      skills = ['Prompt Engineering', 'AI Video Generation'];
    }

    // Style normalization
    const visualStyle = briefInput.style || briefInput.design_aesthetic || briefInput.visualIdentity?.designAesthetic || 'Cinematic Photorealistic';

    const evaluation = this.evaluateCompleteness(briefInput);

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        warnings,
        completeness_score: evaluation.completeness_score,
        missing_fields: evaluation.missing_fields
      };
    }

    // Clean normalized brief
    const normalizedBrief = {
      title,
      goal: briefInput.goal || title,
      product_service: briefInput.product_service || 'Commercial Product / Service',
      target_audience: briefInput.target_audience || briefInput.targetAudience || 'Target Audience',
      required_skills: skills,
      tools: tools,
      deliverables: deliverables,
      aspect_ratio: outputFormat,
      budget: `$${maxBudget.toLocaleString()}`,
      min_budget: minBudget,
      max_budget: maxBudget,
      timeline: briefInput.timeline || briefInput.deadline || '2-3 weeks',
      style: visualStyle,
      tone: briefInput.tone || ['Cinematic', 'Dynamic'],
      platforms: briefInput.platforms || (outputFormat === '9:16' ? ['TikTok', 'Instagram Reels'] : ['YouTube', 'Commercial Broadcast']),
      excluded_tools: briefInput.excluded_tools || [],
      excluded_skills: briefInput.excluded_skills || []
    };

    // Prepared search params ready for searchService & scoringService
    const searchParams = {
      project_title: normalizedBrief.title,
      target_tools: normalizedBrief.tools,
      output_format: normalizedBrief.aspect_ratio,
      content_type: 'Video',
      max_budget: normalizedBrief.max_budget,
      min_budget: normalizedBrief.min_budget,
      required_skills: normalizedBrief.required_skills,
      visual_style: normalizedBrief.style,
      excluded_tools: normalizedBrief.excluded_tools,
      excluded_skills: normalizedBrief.excluded_skills
    };

    return {
      valid: true,
      errors: [],
      warnings,
      completeness_score: evaluation.completeness_score,
      missing_fields: evaluation.missing_fields,
      clarification_questions: evaluation.clarification_questions,
      normalized_brief: normalizedBrief,
      search_params: searchParams
    };
  }
}

export default new BriefService();
