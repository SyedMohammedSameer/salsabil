// Enhanced services/geminiService.ts - FIXED with working Gemini 1.5 Flash API
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Task } from '../types';
import { MOCK_AI_RESPONSES } from '../constants';

// Use a stable, recommended model
const GEMINI_TEXT_MODEL = "gemini-1.5-flash-latest";

let genAI: GoogleGenerativeAI | null = null;
let currentApiKey: string | null = null;

const initializeAiClient = (apiKey: string): GoogleGenerativeAI | null => {
  if (!apiKey) {
    console.warn("Gemini API key is not provided. AI service will use mock data.");
    return null;
  }
  if (genAI && currentApiKey === apiKey) {
    return genAI;
  }
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    currentApiKey = apiKey;
    console.log('✨ Gemini: Initialized client with model:', GEMINI_TEXT_MODEL);
    return genAI;
  } catch (error) {
    console.error("Failed to initialize GoogleGenerativeAI client:", error);
    genAI = null;
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
    console.log('🤖 Gemini: Using mock mode - no API key');
    return `${MOCK_AI_RESPONSES.NO_KEY}\n\n*Noor (Mock Mode):* I can provide general guidance. How can I help?`;
  }
  
  try {
    console.log('🤖 Gemini: Making API call...');
    
    const model = client.getGenerativeModel({ 
      model: GEMINI_TEXT_MODEL,
      systemInstruction: NOOR_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 1000,
      },
       safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        }
      ],
    });
    
    // The context is now part of the history for the model to see
    const fullHistory = [
        ...history,
        {
            role: 'user',
            parts: [{ text: `CONTEXT:\n${userContext}\n\nREQUEST:\n${prompt}` }]
        }
    ];

    const result = await model.generateContent({
        contents: fullHistory
    });

    const response = result.response;
    const text = response.text();
    
    console.log('🤖 Gemini: Received response of length:', text.length);
    return text || "I apologize, but I couldn't generate a response. Please try again.";
    
  } catch (error) {
    console.error("🤖 Gemini: Error calling API:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return "It looks like there's an issue with your API key. Please check it in your settings. 🔑";
      } else if (error.message.includes('quota')) {
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