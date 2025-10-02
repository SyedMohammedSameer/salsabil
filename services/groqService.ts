// Enhanced services/groqService.ts - Groq API integration
import Groq from "groq-sdk";
import { Task } from '../types';
import { MOCK_AI_RESPONSES } from '../constants';

// Using Groq's best free model with high rate limits
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Best balance of quality and speed

let groqClient: Groq | null = null;
let currentApiKey: string | null = null;

const initializeAiClient = (apiKey: string): Groq | null => {
  if (!apiKey) {
    console.warn("Groq API key is not provided. AI service will use mock data.");
    return null;
  }
  if (groqClient && currentApiKey === apiKey) {
    return groqClient;
  }
  try {
    groqClient = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Required for browser usage
    });
    currentApiKey = apiKey;
    console.log('✨ Groq: Initialized client with model:', GROQ_MODEL);
    return groqClient;
  } catch (error) {
    console.error("Failed to initialize Groq client:", error);
    groqClient = null;
    currentApiKey = null;
    return null;
  }
};

// System prompt for Noor
const NOOR_SYSTEM_PROMPT = `You are Noor, an intelligent AI assistant for the Salsabil productivity and spiritual growth app. Your name means "light" in Arabic, representing guidance and enlightenment. Your personality is wise, encouraging, culturally sensitive, and practical. Keep responses concise (typically under 80 words), use a warm but professional tone, and use plain text formatting only (no markdown, asterisks, etc.). Use simple dashes for lists if needed. You have access to the user's comprehensive data (tasks, prayer logs, etc.) which is provided as context for each query. Use this data to provide focused, personalized, and actionable assistance.`;

// Enhanced AI response function with proper history and context handling
export const getEnhancedAiResponse = async (
  prompt: string,
  userContext: string,
  history: {role: string, parts: {text: string}[]}[],
  apiKey: string
): Promise<string> => {
  const client = initializeAiClient(apiKey);
  if (!client) {
    console.log('🤖 Groq: Using mock mode - no API key');
    return `${MOCK_AI_RESPONSES.NO_KEY}\n\n*Noor (Mock Mode):* I can provide general guidance. How can I help?`;
  }

  try {
    console.log('🤖 Groq: Making API call...');

    // Convert history format to Groq's expected format
    const messages: any[] = [
      {
        role: "system",
        content: NOOR_SYSTEM_PROMPT
      }
    ];

    // Add conversation history
    history.forEach(msg => {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.parts[0].text
      });
    });

    // Add current prompt with context
    messages.push({
      role: "user",
      content: `CONTEXT:\n${userContext}\n\nREQUEST:\n${prompt}`
    });

    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: messages,
      temperature: 0.8,
      max_tokens: 1000,
      top_p: 0.9,
    });

    const text = response.choices[0]?.message?.content || "";

    console.log('🤖 Groq: Received response of length:', text.length);
    return text || "I apologize, but I couldn't generate a response. Please try again.";

  } catch (error) {
    console.error("🤖 Groq: Error calling API:", error);

    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401')) {
        return "It looks like there's an issue with your API key. Please check it in your settings. 🔑";
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        return "I've reached my usage limit for now. Please try again later. 🌟";
      }
    }

    return "I'm experiencing some technical difficulties. Please try again in a moment. 🛠️";
  }
};

// Legacy function for backward compatibility (can be removed if not needed elsewhere)
export const getAiChatResponse = async (
  prompt: string,
  tasks: Task[],
  history: {role: string, parts: {text: string}[]}[],
  apiKey: string
): Promise<string> => {
  const taskContext = tasks.length > 0 ?
    `Current tasks:\n${tasks.map(t => `- ${t.title} (Priority: ${t.priority}, Due: ${t.date || 'N/A'})`).join('\n')}` :
    "No tasks currently available.";

  return getEnhancedAiResponse(prompt, taskContext, history, apiKey);
};
