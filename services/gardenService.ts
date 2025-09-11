import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
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
export const joinStudyRoom = async (roomId: string, userId: string, userName: string): Promise<void> => {
  try {
    const roomRef = doc(db, 'studyRooms', roomId);
    const roomDoc = await getDoc(roomRef);
    
    if (!roomDoc.exists()) {
      throw new Error('Study circle not found or has been closed');
    }
    
    const roomData = roomDoc.data();
    if (!roomData.isActive) {
      throw new Error('This study circle is no longer active');
    }
    
    if (roomData.participantCount >= roomData.maxParticipants) {
      throw new Error('Study circle is full');
    }

    // Check if user is already a participant
    const participantRef = doc(db, 'studyRooms', roomId, 'participants', userId);
    const participantDoc = await getDoc(participantRef);
    
    if (participantDoc.exists()) {
      // User is already in the room, just mark as active
      await updateDoc(participantRef, {
        isActive: true,
        rejoiningAt: serverTimestamp()
      });
      return;
    }

    // Add new participant
    await setDoc(participantRef, {
      userId,
      displayName: userName,
      joinedAt: serverTimestamp(),
      isActive: true,
      totalFocusMinutes: 0,
      treesPlanted: 0
    });

    // Update participant count
    await updateDoc(roomRef, {
      participantCount: roomData.participantCount + 1
    });
  } catch (error) {
    console.error('Error joining study room:', error);
    throw error;
  }
};

// FIXED: Leave Study Room with proper cleanup
export const leaveStudyRoom = async (roomId: string, userId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    const roomRef = doc(db, 'studyRooms', roomId);
    const participantRef = doc(db, 'studyRooms', roomId, 'participants', userId);

    // Get current room data
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) {
      console.warn('Room does not exist, nothing to leave');
      return;
    }

    const roomData = roomDoc.data();
    const newParticipantCount = Math.max(0, roomData.participantCount - 1);

    // Remove the participant
    batch.delete(participantRef);

    // If this was the last participant, delete the entire room and all its data
    if (newParticipantCount === 0) {
      console.log(`Last participant left room ${roomId}, cleaning up...`);
      
      // Delete all participants subcollection (though should be empty now)
      const participantsQuery = query(collection(db, 'studyRooms', roomId, 'participants'));
      const participantsSnapshot = await getDocs(participantsQuery);
      participantsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete the room document
      batch.delete(roomRef);
    } else {
      // Update participant count
      batch.update(roomRef, {
        participantCount: newParticipantCount,
        lastActivity: serverTimestamp()
      });
    }

    await batch.commit();
    console.log(`Successfully left room ${roomId}. Remaining participants: ${newParticipantCount}`);
  } catch (error) {
    console.error('Error leaving study room:', error);
    throw error;
  }
};

// Plant Tree in Room with enhanced error handling
export const plantTreeInRoom = async (
  roomId: string, 
  userId: string, 
  userName: string, 
  treeType: TreeType, 
  focusMinutes: number
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
      plantedByName: userName
    };

    const roomRef = doc(db, 'studyRooms', roomId);
    const roomDoc = await getDoc(roomRef);
    
    if (!roomDoc.exists()) {
      throw new Error('Study circle no longer exists');
    }

    const roomData = roomDoc.data();
    if (!roomData.isActive) {
      throw new Error('Study circle is no longer active');
    }

    const updatedTrees = [...(roomData.trees || []), newTree];
    
    // Update room with new tree
    await updateDoc(roomRef, {
      trees: updatedTrees,
      lastTreePlanted: serverTimestamp()
    });

    // Update participant stats
    const participantRef = doc(db, 'studyRooms', roomId, 'participants', userId);
    const participantDoc = await getDoc(participantRef);
    
    if (participantDoc.exists()) {
      const participantData = participantDoc.data();
      await updateDoc(participantRef, {
        totalFocusMinutes: (participantData.totalFocusMinutes || 0) + focusMinutes,
        treesPlanted: (participantData.treesPlanted || 0) + 1,
        lastTreePlanted: serverTimestamp()
      });
    }

    // Save to user's personal garden
    try {
      await firebaseService.savePersonalTree(userId, newTree);
    } catch (personalGardenError) {
      console.warn('Failed to save tree to personal garden:', personalGardenError);
      // Don't throw here - room tree planting succeeded
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

// Real-time Participants Listener with better error handling
export const setupParticipantsListener = (
  roomId: string, 
  callback: (participants: RoomParticipant[]) => void
): Unsubscribe => {
  const participantsRef = collection(db, 'studyRooms', roomId, 'participants');
  
  return onSnapshot(participantsRef, (snapshot) => {
    const participants: RoomParticipant[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      participants.push({
        ...data,
        joinedAt: data.joinedAt?.toDate() || new Date(),
        currentFocusStart: data.currentFocusStart?.toDate()
      } as RoomParticipant);
    });
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
      const roomData = roomDoc.data();
      
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

export const stopRoomFocusSession = async (roomId: string): Promise<void> => {
  try {
    const roomRef = doc(db, 'studyRooms', roomId);
    await updateDoc(roomRef, {
      currentSessionStart: null,
      lastActivity: serverTimestamp()
    });
    console.log(`Stopped focus session for room ${roomId}`);
  } catch (error) {
    console.error('Error stopping room focus session:', error);
    throw error;
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