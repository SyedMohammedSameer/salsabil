// Enhanced services/geminiService.ts - FIXED with working Gemini 2.5 Flash API
import { GoogleGenAI } from "@google/genai";
import { Task } from '../types';
import { GEMINI_TEXT_MODEL, MOCK_AI_RESPONSES } from '../constants';

let ai: GoogleGenAI | null = null;
let currentApiKey: string | null = null;

const initializeAiClient = (apiKey: string): GoogleGenAI | null => {
  if (!apiKey) {
    console.warn("Gemini API key is not provided. AI service will use mock data.");
    return null;
  }
  if (ai && currentApiKey === apiKey) {
    return ai;
  }
  try {
    ai = new GoogleGenAI(apiKey);
    currentApiKey = apiKey;
    console.log('✨ Gemini: Initialized client with model:', GEMINI_TEXT_MODEL);
    return ai;
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI client:", error);
    ai = null;
    currentApiKey = null;
    return null;
  }
};

const generateMockResponse = async (message: string): Promise<string> => {
  return new Promise(resolve => setTimeout(() => resolve(generateContextualMockResponse(message)), 800));
};

// Enhanced system prompt for Noor
const NOOR_SYSTEM_PROMPT = `
You are Noor, an intelligent AI assistant for the Salsabil productivity and spiritual growth app. Your name means "light" in Arabic, representing guidance and enlightenment.

CORE PERSONALITY:
- Wise, encouraging, and supportive
- Culturally sensitive and spiritually aware
- Practical and action-oriented
- Warm but professional tone
- Use Islamic greetings appropriately when relevant

CAPABILITIES:
- Comprehensive analysis of productivity patterns
- Spiritual growth guidance and insights
- Task management and prioritization assistance
- Prayer and Quran reading encouragement
- Work-life-spiritual balance optimization
- Personalized recommendations based on user data

GUIDELINES:
- Keep responses concise and to the point (10-60 words for quick responses, longer for detailed analysis)
- Focus on actionable insights and clear next steps
- Use plain text formatting only - no markdown, stars, or special characters
- For lists, use simple numbers or dashes without formatting
- Be specific but brief in your advice
- Respect Islamic principles when giving spiritual advice
- Use emojis sparingly but effectively for warmth

RESPONSE STRUCTURE:
1. Brief acknowledgment of the user's situation
2. 1-2 key insights or recommendations
3. One clear next step or action item

FORMATTING RULES:
- Use plain text only
- No markdown formatting
- No asterisks or stars
- No bold or italic text
- Use simple dashes (-) for lists
- Keep line breaks minimal

Remember: You have access to comprehensive user data including tasks, prayer logs, Quran reading, and productivity patterns. Use this data to provide focused, actionable assistance.
`;

// Enhanced AI response function with comprehensive context
export const getEnhancedAiResponse = async (
  prompt: string, 
  userContext: string,
  history: {role: string, parts: {text: string}[]}[], 
  apiKey: string
): Promise<string> => {
  const client = initializeAiClient(apiKey);
  if (!client) {
    console.log('🤖 Gemini: Using mock mode - no API key');
    return generateMockResponse(
      `${MOCK_AI_RESPONSES.NO_KEY}\n\n*Noor (Mock Mode):* ${generateContextualMockResponse(prompt)}`
    );
  }

  const fullPrompt = `
USER CONTEXT:
${userContext}

USER REQUEST: ${prompt}

Please provide a personalized response based on the comprehensive user data above.
`;
  
  try {
    console.log('🤖 Gemini: Making API call with model:', GEMINI_TEXT_MODEL);
    
    const model = client.getGenerativeModel({ 
      model: GEMINI_TEXT_MODEL,
      systemInstruction: NOOR_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1000,
      }
    });
    
    // Build the chat history for Gemini format
    const chatHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.parts[0]?.text || '' }]
    }));
    
    const chat = model.startChat({
      history: chatHistory
    });
    
    const result = await chat.sendMessage(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('🤖 Gemini: Received response of length:', text.length);
    return text || "I apologize, but I couldn't generate a response. Please try again.";
    
  } catch (error) {
    console.error("🤖 Gemini: Error calling API:", error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return "It looks like there's an issue with the API key. Please check your configuration and try again. 🔑";
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        return "I've reached my usage limit for now. Please try again later, or I can help you with basic suggestions! 🌟";
      } else if (error.message.includes('model')) {
        return "There's an issue with the AI model. Please try again in a moment! 🔄";
      }
    }
    
    return "I'm experiencing some technical difficulties right now. Please try again in a moment, and I'll do my best to help you! 🌟";
  }
};

// Legacy function for backward compatibility
export const getAiChatResponse = async (
  prompt: string, 
  tasks: Task[], 
  history: {role: string, parts: {text: string}[]}[], 
  apiKey: string
): Promise<string> => {
  const taskContext = tasks.length > 0 ? 
    `Current tasks:\n${tasks.map(t => `- ${t.title} (Priority: ${t.priority}, Due: ${t.date || 'N/A'}, Status: ${t.completed ? 'Completed' : 'Pending'})`).join('\n')}` : 
    "No tasks currently available.";
  
  return getEnhancedAiResponse(prompt, taskContext, history, apiKey);
};

// Enhanced specialized functions
export const summarizeWeeklyProgress = async (tasks: Task[], apiKey: string): Promise<string> => {
  const client = initializeAiClient(apiKey);
  if (!client) {
    return generateMockResponse(
      "📊 Weekly Summary: You've made solid progress this week! Focus on completing those high-priority tasks, and don't forget your spiritual practices. Every small step counts toward your growth! ✨"
    );
  }

  if (tasks.length === 0) {
    return "It looks like you haven't added any tasks yet this week. Would you like help setting up some goals and tasks to work toward? I'm here to guide you! 🎯";
  }

  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = tasks.length - completedTasks;
  const highPriorityPending = tasks.filter(t => t.priority === 'High' && !t.completed).length;
  
  const prompt = `Provide a comprehensive weekly progress summary with insights and encouragement. 
  
  Data:
  - Total tasks: ${tasks.length}
  - Completed: ${completedTasks}
  - Pending: ${pendingTasks}
  - High priority pending: ${highPriorityPending}
  
  Task details: ${JSON.stringify(tasks.map(t => ({
    title: t.title, 
    status: t.completed ? 'completed' : 'pending', 
    priority: t.priority, 
    date: t.date
  })))}`;

  try {
    const model = client.getGenerativeModel({ 
      model: GEMINI_TEXT_MODEL,
      systemInstruction: NOOR_SYSTEM_PROMPT + "\n\nFocus on providing a weekly progress summary with specific insights and actionable encouragement.",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "I'd love to help you review your progress, but I'm having trouble accessing that information right now. How do you feel your week has gone so far?";
  } catch (error) {
    console.error("Error calling Gemini API (summarizeWeeklyProgress):", error);
    return "I'm having trouble generating your summary right now, but I can see you're working hard! Keep up the great momentum! 💪";
  }
};

export const suggestNextSteps = async (tasks: Task[], apiKey: string): Promise<string> => {
  const client = initializeAiClient(apiKey);
  if (!client) {
    return generateMockResponse(
      "🎯 Next Steps: 1. Focus on your highest priority incomplete tasks 2. Break large tasks into smaller, manageable steps 3. Schedule specific times for important work 4. Take breaks and maintain balance. You've got this! 🌟"
    );
  }
  
  if (tasks.length === 0) {
    return "Let's start by adding some tasks to work on! What are your main goals or priorities right now? I can help you break them down into manageable steps. 📝";
  }
  
  const incompleteTasks = tasks.filter(t => !t.completed);
  const highPriorityTasks = incompleteTasks.filter(t => t.priority === 'High');
  const overdueTasks = incompleteTasks.filter(t => new Date(t.date) < new Date());
  
  const prompt = `Provide 3-4 specific, actionable next steps based on the user's task data.
  
  Context:
  - Total incomplete tasks: ${incompleteTasks.length}
  - High priority tasks: ${highPriorityTasks.length}
  - Overdue tasks: ${overdueTasks.length}
  
  Task details: ${JSON.stringify(incompleteTasks.map(t => ({
    title: t.title, 
    priority: t.priority, 
    date: t.date,
    description: t.description
  })))}
  
  Focus on urgent items, high priorities, and maintaining momentum.`;

  try {
    const model = client.getGenerativeModel({ 
      model: GEMINI_TEXT_MODEL,
      systemInstruction: NOOR_SYSTEM_PROMPT + "\n\nProvide specific, actionable next steps prioritized by urgency and importance.",
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 500,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Focus on your highest priority tasks first, and remember to take breaks! What feels most important to tackle right now?";
  } catch (error) {
    console.error("Error calling Gemini API (suggestNextSteps):", error);
    return "I recommend focusing on your highest priority tasks first. Break them into smaller steps and celebrate small wins along the way! 🎯";
  }
};

export const getFocusSuggestion = async (tasks: Task[], apiKey: string): Promise<string> => {
  const client = initializeAiClient(apiKey);
  if (!client) {
    return generateMockResponse(
      "🎯 Focus Suggestion: For tomorrow, I suggest prioritizing your most important incomplete task. Start with something achievable to build momentum, then tackle the bigger challenges. Remember to balance work with spiritual practices! 🌙"
    );
  }
  
  const incompleteTasks = tasks.filter(t => !t.completed);
  if (incompleteTasks.length === 0) {
    return "Subhan'Allah! You've completed all your tasks! 🎉 This is a perfect time to reflect on your achievements, plan for tomorrow, or spend extra time in spiritual reflection. What would feel most beneficial right now?";
  }
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split('T')[0];
  
  const tomorrowTasks = incompleteTasks.filter(t => t.date === tomorrowString);
  const urgentTasks = incompleteTasks.filter(t => new Date(t.date) <= tomorrow);
  
  const prompt = `Suggest what the user should focus on next or tomorrow based on their incomplete tasks.
  
  Context:
  - Tomorrow's tasks: ${tomorrowTasks.length}
  - Urgent tasks (due soon): ${urgentTasks.length}
  - All incomplete tasks: ${incompleteTasks.length}
  
  Task details: ${JSON.stringify(incompleteTasks.map(t => ({
    title: t.title,
    date: t.date,
    priority: t.priority,
    description: t.description
  })))}
  
  Provide a focused recommendation for what to prioritize next.`;

  try {
    const model = client.getGenerativeModel({ 
      model: GEMINI_TEXT_MODEL,
      systemInstruction: NOOR_SYSTEM_PROMPT + "\n\nProvide focused guidance on what to prioritize next, considering deadlines and importance.",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 400,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Focus on your most urgent tasks first, and don't forget to maintain balance in your day. What feels most important to you right now?";
  } catch (error) {
    console.error("Error calling Gemini API (getFocusSuggestion):", error);
    return "Tomorrow, start with your highest priority task to build momentum. Remember to begin with Bismillah and keep your intentions pure! 🌟";
  }
};

// Helper function to generate contextual mock responses
const generateContextualMockResponse = (prompt: string): string => {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('prayer') || lowerPrompt.includes('salah')) {
    return "Your prayer consistency is the foundation of spiritual growth. Try setting gentle reminders and creating a peaceful prayer space. May Allah make it easy for you! 🤲";
  }
  
  if (lowerPrompt.includes('quran') || lowerPrompt.includes('reading')) {
    return "Consistent Quran reading, even a few verses daily, brings immense barakah. Start small and build gradually. The key is consistency over quantity! 📖✨";
  }
  
  if (lowerPrompt.includes('task') || lowerPrompt.includes('productivity')) {
    return "Break your tasks into smaller steps and celebrate small wins. Remember to balance hustle with rest - Allah loves consistent deeds even if they're small! ⚡";
  }
  
  if (lowerPrompt.includes('balance') || lowerPrompt.includes('stress')) {
    return "True balance comes from prioritizing what matters most. Make time for prayer, family, and personal growth alongside your worldly responsibilities. You're doing better than you think! ⚖️";
  }
  
  if (lowerPrompt.includes('goal') || lowerPrompt.includes('plan')) {
    return "Set intentions that align with your values. Break big goals into weekly milestones, and remember that progress isn't always linear. Trust the process! 🎯";
  }
  
  return "I'm here to help you grow in both productivity and spirituality. Even in mock mode, remember that every small step forward is progress worth celebrating! 🌟";
};

// Spiritual guidance specialized function
export const getSpiritualGuidance = async (
  prayerData: any, 
  quranData: any, 
  apiKey: string
): Promise<string> => {
  const client = initializeAiClient(apiKey);
  if (!client) {
    return generateMockResponse(
      "🤲 Spiritual Guidance: Focus on consistency over perfection. Start each day with intention, maintain regular prayer times, and read Quran daily even if just a few verses. Small, consistent acts of worship are beloved to Allah. May your spiritual journey be filled with peace and growth! ✨"
    );
  }

  const prompt = `Provide personalized spiritual guidance based on the user's prayer and Quran reading data.
  
  Prayer Data: ${JSON.stringify(prayerData)}
  Quran Data: ${JSON.stringify(quranData)}
  
  Offer gentle, encouraging advice for spiritual growth while being respectful of Islamic principles.`;

  try {
    const model = client.getGenerativeModel({ 
      model: GEMINI_TEXT_MODEL,
      systemInstruction: NOOR_SYSTEM_PROMPT + "\n\nProvide gentle, encouraging spiritual guidance rooted in Islamic principles. Be supportive and practical.",
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 600,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Remember that spiritual growth is a journey, not a destination. Be patient with yourself and trust in Allah's timing. Every sincere effort is blessed! 🤲";
  } catch (error) {
    console.error("Error calling Gemini API (getSpiritualGuidance):", error);
    return "Your spiritual journey is unique and beautiful. Focus on consistency, seek knowledge, and remember that Allah is always there to guide you. Keep moving forward with hope! 🌙";
  }
};