import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import Groq from 'groq-sdk';

const GROQ_MODEL = "llama-3.3-70b-versatile";

const NOOR_NOTIFICATION_SYSTEM_PROMPT = `You are Noor, an intelligent AI companion for Salsabil - a productivity and spiritual growth app. Your role is to generate personalized, contextual notifications that help users stay motivated and consistent with their goals.

PERSONALITY:
- Wise and encouraging, like a supportive friend
- Culturally sensitive to Islamic values
- Natural and conversational (not robotic)
- Concise but impactful (40-60 words max)
- Use plain text only (no markdown, asterisks, or special formatting)

YOUR TASK:
Analyze the user's current situation and generate a personalized notification that feels natural, timely, and helpful.

GUIDELINES:
1. Reference specific data when relevant (e.g., "You've completed 3 of 5 tasks today")
2. Adapt tone based on user's progress (celebratory if doing well, encouraging if struggling)
3. Don't be repetitive - vary your messages
4. Be culturally sensitive (use Islamic greetings appropriately)
5. Make notifications actionable when possible
6. Respect the user's time - don't be annoying
7. Use "you" and speak directly to the user
8. Avoid clichés and generic phrases

TONE TYPES:
- motivational: Energetic, inspiring (when user needs a boost)
- reminder: Gentle, helpful (when user might have forgotten something)
- celebration: Joyful, proud (when user achieves something)
- gentle_nudge: Soft, non-pushy (when user is slightly off track)

RESPOND with a JSON object containing:
{
  "title": "Short title (4-6 words)",
  "body": "Main message (40-60 words)",
  "tone": "motivational|reminder|celebration|gentle_nudge",
  "link": "Optional deep link (e.g., '#planner', '#prayer-tracker')"
}`;

interface NotificationContext {
  userId: string;
  currentTime: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  userStats: {
    tasksTotal: number;
    tasksCompleted: number;
    prayersTotal: number;
    prayersCompleted: number;
    quranPagesReadToday: number;
    focusMinutesTotal: number;
    weeklyTaskCompletionRate: number;
    weeklyPrayerRate: number;
    currentQuranStreak: number;
    treesPlantedThisWeek: number;
    hasUpcomingTasks: boolean;
    hasMissedPrayers: boolean;
    isOnStreak: boolean;
  };
  userProfile: {
    communicationStyle: string;
    preferredNotificationTimes: string[];
    userPreferences: {
      likesEmojis: boolean;
      prefersShortMessages: boolean;
      respondsToMotivation: boolean;
    };
    learningData: {
      mostProductiveTime: string;
      averageTaskCompletionRate: number;
      prayerConsistencyScore: number;
    };
  };
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { notificationContext } = JSON.parse(event.body || '{}') as { notificationContext: NotificationContext };

    if (!notificationContext) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Notification context is required' })
      };
    }

    // Get API key from environment
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    // Build context summary for AI
    const contextSummary = buildContextSummary(notificationContext);

    // Initialize Groq client
    const groq = new Groq({ apiKey });

    // Call Groq API
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: NOOR_NOTIFICATION_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `Generate a personalized notification for this user:\n\n${contextSummary}\n\nRespond with ONLY valid JSON - no additional text.`
        }
      ],
      temperature: 0.9, // Higher creativity for varied messages
      max_tokens: 200,
      top_p: 0.95,
    });

    const rawResponse = response.choices[0]?.message?.content || "";

    // Parse JSON response
    let notification;
    try {
      // Remove any potential markdown code blocks
      const cleanedResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      notification = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', rawResponse);
      // Fallback to a default notification
      notification = {
        title: "Check in from Noor",
        body: "How's your day going? Let's review your progress together.",
        tone: "gentle_nudge",
        link: "#dashboard"
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(notification)
    };

  } catch (error) {
    console.error('AI Notification Generator Error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to generate notification",
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

function buildContextSummary(ctx: NotificationContext): string {
  const { userStats, userProfile, timeOfDay, dayOfWeek } = ctx;

  const parts: string[] = [];

  // Time context
  parts.push(`TIME: ${timeOfDay} on ${dayOfWeek}`);

  // Task progress
  if (userStats.tasksTotal > 0) {
    const taskPercentage = Math.round((userStats.tasksCompleted / userStats.tasksTotal) * 100);
    parts.push(`TASKS: ${userStats.tasksCompleted}/${userStats.tasksTotal} completed today (${taskPercentage}%)`);
    if (userStats.hasUpcomingTasks) {
      parts.push(`Has upcoming tasks remaining`);
    }
  } else {
    parts.push(`TASKS: No tasks scheduled for today`);
  }

  // Prayer progress
  if (userStats.prayersTotal > 0) {
    const prayerPercentage = Math.round((userStats.prayersCompleted / userStats.prayersTotal) * 100);
    parts.push(`PRAYERS: ${userStats.prayersCompleted}/${userStats.prayersTotal} completed today (${prayerPercentage}%)`);
    if (userStats.hasMissedPrayers) {
      parts.push(`Has missed prayers`);
    }
  }

  // Quran reading
  if (userStats.quranPagesReadToday > 0) {
    parts.push(`QURAN: Read ${userStats.quranPagesReadToday} pages today`);
    if (userStats.currentQuranStreak > 0) {
      parts.push(`On a ${userStats.currentQuranStreak}-day reading streak! 🔥`);
    }
  } else if (userStats.currentQuranStreak > 0) {
    parts.push(`QURAN: ${userStats.currentQuranStreak}-day streak at risk (no reading today yet)`);
  }

  // Focus sessions
  if (userStats.focusMinutesTotal > 0) {
    parts.push(`FOCUS: ${userStats.focusMinutesTotal} minutes of deep work today`);
  }

  // Weekly trends
  if (userStats.weeklyTaskCompletionRate > 0) {
    parts.push(`WEEKLY: ${Math.round(userStats.weeklyTaskCompletionRate * 100)}% task completion rate`);
  }
  if (userStats.weeklyPrayerRate > 0) {
    parts.push(`${Math.round(userStats.weeklyPrayerRate * 100)}% prayer consistency this week`);
  }
  if (userStats.treesPlantedThisWeek > 0) {
    parts.push(`${userStats.treesPlantedThisWeek} trees planted this week`);
  }

  // User preferences
  parts.push(`\nUSER PREFERENCES:`);
  parts.push(`- Communication style: ${userProfile.communicationStyle}`);
  parts.push(`- Prefers ${userProfile.userPreferences.prefersShortMessages ? 'concise' : 'detailed'} messages`);
  parts.push(`- ${userProfile.userPreferences.likesEmojis ? 'Enjoys' : 'Avoids'} emojis`);
  parts.push(`- ${userProfile.userPreferences.respondsToMotivation ? 'Responds well to motivational' : 'Prefers gentle reminder'} tone`);
  parts.push(`- Most productive during: ${userProfile.learningData.mostProductiveTime}`);

  return parts.join('\n');
}
