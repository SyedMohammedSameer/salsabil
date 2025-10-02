import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import Groq from 'groq-sdk';

const GROQ_MODEL = "llama-3.3-70b-versatile";
const NOOR_SYSTEM_PROMPT = `You are Noor, an intelligent AI assistant for the Salsabil productivity and spiritual growth app. Your name means "light" in Arabic, representing guidance and enlightenment. Your personality is wise, encouraging, culturally sensitive, and practical. Keep responses concise (typically under 80 words), use a warm but professional tone, and use plain text formatting only (no markdown, asterisks, etc.). Use simple dashes for lists if needed. You have access to the user's comprehensive data (tasks, prayer logs, etc.) which is provided as context for each query. Use this data to provide focused, personalized, and actionable assistance.`;

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { prompt, userContext, history } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // Get API key from environment variable (set in Netlify dashboard)
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    // Initialize Groq client
    const groq = new Groq({ apiKey });

    // Build messages array
    const messages: any[] = [
      {
        role: "system",
        content: NOOR_SYSTEM_PROMPT
      }
    ];

    // Add conversation history
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : msg.role,
          content: msg.parts[0].text
        });
      });
    }

    // Add current prompt with context
    messages.push({
      role: "user",
      content: userContext
        ? `CONTEXT:\n${userContext}\n\nREQUEST:\n${prompt}`
        : prompt
    });

    // Call Groq API
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: messages,
      temperature: 0.8,
      max_tokens: 1000,
      top_p: 0.9,
    });

    const text = response.choices[0]?.message?.content || "";

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ response: text })
    };

  } catch (error: any) {
    console.error('Groq API Error:', error);

    let errorMessage = "I'm experiencing technical difficulties. Please try again.";
    let statusCode = 500;

    if (error.message?.includes('API key') || error.message?.includes('401')) {
      errorMessage = "API key issue. Please contact support.";
      statusCode = 401;
    } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      errorMessage = "Rate limit reached. Please try again later.";
      statusCode = 429;
    }

    return {
      statusCode,
      body: JSON.stringify({ error: errorMessage })
    };
  }
};
