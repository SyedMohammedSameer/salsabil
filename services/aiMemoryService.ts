// services/aiMemoryService.ts - Noor AI Long-Term Memory System
import { AIMemory } from '../types';
import { db } from '../lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';

// ============================================================================
// HELPERS
// ============================================================================

const memoryCollection = (userId: string) =>
  collection(db, 'users', userId, 'ai_memory');

/**
 * Converts a Firestore document snapshot into an AIMemory object.
 */
const docToMemory = (docSnap: any): AIMemory => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    category: data.category,
    content: data.content,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    relevanceScore: data.relevanceScore,
    sourceConversationId: data.sourceConversationId,
  };
};

// ============================================================================
// SAVE MEMORY
// ============================================================================

/**
 * Save a new memory entry to Firestore.
 * @returns The Firestore document ID of the newly created memory.
 */
export const saveMemory = async (
  userId: string,
  memory: Omit<AIMemory, 'id' | 'createdAt'>
): Promise<string> => {
  const colRef = memoryCollection(userId);
  const docRef = await addDoc(colRef, {
    ...memory,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

// ============================================================================
// GET RELEVANT MEMORIES
// ============================================================================

/**
 * Retrieve memories sorted by relevanceScore (descending).
 * Optionally filter by category. Defaults to a maximum of 20 results.
 */
export const getRelevantMemories = async (
  userId: string,
  category?: AIMemory['category'],
  maxCount: number = 20
): Promise<AIMemory[]> => {
  const colRef = memoryCollection(userId);

  let q;
  if (category) {
    q = query(
      colRef,
      where('category', '==', category),
      orderBy('relevanceScore', 'desc'),
      limit(maxCount)
    );
  } else {
    q = query(
      colRef,
      orderBy('relevanceScore', 'desc'),
      limit(maxCount)
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToMemory);
};

// ============================================================================
// DECAY MEMORIES
// ============================================================================

/**
 * Reduce the relevanceScore of every memory by 0.05 (minimum 0.1).
 * Delete any memory whose relevanceScore is <= 0.1 AND is older than 30 days.
 */
export const decayMemories = async (userId: string): Promise<void> => {
  const colRef = memoryCollection(userId);
  const snapshot = await getDocs(colRef);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const operations: Promise<void>[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const currentScore: number = data.relevanceScore ?? 0.5;
    const createdAt =
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt);

    const newScore = Math.max(currentScore - 0.05, 0.1);

    // Delete stale low-relevance memories
    if (newScore <= 0.1 && createdAt < thirtyDaysAgo) {
      operations.push(deleteDoc(doc(db, 'users', userId, 'ai_memory', docSnap.id)));
    } else {
      operations.push(
        updateDoc(doc(db, 'users', userId, 'ai_memory', docSnap.id), {
          relevanceScore: parseFloat(newScore.toFixed(2)),
        })
      );
    }
  }

  await Promise.all(operations);
};

// ============================================================================
// SUMMARIZE CONVERSATION
// ============================================================================

/** Keyword patterns mapped to memory categories */
const CATEGORY_PATTERNS: {
  category: AIMemory['category'];
  patterns: RegExp[];
}[] = [
  {
    category: 'goal',
    patterns: [
      /i want to\s+(.{5,80})/i,
      /my goal is\s+(.{5,80})/i,
      /i aim to\s+(.{5,80})/i,
      /i plan to\s+(.{5,80})/i,
      /i hope to\s+(.{5,80})/i,
      /i need to\s+(.{5,80})/i,
    ],
  },
  {
    category: 'struggle',
    patterns: [
      /i'?m struggling\s+(.{5,80})/i,
      /having trouble\s+(.{5,80})/i,
      /i can'?t\s+(.{5,80})/i,
      /it'?s hard to\s+(.{5,80})/i,
      /i'?m having difficulty\s+(.{5,80})/i,
      /i find it difficult\s+(.{5,80})/i,
    ],
  },
  {
    category: 'preference',
    patterns: [
      /i prefer\s+(.{5,80})/i,
      /i like\s+(.{5,80})/i,
      /i enjoy\s+(.{5,80})/i,
      /i love\s+(.{5,80})/i,
      /i'?d rather\s+(.{5,80})/i,
    ],
  },
  {
    category: 'milestone',
    patterns: [
      /i completed\s+(.{5,80})/i,
      /i finished\s+(.{5,80})/i,
      /alhamdulillah\s*(.{0,80})/i,
      /i achieved\s+(.{5,80})/i,
      /i did it\s*(.{0,80})/i,
      /i managed to\s+(.{5,80})/i,
    ],
  },
];

/**
 * Parse a conversation for meaningful content and save each extracted item
 * as a separate memory with relevanceScore 0.9.
 */
export const summarizeConversation = async (
  userId: string,
  messages: { role: string; content: string }[]
): Promise<void> => {
  const extracted: { category: AIMemory['category']; content: string }[] = [];

  for (const message of messages) {
    // Only analyse user messages — AI messages aren't user memories
    if (message.role !== 'user') continue;

    for (const { category, patterns } of CATEGORY_PATTERNS) {
      for (const pattern of patterns) {
        const match = message.content.match(pattern);
        if (match) {
          // Use captured group if available, otherwise use the full match context
          const rawContent = (match[1] || match[0]).trim();
          // Clean trailing punctuation and truncate
          const content = rawContent.replace(/[.!?,;:]+$/, '').substring(0, 200);

          // Avoid near-duplicate extractions in the same conversation
          const isDuplicate = extracted.some(
            (e) => e.category === category && e.content.toLowerCase() === content.toLowerCase()
          );

          if (!isDuplicate && content.length > 0) {
            extracted.push({ category, content });
          }
        }
      }
    }
  }

  // Save all extracted memories in parallel
  const saveOps = extracted.map((item) =>
    saveMemory(userId, {
      category: item.category,
      content: item.content,
      relevanceScore: 0.9,
    })
  );

  await Promise.all(saveOps);
};

// ============================================================================
// BOOST MEMORY
// ============================================================================

/**
 * Boost a specific memory's relevance score to 1.0.
 * Called when the memory is referenced or useful in a conversation.
 */
export const boostMemory = async (
  memoryId: string,
  userId: string
): Promise<void> => {
  const memoryRef = doc(db, 'users', userId, 'ai_memory', memoryId);
  await updateDoc(memoryRef, {
    relevanceScore: 1.0,
  });
};
