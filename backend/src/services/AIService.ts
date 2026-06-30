import Groq from 'groq-sdk';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { retryWithBackoff } from '../utils/helpers.js';
import type { AIQualificationResult, BusinessData } from '../types/index.js';

export class AIService {
  private client: Groq;
  private model: string;

  constructor() {
    this.client = new Groq({
      apiKey: env.GROQ_API_KEY,
    });
    this.model = env.GROQ_MODEL;
  }

  async qualifyLead(business: BusinessData): Promise<AIQualificationResult> {
    const hasWebsite = !!business.website;
    const prompt = `You are a web development sales qualification expert.

Business Details:
Name: ${business.name}
Category: ${business.category}
Rating: ${business.rating ?? 'N/A'}/5 (${business.reviewCount ?? 0} reviews)
Address: ${business.address}
Has Website: ${hasWebsite ? 'Yes — ' + business.website : 'No'}

${hasWebsite
  ? `IMPORTANT: This business HAS a website. Evaluate whether their website likely has quality issues that make it an upgrade opportunity. Consider these common problems:
- Not mobile-responsive (very common for older sites)
- Slow loading (heavy images, no optimization)
- HTTP instead of HTTPS (security risk)
- Outdated design (looks like 2013)
- Broken contact forms or missing CTAs
- No SEO optimization
- Poor user experience

Give a "websiteQualityScore" from 0-100 where:
- 0-30 = terrible website, GREAT upgrade opportunity
- 31-50 = poor website, good upgrade opportunity
- 51-70 = decent website, moderate opportunity
- 71-100 = good website, low priority

Also provide "websiteQualityIssues" listing the likely problems (max 30 words).
A business with a BAD website is STILL qualified — selling an upgrade is easier than selling from scratch.`
  : `This business has NO website. They are a prime candidate for web development services.`}

Evaluate whether this business would benefit from professional web development services.
Return ONLY a JSON object:
{
  "qualified": boolean,
  "score": number (0-100, overall lead quality),
  "reason": string (max 20 words)${hasWebsite ? `,
  "websiteQualityScore": number (0-100, website quality),
  "websiteQualityIssues": string (max 30 words, specific issues)` : ''}
}`;

    try {
      return await retryWithBackoff(async () => {
        const completion = await this.client.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a business qualification AI. Always respond with valid JSON only.',
            },
            { role: 'user', content: prompt },
          ],
          model: this.model,
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 300,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from AI');
        }

        const result = JSON.parse(content) as AIQualificationResult;

        return {
          qualified: Boolean(result.qualified),
          score: Math.max(0, Math.min(100, Number(result.score) || 0)),
          reason: String(result.reason || 'No reason provided').slice(0, 200),
          ...(hasWebsite && result.websiteQualityScore !== undefined ? {
            websiteQualityScore: Math.max(0, Math.min(100, Number(result.websiteQualityScore) || 50)),
            websiteQualityIssues: String(result.websiteQualityIssues || '').slice(0, 300),
          } : {}),
        };
      }, 3, 1000);
    } catch (error) {
      logger.error(`AI qualification failed for ${business.name}:`, error);
      return {
        qualified: !business.website || true, // Always qualified if has bad website
        score: business.website ? 40 : 50,
        reason: 'AI qualification unavailable — using default scoring',
        ...(hasWebsite ? { websiteQualityScore: 40, websiteQualityIssues: 'Could not analyze — assumed moderate quality' } : {}),
      };
    }
  }

  async generateMessage(lead: {
    businessName: string;
    category: string;
    city: string;
    rating?: number;
    reviewCount?: number;
    website?: string;
    websiteQualityScore?: number;
    websiteQualityIssues?: string;
  }): Promise<string> {
    const hasWebsite = !!lead.website;
    const hasBadWebsite = hasWebsite && (lead.websiteQualityScore !== undefined ? lead.websiteQualityScore <= 50 : true);

    const prompt = `Generate a WhatsApp message for a web developer reaching out to a potential client.

Business: ${lead.businessName}
Category: ${lead.category}
City: ${lead.city}
Rating: ${lead.rating ?? 'N/A'} stars, ${lead.reviewCount ?? 0} reviews
${hasWebsite
  ? `Has Website: Yes (${lead.website})
Website Quality Score: ${lead.websiteQualityScore ?? 'Unknown'}/100
Website Issues: ${lead.websiteQualityIssues || 'Not analyzed'}
PITCH ANGLE: Their website needs an upgrade/redesign. Focus on how a modern website would help them get more customers.`
  : `Has Website: No
PITCH ANGLE: They don't have a website at all. Focus on how having a website would help their business.`}

Rules:
- Keep it extremely short, simple, and casual (maximum 30-40 words)
- Sound like a real person casually texting from their phone
${hasBadWebsite
  ? `- Mention you checked out their website and noticed it could use some improvements (be specific if possible — e.g. mobile-friendliness, speed, modern design)
- Casually mention that you are a web developer
- Ask if they would be interested in a website upgrade or redesign`
  : `- Briefly mention their business name and that you noticed they don't have a website
- Casually mention that you are a web developer
- Ask directly but politely if they are interested in getting a website for their business`}
- Do NOT sound pushy or corporate
- Do NOT use formal language (use "Hey" or "Hi" instead of "Dear")
- No emojis and no exclamation marks

Return ONLY the message text, no JSON wrapper, no quotes around it.`;

    try {
      return await retryWithBackoff(async () => {
        const completion = await this.client.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a friendly web developer writing personalized WhatsApp outreach messages. Return only the message text.',
            },
            { role: 'user', content: prompt },
          ],
          model: this.model,
          temperature: 0.7,
          max_tokens: 300,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from AI');
        }

        return content.trim();
      }, 3, 1000);
    } catch (error) {
      logger.error(`AI message generation failed for ${lead.businessName}:`, error);
      // Fallback message
      return `Hey, I noticed ${lead.businessName} has great reviews but no website. I'm a web developer, are you interested in getting a website set up for your business?`;
    }
  }

  async generateFollowUp(
    lead: {
      businessName: string;
      category: string;
      city: string;
    },
    originalMessage: string,
    followUpNumber: number,
  ): Promise<string> {
    const prompt = `Generate a WhatsApp follow-up message (#${followUpNumber}) for a web developer.

Business: ${lead.businessName}
Category: ${lead.category}
City: ${lead.city}

Original message sent:
"${originalMessage}"

Rules:
- Maximum 60 words
- Acknowledge the previous outreach briefly
- Add a NEW value proposition not mentioned before
- Be respectful of their time
- If follow-up #2, make it the final friendly nudge
- Don't be pushy or desperate
- End with a simple question
- No emojis, no exclamation marks

Return ONLY the message text.`;

    try {
      return await retryWithBackoff(async () => {
        const completion = await this.client.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a respectful web developer sending a follow-up message. Return only the message text.',
            },
            { role: 'user', content: prompt },
          ],
          model: this.model,
          temperature: 0.7,
          max_tokens: 250,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from AI');
        }

        return content.trim();
      }, 3, 1000);
    } catch (error) {
      logger.error(`AI follow-up generation failed for ${lead.businessName}:`, error);
      return `Hi, I reached out a few days ago about creating a website for ${lead.businessName}. Just wanted to check if you had any questions. No pressure at all — happy to chat whenever works for you.`;
    }
  }

  async generateEmailMessage(lead: {
    businessName: string;
    category: string;
    city: string;
    rating?: number;
    reviewCount?: number;
  }): Promise<{ subject: string; body: string }> {
    const prompt = `Generate a cold outreach email for a web developer reaching out to a potential client.

Business: ${lead.businessName}
Category: ${lead.category}
City: ${lead.city}
Rating: ${lead.rating ?? 'N/A'} stars, ${lead.reviewCount ?? 0} reviews
Has Website: No

Rules:
- Return a JSON object with "subject" and "body" fields
- Subject line: short, personal, under 8 words (e.g. "Quick question about ${lead.businessName}")
- Body: keep it under 60 words, casual and friendly
- Mention you are a web developer
- Mention they don't have a website
- Ask if they'd be interested in getting one built
- Do NOT sound like a template or spam
- No emojis, no excessive exclamation marks
- Sign off with just "Cheers" or "Best" (no full name)

Return ONLY a valid JSON object: { "subject": "...", "body": "..." }`;

    try {
      return await retryWithBackoff(async () => {
        const completion = await this.client.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a friendly web developer writing cold outreach emails. Return only valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
          model: this.model,
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 300,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from AI');
        }

        const result = JSON.parse(content) as { subject: string; body: string };
        return {
          subject: String(result.subject || `Website for ${lead.businessName}`).slice(0, 200),
          body: String(result.body || '').trim(),
        };
      }, 3, 1000);
    } catch (error) {
      logger.error(`AI email generation failed for ${lead.businessName}:`, error);
      return {
        subject: `Quick question about ${lead.businessName}`,
        body: `Hey,\n\nI noticed ${lead.businessName} has great reviews but no website. I'm a web developer — would you be interested in getting one set up for your business?\n\nCheers`,
      };
    }
  }
}

export const aiService = new AIService();
