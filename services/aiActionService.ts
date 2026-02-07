import { AIAction, AIActionResult, Task, Priority } from '../types';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ---------------------------------------------------------------------------
// 1. Parse action commands embedded in the AI response
// ---------------------------------------------------------------------------

export function parseActionsFromResponse(aiResponse: string): {
  text: string;
  actions: AIAction[];
} {
  const actionRegex = /\[ACTION:(\w+)\|(\{.*?\})\]/g;
  const actions: AIAction[] = [];
  let match: RegExpExecArray | null;

  while ((match = actionRegex.exec(aiResponse)) !== null) {
    try {
      const type = match[1] as AIAction['type'];
      const params = JSON.parse(match[2]);
      const action: AIAction = {
        type,
        params,
        confidence: 0.9,
        description: generateActionDescription({ type, params, confidence: 0.9, description: '' }),
      };
      actions.push(action);
    } catch {
      // Skip malformed action blocks
      console.warn('Failed to parse action block:', match[0]);
    }
  }

  const text = aiResponse.replace(actionRegex, '').trim();

  return { text, actions };
}

// ---------------------------------------------------------------------------
// 2. Execute a single action
// ---------------------------------------------------------------------------

export async function executeAction(
  userId: string,
  action: AIAction,
): Promise<AIActionResult> {
  try {
    switch (action.type) {
      case 'createTask':
        return await handleCreateTask(userId, action);
      case 'completeTask':
        return await handleCompleteTask(userId, action);
      case 'rescheduleTask':
        return await handleRescheduleTask(userId, action);
      case 'logPrayer':
        return await handleLogPrayer(userId, action);
      case 'logQuranPages':
        return await handleLogQuranPages(userId, action);
      case 'startPomodoro':
        return handleStartPomodoro(action);
      case 'createStudyRoom':
        return handleCreateStudyRoom(action);
      default:
        return {
          success: false,
          message: `Unknown action type: ${(action as AIAction).type}`,
          action,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Action failed: ${error?.message ?? 'Unknown error'}`,
      action,
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Execute multiple actions sequentially
// ---------------------------------------------------------------------------

export async function executeActions(
  userId: string,
  actions: AIAction[],
): Promise<AIActionResult[]> {
  const results: AIActionResult[] = [];
  for (const action of actions) {
    const result = await executeAction(userId, action);
    results.push(result);
  }
  return results;
}

// ---------------------------------------------------------------------------
// 4. Generate a human-readable description for an action
// ---------------------------------------------------------------------------

export function generateActionDescription(action: AIAction): string {
  const { type, params } = action;

  switch (type) {
    case 'createTask': {
      const parts: string[] = [`Create task: ${params.title}`];
      if (params.priority) parts.push(`(${params.priority} priority`);
      else parts.push('(Medium priority');
      if (params.date) {
        const formatted = formatDateLabel(params.date);
        parts[parts.length - 1] += `, due ${formatted})`;
      } else {
        parts[parts.length - 1] += ')';
      }
      return parts.join(' ');
    }
    case 'completeTask':
      return `Complete task: ${params.taskId ?? params.title ?? 'unknown'}`;
    case 'rescheduleTask':
      return `Reschedule task "${params.taskId ?? params.title}" to ${formatDateLabel(params.date)}`;
    case 'logPrayer':
      return `Log ${params.type ?? 'fardh'} prayer: ${params.prayer}`;
    case 'logQuranPages':
      return `Log ${params.pages} Quran page${params.pages === 1 ? '' : 's'} read`;
    case 'startPomodoro':
      return `Start ${params.duration ?? 25}-minute Pomodoro session`;
    case 'createStudyRoom':
      return `Create a study room${params.name ? ': ' + params.name : ''}`;
    default:
      return `Execute action: ${type}`;
  }
}

// ---------------------------------------------------------------------------
// Internal handlers
// ---------------------------------------------------------------------------

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// --- createTask ---

async function handleCreateTask(
  userId: string,
  action: AIAction,
): Promise<AIActionResult> {
  try {
    const { title, description, date, priority, startTime, endTime } = action.params;

    const taskId = Date.now().toString();
    const task: Task = {
      id: taskId,
      title: title ?? 'Untitled Task',
      description: description ?? '',
      date: date ?? getTodayDateString(),
      priority: (priority as Priority) ?? Priority.Medium,
      subtasks: [],
      completedSubtasks: 0,
      completed: false,
      ...(startTime ? { startTime } : {}),
      ...(endTime ? { endTime } : {}),
    };

    const tasksRef = collection(db, 'users', userId, 'tasks');
    await addDoc(tasksRef, task);

    return {
      success: true,
      message: `Task "${task.title}" created successfully.`,
      action,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to create task: ${error?.message ?? 'Unknown error'}`,
      action,
    };
  }
}

// --- completeTask ---

async function handleCompleteTask(
  userId: string,
  action: AIAction,
): Promise<AIActionResult> {
  try {
    const { taskId, title } = action.params;
    const tasksRef = collection(db, 'users', userId, 'tasks');

    // First try to find by document ID
    if (taskId) {
      const taskDocRef = doc(db, 'users', userId, 'tasks', taskId);
      const taskSnap = await getDoc(taskDocRef);

      if (taskSnap.exists()) {
        await updateDoc(taskDocRef, { completed: true });
        return {
          success: true,
          message: `Task "${taskSnap.data().title ?? taskId}" marked as complete.`,
          action,
        };
      }

      // Try matching by the custom id field
      const byIdQuery = query(tasksRef, where('id', '==', taskId));
      const byIdSnap = await getDocs(byIdQuery);

      if (!byIdSnap.empty) {
        const matchDoc = byIdSnap.docs[0];
        await updateDoc(matchDoc.ref, { completed: true });
        return {
          success: true,
          message: `Task "${matchDoc.data().title ?? taskId}" marked as complete.`,
          action,
        };
      }
    }

    // Fall back to title-based search (case-insensitive partial match)
    const searchTerm = title ?? taskId ?? '';
    if (searchTerm) {
      const allTasksSnap = await getDocs(tasksRef);
      const lowerSearch = searchTerm.toLowerCase();
      const matched = allTasksSnap.docs.find((d) => {
        const t = d.data().title as string | undefined;
        return t && t.toLowerCase().includes(lowerSearch);
      });

      if (matched) {
        await updateDoc(matched.ref, { completed: true });
        return {
          success: true,
          message: `Task "${matched.data().title}" marked as complete.`,
          action,
        };
      }
    }

    return {
      success: false,
      message: `Could not find task "${taskId ?? title ?? 'unknown'}" to complete.`,
      action,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to complete task: ${error?.message ?? 'Unknown error'}`,
      action,
    };
  }
}

// --- rescheduleTask ---

async function handleRescheduleTask(
  userId: string,
  action: AIAction,
): Promise<AIActionResult> {
  try {
    const { taskId, title, date } = action.params;

    if (!date) {
      return { success: false, message: 'No new date provided for rescheduling.', action };
    }

    const tasksRef = collection(db, 'users', userId, 'tasks');

    // Try direct doc lookup
    if (taskId) {
      const taskDocRef = doc(db, 'users', userId, 'tasks', taskId);
      const taskSnap = await getDoc(taskDocRef);

      if (taskSnap.exists()) {
        await updateDoc(taskDocRef, { date });
        return {
          success: true,
          message: `Task "${taskSnap.data().title ?? taskId}" rescheduled to ${formatDateLabel(date)}.`,
          action,
        };
      }

      // Try by custom id field
      const byIdQuery = query(tasksRef, where('id', '==', taskId));
      const byIdSnap = await getDocs(byIdQuery);

      if (!byIdSnap.empty) {
        const matchDoc = byIdSnap.docs[0];
        await updateDoc(matchDoc.ref, { date });
        return {
          success: true,
          message: `Task "${matchDoc.data().title ?? taskId}" rescheduled to ${formatDateLabel(date)}.`,
          action,
        };
      }
    }

    // Title-based fallback
    const searchTerm = title ?? taskId ?? '';
    if (searchTerm) {
      const allTasksSnap = await getDocs(tasksRef);
      const lowerSearch = searchTerm.toLowerCase();
      const matched = allTasksSnap.docs.find((d) => {
        const t = d.data().title as string | undefined;
        return t && t.toLowerCase().includes(lowerSearch);
      });

      if (matched) {
        await updateDoc(matched.ref, { date });
        return {
          success: true,
          message: `Task "${matched.data().title}" rescheduled to ${formatDateLabel(date)}.`,
          action,
        };
      }
    }

    return {
      success: false,
      message: `Could not find task "${taskId ?? title ?? 'unknown'}" to reschedule.`,
      action,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to reschedule task: ${error?.message ?? 'Unknown error'}`,
      action,
    };
  }
}

// --- logPrayer ---

async function handleLogPrayer(
  userId: string,
  action: AIAction,
): Promise<AIActionResult> {
  try {
    const { prayer, type: prayerType } = action.params;
    const today = getTodayDateString();
    const field = prayerType === 'sunnah' ? 'sunnah' : 'fardh';

    const prayerLogsRef = doc(db, 'users', userId, 'settings', 'prayerLogs');
    await updateDoc(prayerLogsRef, {
      [`${today}.prayers.${prayer}.${field}`]: true,
    });

    return {
      success: true,
      message: `Logged ${field} prayer: ${prayer}.`,
      action,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to log prayer: ${error?.message ?? 'Unknown error'}`,
      action,
    };
  }
}

// --- logQuranPages ---

async function handleLogQuranPages(
  userId: string,
  action: AIAction,
): Promise<AIActionResult> {
  try {
    const { pages } = action.params;
    const today = getTodayDateString();

    const quranLogsRef = doc(db, 'users', userId, 'settings', 'quranLogs');
    await updateDoc(quranLogsRef, {
      [`${today}.readQuran`]: true,
      [`${today}.pagesRead`]: pages ?? 0,
    });

    return {
      success: true,
      message: `Logged ${pages ?? 0} Quran page${pages === 1 ? '' : 's'} read.`,
      action,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to log Quran pages: ${error?.message ?? 'Unknown error'}`,
      action,
    };
  }
}

// --- startPomodoro ---

function handleStartPomodoro(action: AIAction): AIActionResult {
  const duration = action.params.duration ?? 25;
  return {
    success: true,
    message: `NAVIGATE:pomodoro|${duration}`,
    action,
  };
}

// --- createStudyRoom ---

function handleCreateStudyRoom(action: AIAction): AIActionResult {
  return {
    success: true,
    message: 'NAVIGATE:garden',
    action,
  };
}
