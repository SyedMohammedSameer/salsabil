import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit,
  onSnapshot,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StudyRoom, TreeType, TreeGrowthStage, RoomParticipant, Tree } from '../types'; 
import * as firebaseService from './firebaseService';

// Create Study Room
export const createStudyRoom = async (userId: string, userName: string, roomData: {
  name: string;
  description: string;
  maxParticipants: number;
  focusDuration: number;
  treeType: TreeType;
  tags: string[];
}): Promise<string> => {
  try {
    const roomRef = await addDoc(collection(db, 'studyRooms'), {
      ...roomData,
      createdBy: userId,
      createdByName: userName,
      createdAt: serverTimestamp(),
      isActive: true,
      participantCount: 1,
      trees: [],
      currentSessionStart: null
    });

    // Add creator as first participant
    await setDoc(doc(db, 'studyRooms', roomRef.id, 'participants', userId), {
      userId,
      displayName: userName,
      joinedAt: serverTimestamp(),
      isActive: true,
      totalFocusMinutes: 0,
      treesPlanted: 0
    });

    return roomRef.id;
  } catch (error) {
    console.error('Error creating study room:', error);
    throw error;
  }
};

// Enhanced Study Rooms Listener with better error handling
export const setupStudyRoomsListener = (callback: (rooms: StudyRoom[]) => void): Unsubscribe => {
  const roomsQuery = query(
    collection(db, 'studyRooms'),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  
  const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
    const rooms: StudyRoom[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        trees: data.trees || []
      } as StudyRoom;
    });
    callback(rooms);
  }, (error) => {
    console.error('Error in study rooms listener:', error);
    callback([]); // Fallback to empty array on error
  });

  return unsubscribe;
};

// Join Study Room with better validation
// DEBUGGED: Join Study Room with better error reporting and participant count sync
export const joinStudyRoom = async (roomId: string, userId: string, userName: string): Promise<void> => {
  try {
    console.log('🔗 Join attempt - Room:', roomId, 'User:', userName);

    const roomRef = doc(db, 'studyRooms', roomId);
    const participantRef = doc(db, 'studyRooms', roomId, 'participants', userId);

    // Get room and participant data
    const [roomDoc, participantDoc] = await Promise.all([
      getDoc(roomRef),
      getDoc(participantRef)
    ]);

    if (!roomDoc.exists()) {
      console.error('❌ Room not found:', roomId);
      throw new Error('Study circle not found or has been closed');
    }

    const roomData = roomDoc.data();
    console.log('📊 Room data:', {
      name: roomData.name,
      isActive: roomData.isActive,
      participantCount: roomData.participantCount,
      maxParticipants: roomData.maxParticipants
    });

    if (!roomData.isActive) {
      console.error('❌ Room is not active:', roomId);
      throw new Error('This study circle is no longer active');
    }

    // Count actual active participants to verify the count
    const participantsQuery = query(
      collection(db, 'studyRooms', roomId, 'participants'),
      where('isActive', '==', true)
    );
    const activeParticipantsSnapshot = await getDocs(participantsQuery);
    const actualActiveCount = activeParticipantsSnapshot.size;

    console.log('📈 Participant count verification:', {
      storedCount: roomData.participantCount,
      actualActiveCount: actualActiveCount,
      maxParticipants: roomData.maxParticipants,
      userAlreadyExists: participantDoc.exists()
    });

    const batch = writeBatch(db);

    if (participantDoc.exists()) {
      const participantData = participantDoc.data();
      if (participantData.isActive) {
        console.log('✅ User already active in room');
        return; // User is already active, no need to do anything
      }

      console.log('✅ Reactivating existing participant');
      batch.update(participantRef, {
        isActive: true,
        rejoiningAt: serverTimestamp()
      });

      // Update participant count if needed (in case it was out of sync)
      const correctedCount = actualActiveCount + 1;
      if (correctedCount !== roomData.participantCount) {
        console.log('🔧 Correcting participant count:', roomData.participantCount, '->', correctedCount);
        batch.update(roomRef, {
          participantCount: correctedCount,
          lastActivity: serverTimestamp()
        });
      }
    } else {
      // Check capacity using actual count
      if (actualActiveCount >= roomData.maxParticipants) {
        console.error('❌ Room actually full:', actualActiveCount, '>=', roomData.maxParticipants);
        throw new Error('Study circle is full');
      }

      console.log('✅ Adding new participant');
      batch.set(participantRef, {
        userId,
        displayName: userName,
        joinedAt: serverTimestamp(),
        isActive: true,
        totalFocusMinutes: 0,
        treesPlanted: 0
      });

      // Update with corrected count
      const newCount = actualActiveCount + 1;
      batch.update(roomRef, {
        participantCount: newCount,
        lastActivity: serverTimestamp()
      });
    }

    await batch.commit();
    console.log('✅ Successfully joined study circle');
  } catch (error) {
    console.error('❌ Error joining study room:', error);
    throw error;
  }
};

// OPTIMIZED: Fast Leave Study Room with minimal database operations
export const leaveStudyRoom = async (roomId: string, userId: string): Promise<void> => {
  try {
    console.log(`🚪 Fast leaving room ${roomId} for user ${userId}`);

    // Step 1: Immediate participant removal for instant UI feedback
    const participantRef = doc(db, 'studyRooms', roomId, 'participants', userId);

    // Delete participant immediately for fast UI response
    await updateDoc(participantRef, { isActive: false, leftAt: serverTimestamp() });

    // Step 2: Get room data and perform cleanup/ownership transfer asynchronously
    const roomRef = doc(db, 'studyRooms', roomId);
    const roomDoc = await getDoc(roomRef);

    if (!roomDoc.exists()) {
      console.warn('Room does not exist, nothing to leave');
      return;
    }

    const roomData = roomDoc.data();
    const newParticipantCount = Math.max(0, roomData.participantCount - 1);

    // Step 3: Use batch for final cleanup operations
    const batch = writeBatch(db);

    // Always delete the participant document
    batch.delete(participantRef);

    if (newParticipantCount === 0) {
      // Last participant - delete entire room
      console.log(`🗑️ Last participant left room ${roomId}, scheduling cleanup...`);
      batch.delete(roomRef);
    } else {
      // Update participant count immediately
      const updateData: any = {
        participantCount: newParticipantCount,
        lastActivity: serverTimestamp()
      };

      // Handle ownership transfer if needed (simplified)
      if (roomData.createdBy === userId) {
        console.log(`👑 Owner left room ${roomId}, marking for ownership transfer...`);
        updateData.needsOwnershipTransfer = true;
        updateData.previousOwner = userId;
      }

      batch.update(roomRef, updateData);
    }

    // Commit batch operations
    await batch.commit();

    // Step 4: Handle ownership transfer asynchronously (non-blocking)
    if (newParticipantCount > 0 && roomData.createdBy === userId) {
      // Do ownership transfer in background without blocking user
      transferOwnershipAsync(roomId).catch(error => {
        console.error('Background ownership transfer failed:', error);
      });
    }

    console.log(`✅ Successfully left room ${roomId}. Remaining participants: ${newParticipantCount}`);
  } catch (error) {
    console.error('❌ Error leaving study room:', error);
    throw error;
  }
};

// Async ownership transfer (non-blocking)
const transferOwnershipAsync = async (roomId: string): Promise<void> => {
  try {
    console.log(`🔄 Transferring ownership for room ${roomId}...`);

    // Find oldest active participant
    const participantsQuery = query(
      collection(db, 'studyRooms', roomId, 'participants'),
      where('isActive', '==', true),
      orderBy('joinedAt', 'asc'),
      limit(1)
    );

    const snapshot = await getDocs(participantsQuery);

    if (!snapshot.empty) {
      const newOwner = snapshot.docs[0].data();
      console.log(`👑 Transferring ownership to: ${newOwner.displayName}`);

      await updateDoc(doc(db, 'studyRooms', roomId), {
        createdBy: newOwner.userId,
        createdByName: newOwner.displayName,
        needsOwnershipTransfer: false,
        ownershipTransferredAt: serverTimestamp()
      });

      console.log(`✅ Ownership transferred successfully`);
    } else {
      console.warn(`⚠️ No active participants found for ownership transfer`);
    }
  } catch (error) {
    console.error('❌ Async ownership transfer failed:', error);
  }
};

// Plant Tree in Room with enhanced error handling
export const plantTreeInRoom = async (
  roomId: string, 
  userId: string, 
  userName: string, 
  treeType: TreeType, 
  focusMinutes: number,
  treeVariety?: { name: string; emoji: string; color: string }
): Promise<void> => {
  try {
    // Validate inputs
    if (focusMinutes <= 0) {
      throw new Error('Focus time must be greater than 0');
    }

    const newTree: Tree = {
      id: `${Date.now()}_${userId}`,
      type: treeType,
      plantedAt: new Date(),
      growthStage: getGrowthStage(focusMinutes),
      focusMinutes,
      isAlive: true, // Trees are always alive when planted
      plantedBy: userId,
      plantedByName: userName,
      // Add variety information if provided
      varietyName: treeVariety?.name,
      varietyEmoji: treeVariety?.emoji,
      varietyColor: treeVariety?.color
    };

    // Use batch operations for better performance
    const batch = writeBatch(db);
    const roomRef = doc(db, 'studyRooms', roomId);
    const participantRef = doc(db, 'studyRooms', roomId, 'participants', userId);
    
    // Get both documents in parallel
    const [roomDoc, participantDoc] = await Promise.all([
      getDoc(roomRef),
      getDoc(participantRef)
    ]);
    
    if (!roomDoc.exists()) {
      throw new Error('Study circle no longer exists');
    }

    const roomData = roomDoc.data();
    if (!roomData.isActive) {
      throw new Error('Study circle is no longer active');
    }

    const updatedTrees = [...(roomData.trees || []), newTree];
    
    // Batch update room with new tree
    batch.update(roomRef, {
      trees: updatedTrees,
      lastTreePlanted: serverTimestamp()
    });

    // Batch update participant stats if participant exists
    if (participantDoc.exists()) {
      const participantData = participantDoc.data();
      batch.update(participantRef, {
        totalFocusMinutes: (participantData.totalFocusMinutes || 0) + focusMinutes,
        treesPlanted: (participantData.treesPlanted || 0) + 1,
        lastTreePlanted: serverTimestamp()
      });
    }
    
    // Execute batch operation and personal garden save in parallel
    const [batchResult, personalTreeResult] = await Promise.allSettled([
      batch.commit(),
      firebaseService.savePersonalTree(userId, newTree)
    ]);
    
    // Check if batch operation failed (this is critical)
    if (batchResult.status === 'rejected') {
      throw batchResult.reason;
    }
    
    // Warn if personal garden save failed (not critical)
    if (personalTreeResult.status === 'rejected') {
      console.warn('Failed to save tree to personal garden:', personalTreeResult.reason);
    }

    console.log(`Tree planted successfully in room ${roomId} by ${userName}`);
  } catch (error) {
    console.error('Error planting tree:', error);
    throw error;
  }
};

// Get Study Rooms with better error handling
export const getStudyRooms = async (): Promise<StudyRoom[]> => {
  try {
    const roomsQuery = query(
      collection(db, 'studyRooms'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const snapshot = await getDocs(roomsQuery);
    const rooms: StudyRoom[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      rooms.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        trees: data.trees || []
      } as StudyRoom);
    });
    
    return rooms;
  } catch (error) {
    console.error('Error getting study rooms:', error);
    return [];
  }
};

// FIXED: Real-time Room Listener with proper cleanup detection
export const setupRoomListener = (roomId: string, callback: (room: StudyRoom | null) => void): Unsubscribe => {
  const roomRef = doc(db, 'studyRooms', roomId);
  
  return onSnapshot(roomRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const room: StudyRoom = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        currentSessionStart: data.currentSessionStart?.toDate() || null,
        trees: data.trees || []
      } as StudyRoom;
      callback(room);
    } else {
      // Room was deleted - notify callback
      console.log(`Room ${roomId} was deleted`);
      callback(null);
    }
  }, (error) => {
    console.error('Error in room listener:', error);
    callback(null); // Treat errors as room deletion
  });
};

// OPTIMIZED: Real-time Participants Listener - only active participants
export const setupParticipantsListener = (
  roomId: string,
  callback: (participants: RoomParticipant[]) => void
): Unsubscribe => {
  // Only listen for active participants to reduce unnecessary updates
  const participantsQuery = query(
    collection(db, 'studyRooms', roomId, 'participants'),
    where('isActive', '==', true)
  );

  return onSnapshot(participantsQuery, (snapshot) => {
    const participants: RoomParticipant[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      participants.push({
        ...data,
        joinedAt: data.joinedAt?.toDate() || new Date(),
        currentFocusStart: data.currentFocusStart?.toDate()
      } as RoomParticipant);
    });

    // Sort by join time for consistent ordering
    participants.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

    callback(participants);
  }, (error) => {
    console.error('Error in participants listener:', error);
    callback([]); // Fallback to empty array
  });
};

// Cleanup Inactive Rooms (can be called periodically)
export const cleanupInactiveRooms = async (): Promise<void> => {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24); // Clean up rooms older than 24 hours with no activity

    const roomsQuery = query(
      collection(db, 'studyRooms'),
      where('lastActivity', '<=', cutoffTime),
      limit(10)
    );

    const snapshot = await getDocs(roomsQuery);
    const batch = writeBatch(db);

    for (const roomDoc of snapshot.docs) {
      // Check if room has any active participants
      const participantsQuery = query(
        collection(db, 'studyRooms', roomDoc.id, 'participants'),
        where('isActive', '==', true)
      );
      
      const participantsSnapshot = await getDocs(participantsQuery);
      
      if (participantsSnapshot.empty) {
        console.log(`Cleaning up inactive room: ${roomDoc.id}`);
        
        // Delete all participants
        participantsSnapshot.docs.forEach(participantDoc => {
          batch.delete(participantDoc.ref);
        });
        
        // Delete the room
        batch.delete(roomDoc.ref);
      }
    }

    await batch.commit();
  } catch (error) {
    console.error('Error cleaning up inactive rooms:', error);
  }
};

// Room Focus Session Management
export const startRoomFocusSession = async (roomId: string): Promise<void> => {
  try {
    const roomRef = doc(db, 'studyRooms', roomId);
    await updateDoc(roomRef, {
      currentSessionStart: serverTimestamp(),
      lastActivity: serverTimestamp()
    });
    console.log(`Started focus session for room ${roomId}`);
  } catch (error) {
    console.error('Error starting room focus session:', error);
    throw error;
  }
};

export const stopRoomFocusSession = async (roomId: string, killTrees: boolean = false): Promise<void> => {
  try {
    const roomRef = doc(db, 'studyRooms', roomId);

    if (killTrees) {
      // Get current room data and mark all alive trees as dead
      const roomDoc = await getDoc(roomRef);
      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        const updatedTrees = (roomData.trees || []).map((tree: any) => ({
          ...tree,
          isAlive: false,
          diedAt: new Date(),
          deathReason: 'Session interrupted'
        }));

        await updateDoc(roomRef, {
          currentSessionStart: null,
          lastActivity: serverTimestamp(),
          trees: updatedTrees
        });
      }
    } else {
      await updateDoc(roomRef, {
        currentSessionStart: null,
        lastActivity: serverTimestamp()
      });
    }

    console.log(`Stopped focus session for room ${roomId}${killTrees ? ' (trees killed)' : ''}`);
  } catch (error) {
    console.error('Error stopping room focus session:', error);
    throw error;
  }
};

// UTILITY: Sync participant count for a room (fixes data inconsistencies)
export const syncRoomParticipantCount = async (roomId: string): Promise<void> => {
  try {
    console.log('🔄 Syncing participant count for room:', roomId);

    const roomRef = doc(db, 'studyRooms', roomId);
    const participantsQuery = query(
      collection(db, 'studyRooms', roomId, 'participants'),
      where('isActive', '==', true)
    );

    const [roomDoc, activeParticipantsSnapshot] = await Promise.all([
      getDoc(roomRef),
      getDocs(participantsQuery)
    ]);

    if (!roomDoc.exists()) {
      console.log('Room does not exist, nothing to sync');
      return;
    }

    const roomData = roomDoc.data();
    const actualActiveCount = activeParticipantsSnapshot.size;
    const storedCount = roomData.participantCount || 0;

    if (actualActiveCount !== storedCount) {
      console.log('🔧 Fixing participant count mismatch:', {
        stored: storedCount,
        actual: actualActiveCount,
        roomId
      });

      await updateDoc(roomRef, {
        participantCount: actualActiveCount,
        lastActivity: serverTimestamp(),
        countSyncedAt: serverTimestamp()
      });

      console.log('✅ Participant count synced successfully');
    } else {
      console.log('✅ Participant count already accurate');
    }
  } catch (error) {
    console.error('❌ Error syncing participant count:', error);
  }
};

// Enhanced Helper Functions
const getGrowthStage = (focusMinutes: number): TreeGrowthStage => {
  if (focusMinutes === 0) return TreeGrowthStage.Seed;
  if (focusMinutes < 15) return TreeGrowthStage.Sprout;
  if (focusMinutes < 30) return TreeGrowthStage.Sapling;
  if (focusMinutes < 60) return TreeGrowthStage.YoungTree;
  return TreeGrowthStage.MatureTree;
};

// Get room statistics
export const getRoomStats = async (roomId: string): Promise<{
  totalFocusTime: number;
  totalTrees: number;
  averageSessionLength: number;
  mostActiveUser: string;
} | null> => {
  try {
    const roomDoc = await getDoc(doc(db, 'studyRooms', roomId));
    if (!roomDoc.exists()) return null;

    const roomData = roomDoc.data();
    const trees = roomData.trees || [];
    
    const participantsSnapshot = await getDocs(
      collection(db, 'studyRooms', roomId, 'participants')
    );

    let totalFocusTime = 0;
    let mostActiveUser = '';
    let maxFocusTime = 0;

    participantsSnapshot.forEach(doc => {
      const data = doc.data();
      const focusTime = data.totalFocusMinutes || 0;
      totalFocusTime += focusTime;
      
      if (focusTime > maxFocusTime) {
        maxFocusTime = focusTime;
        mostActiveUser = data.displayName || 'Unknown';
      }
    });

    return {
      totalFocusTime,
      totalTrees: trees.length,
      averageSessionLength: trees.length > 0 ? trees.reduce((sum: number, tree: Tree) => sum + tree.focusMinutes, 0) / trees.length : 0,
      mostActiveUser
    };
  } catch (error) {
    console.error('Error getting room stats:', error);
    return null;
  }
};