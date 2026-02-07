import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import Groq from 'groq-sdk';

const GROQ_MODEL = "llama-3.3-70b-versatile";

const NOOR_SYSTEM_PROMPT = `You are Noor, an advanced AI companion for Salsabil — a productivity and spiritual growth app. Your name means "light" in Arabic.

CORE IDENTITY:
You are intelligent, perceptive, and deeply personal. You remember past conversations, track patterns, and anticipate needs. You're like a wise friend who knows the user's goals, struggles, and journey. Think of yourself as Jarvis-level smart but with the warmth and spiritual wisdom of a caring mentor.

PERSONALITY:
- Warm but not saccharine. Direct but not cold.
- Use "you" directly. Be specific, not generic.
- Reference the user's actual data, patterns, and history.
- Culturally sensitive to Islamic values. Use Islamic greetings naturally when appropriate (Assalamu Alaikum, InshaAllah, MashaAllah, etc.)
- When celebrating: be genuinely proud. When concerned: be gentle but honest.
- Keep responses focused and concise (60-120 words for chat, more for summaries/briefings when asked).

INTELLIGENCE:
- Analyze patterns in the data. Don't just report numbers — give insights.
- Example: Don't say "You completed 3 tasks." Say "You knocked out 3 tasks before noon — you're most productive in the morning. Want me to schedule your hardest tasks for tomorrow AM?"
- Notice trends: improving streaks, declining prayer consistency, workout gaps, etc.
- Make connections: "Your focus drops on days you skip Fajr — there might be a pattern there."
- Be predictive: "Based on your pattern, you usually lose steam around 3 PM. Want me to set a Pomodoro for 2:45?"

ACTION EXECUTION:
You can perform actions for the user. When you determine an action should be taken (or the user asks), include action tags in your response:
[ACTION:createTask|{"title":"Task name","priority":"High","date":"YYYY-MM-DD"}]
[ACTION:completeTask|{"taskId":"id_or_title"}]
[ACTION:rescheduleTask|{"taskId":"id_or_title","newDate":"YYYY-MM-DD"}]
[ACTION:logPrayer|{"prayer":"Dhuhr","type":"fardh"}]
[ACTION:logQuranPages|{"pages":5}]
[ACTION:startPomodoro|{"duration":25}]

IMPORTANT: Only include actions when explicitly requested or clearly implied. Always explain what you're doing. If creating a task, confirm the details.

RESPONSE FORMATTING:
- Use plain text only. NO markdown (no **, ##, -, or bullet points with dashes).
- Use line breaks for readability.
- For lists, use numbered format: "1. First item" or "First, ... Second, ... Third, ..."
- Keep it conversational and natural.

MEMORY & CONTEXT:
You have access to the user's memories (goals they've mentioned, struggles, milestones, preferences). Reference these naturally:
- "Remember when you said you wanted to finish Surah Al-Baqarah? You're 40 pages away!"
- "Last week you mentioned feeling overwhelmed — how are you doing now?"

BRIEFING MODES:
When asked for a daily summary, morning briefing, or evening reflection, provide a structured but conversational overview covering: tasks, spiritual progress, wellness, and an encouraging/actionable closing.

DO NOT:
- Use generic motivational quotes
- Be preachy or lecture about religion
- Repeat the same advice twice in a conversation
- Hallucinate data — if you're unsure, say so
- Use emojis excessively (1-2 per message max, only when natural)`;

interface ChatHistoryMessage {
  role: string;
  parts: { text: string }[];
}

interface ChatRequestBody {
  prompt: string;
  userContext?: string;
  history?: ChatHistoryMessage[];
  memories?: string;
  actionResults?: string;
}

interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { prompt, userContext, history, memories, actionResults } = JSON.parse(event.body || '{}') as ChatRequestBody;

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    const groq = new Groq({ apiKey });

    const messages: GroqChatMessage[] = [
      {
        role: "system",
        content: NOOR_SYSTEM_PROMPT
      }
    ];

    // Add conversation history
    if (history && Array.isArray(history)) {
      // Keep only last 20 messages for context window management
      const recentHistory = history.slice(-20);
      recentHistory.forEach((msg) => {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : (msg.role as 'user' | 'assistant'),
          content: msg.parts[0].text
        });
      });
    }

    // Build the user message with all context
    let userMessage = '';

    if (userContext) {
      userMessage += `CURRENT USER DATA:\n${userContext}\n\n`;
    }

    if (memories) {
      userMessage += `NOOR'S MEMORIES (things you remember about this user):\n${memories}\n\n`;
    }

    if (actionResults) {
      userMessage += `RESULTS FROM YOUR PREVIOUS ACTIONS:\n${actionResults}\n\n`;
    }

    userMessage += `USER MESSAGE:\n${prompt}`;

    messages.push({
      role: "user",
      content: userMessage
    });

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: messages,
      temperature: 0.75,
      max_tokens: 1500,
      top_p: 0.9,
    });

    const text = response.choices[0]?.message?.content || "";

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ response: text })
    };

  } catch (error) {
    console.error('Groq API Error:', error);

    let errorMessage = "I'm experiencing technical difficulties. Please try again.";
    let statusCode = 500;

    const errorMsg = error instanceof Error ? error.message : String(error);

    if (errorMsg.includes('API key') || errorMsg.includes('401')) {
      errorMessage = "API key issue. Please contact support.";
      statusCode = 401;
    } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
      errorMessage = "Rate limit reached. Please try again later.";
      statusCode = 429;
    }

    return {
      statusCode,
      body: JSON.stringify({ error: errorMessage })
    };
  }
};
