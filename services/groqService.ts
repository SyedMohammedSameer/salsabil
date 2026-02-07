// services/groqService.ts - Groq API integration via serverless function (Noor 2.0)
import { Task } from '../types';

// Enhanced AI response with memory and action support
export const getEnhancedAiResponse = async (
  prompt: string,
  userContext: string,
  history: {role: string, parts: {text: string}[]}[],
  memories?: string,
  actionResults?: string
): Promise<string> => {
  try {
    const response = await fetch('/.netlify/functions/groq-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        userContext,
        history,
        memories,
        actionResults
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.response || "";

    return text || "I apologize, but I couldn't generate a response. Please try again.";

  } catch (error) {
    console.error("Groq: Error calling API:", error);

    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401')) {
        return "There's an API configuration issue. Please contact support.";
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        return "I've reached my usage limit for now. Please try again later.";
      }
    }

    return "I'm experiencing some technical difficulties. Please try again in a moment.";
  }
};

// Legacy function for backward compatibility
export const getAiChatResponse = async (
  prompt: string,
  tasks: Task[],
  history: {role: string, parts: {text: string}[]}[],
  _apiKey: string
): Promise<string> => {
  const taskContext = tasks.length > 0 ?
    `Current tasks:\n${tasks.map(t => `- ${t.title} (Priority: ${t.priority}, Due: ${t.date || 'N/A'})`).join('\n')}` :
    "No tasks currently available.";

  return getEnhancedAiResponse(prompt, taskContext, history);
};
