
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Task } from '../types';
import { GEMINI_TEXT_MODEL, MOCK_AI_RESPONSES } from '../constants';

// Ensure that process.env.API_KEY is accessed correctly.
// For client-side, this would typically be injected by a build tool or handled by a backend proxy.
// As per instructions, assume process.env.API_KEY is available.
// If not, we'll use a passed apiKey or fall back to mock data.

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
    ai = new GoogleGenAI({ apiKey });
    currentApiKey = apiKey;
    return ai;
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI client:", error);
    ai = null;
    currentApiKey = null;
    return null;
  }
};

const generateMockResponse = async (message: string): Promise<string> => {
  return new Promise(resolve => setTimeout(() => resolve(message), 500));
};


export const getAiChatResponse = async (prompt: string, tasks: Task[], history: {role: string, parts: {text: string}[]}[], apiKey: string): Promise<string> => {
  const client = initializeAiClient(apiKey);
  if (!client) {
    return generateMockResponse(MOCK_AI_RESPONSES.NO_KEY + " (Mocked: " + prompt + ")");
  }

  const taskContext = tasks.length > 0 ? `\n\nCurrent tasks:\n${tasks.map(t => `- ${t.title} (Priority: ${t.priority}, Due: ${t.date || 'N/A'})`).join('\n')}` : "";
  const fullPrompt = `${prompt}${taskContext}`;
  
  try {
     const chat = client.chats.create({
      model: GEMINI_TEXT_MODEL,
      history: history,
      config: {
        systemInstruction: "You are a helpful productivity assistant for the FocusFlow app. Be concise and actionable. Use the provided task list for context if relevant.",
      }
    });
    const result: GenerateContentResponse = await chat.sendMessage({ message: fullPrompt });
    return result.text;
  } catch (error) {
    console.error("Error calling Gemini API (getAiChatResponse):", error);
    return MOCK_AI_RESPONSES.ERROR;
  }
};

export const summarizeWeeklyProgress = async (tasks: Task[], apiKey: string): Promise<string> => {
  const client = initializeAiClient(apiKey);
  if (!client) {
    return generateMockResponse(MOCK_AI_RESPONSES.NO_KEY + " (Mocked Summary)");
  }

  if (tasks.length === 0) {
    return "No tasks to summarize for the week.";
  }

  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = tasks.length - completedTasks;
  const prompt = `Summarize the user's progress based on these tasks. Completed: ${completedTasks}, Pending: ${pendingTasks}. Tasks: ${JSON.stringify(tasks.map(t => ({title: t.title, status: t.completed? 'completed':'pending', priority: t.priority, date: t.date})))}.`;

  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful productivity assistant. Summarize the user's weekly progress based on their task list. Be encouraging and brief.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API (summarizeWeeklyProgress):", error);
    return MOCK_AI_RESPONSES.ERROR;
  }
};

export const suggestNextSteps = async (tasks: Task[], apiKey: string): Promise<string> => {
  const client = initializeAiClient(apiKey);
  if (!client) {
    return generateMockResponse(MOCK_AI_RESPONSES.NO_KEY + " (Mocked Next Steps)");
  }
  if (tasks.length === 0) {
    return "No tasks to suggest steps for. Add some tasks first!";
  }
  const highPriorityTasks = tasks.filter(t => t.priority === 'High' && !t.completed).map(t => t.title).join(', ');
  const prompt = `Given the following tasks, suggest 2-3 actionable next steps for the user. Focus on incomplete tasks, especially high priority ones. Tasks: ${JSON.stringify(tasks.map(t => ({title: t.title, completed: t.completed, priority: t.priority, date: t.date})))}. High priority incomplete tasks: ${highPriorityTasks || 'None'}.`;

  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful productivity assistant. Provide actionable next steps based on the user's task list. Be specific and encouraging.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API (suggestNextSteps):", error);
    return MOCK_AI_RESPONSES.ERROR;
  }
};

export const getFocusSuggestion = async (tasks: Task[], apiKey: string): Promise<string> => {
  const client = initializeAiClient(apiKey);
  if (!client) {
    return generateMockResponse(MOCK_AI_RESPONSES.NO_KEY + " (Mocked Focus Suggestion)");
  }
  const incompleteTasks = tasks.filter(t => !t.completed);
  if (incompleteTasks.length === 0) {
    return "You've completed all your tasks! Great job. Maybe plan for tomorrow or relax.";
  }
  const prompt = `Based on these incomplete tasks, what should the user focus on next or tomorrow? Prioritize tasks that are due soon or have high priority. Tasks: ${JSON.stringify(incompleteTasks.map(t => ({title: t.title, date: t.date, priority: t.priority})))}.`;

  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful productivity assistant. Help the user decide what to focus on next. Be specific.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API (getFocusSuggestion):", error);
    return MOCK_AI_RESPONSES.ERROR;
  }
};
