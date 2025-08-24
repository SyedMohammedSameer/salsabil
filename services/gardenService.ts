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
  Unsubscribe 
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
  export const setupStudyRoomsListener = (callback: (rooms: StudyRoom[]) => void): Unsubscribe => {
    const roomsQuery = query(
      collection(db, 'studyRooms'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      const rooms: StudyRoom[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        trees: doc.data().trees || []
      } as StudyRoom));
      callback(rooms);
    });
  
    return unsubscribe;
  };
  // Join Study Room
  export const joinStudyRoom = async (roomId: string, userId: string, userName: string): Promise<void> => {
    try {
      const roomRef = doc(db, 'studyRooms', roomId);
      const roomDoc = await getDoc(roomRef);
      
      if (!roomDoc.exists()) {
        throw new Error('Room not found');
      }
      
      const roomData = roomDoc.data();
      if (roomData.participantCount >= roomData.maxParticipants) {
        throw new Error('Room is full');
      }
  
      // Add participant
      await setDoc(doc(db, 'studyRooms', roomId, 'participants', userId), {
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
  
  // Leave Study Room
  export const leaveStudyRoom = async (roomId: string, userId: string): Promise<void> => {
    try {
      const roomRef = doc(db, 'studyRooms', roomId);
      const participantRef = doc(db, 'studyRooms', roomId, 'participants', userId);
  
      // First, remove the participant
      await deleteDoc(participantRef);
      
      // Then, get the latest room data to check the participant count
      const roomDoc = await getDoc(roomRef);
      
      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        const newParticipantCount = Math.max(0, roomData.participantCount - 1);
  
        // If the new count is zero, delete the entire room
        if (newParticipantCount === 0) {
          await deleteDoc(roomRef);
          console.log(`Study circle ${roomId} was empty and has been deleted.`);
        } else {
          // Otherwise, just update the count
          await updateDoc(roomRef, {
            participantCount: newParticipantCount
          });
        }
      }
    } catch (error) {
      console.error('Error leaving study room:', error);
      throw error;
    }
  };
  
  // Plant Tree in Room
  export const plantTreeInRoom = async (roomId: string, userId: string, userName: string, treeType: TreeType, focusMinutes: number): Promise<void> => {
    try {
      const newTree: Tree = {
        id: `${Date.now()}_${userId}`,
        type: treeType,
        plantedAt: new Date(),
        growthStage: getGrowthStage(focusMinutes),
        focusMinutes,
        isAlive: focusMinutes > 0,
        plantedBy: userId,
        plantedByName: userName
      };
  
      const roomRef = doc(db, 'studyRooms', roomId);
      const roomDoc = await getDoc(roomRef);
      
      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        const updatedTrees = [...(roomData.trees || []), newTree];
        
        await updateDoc(roomRef, {
          trees: updatedTrees
        });
      }
  
      // Update participant stats
      const participantRef = doc(db, 'studyRooms', roomId, 'participants', userId);
      const participantDoc = await getDoc(participantRef);
      
      if (participantDoc.exists()) {
        const participantData = participantDoc.data();
        await updateDoc(participantRef, {
          totalFocusMinutes: (participantData.totalFocusMinutes || 0) + focusMinutes,
          treesPlanted: (participantData.treesPlanted || 0) + 1
        });
      }

      // Also save the tree to the user's personal garden
      await firebaseService.savePersonalTree(userId, newTree);

    } catch (error) {
      console.error('Error planting tree:', error);
      throw error;
    }
  };
  
  // Get Study Rooms
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
  
  // Real-time Room Listener
  export const setupRoomListener = (roomId: string, callback: (room: StudyRoom | null) => void): Unsubscribe => {
    const roomRef = doc(db, 'studyRooms', roomId);
    
    return onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          trees: data.trees || []
        } as StudyRoom);
      } else {
        callback(null);
      }
    });
  };
  
  // Real-time Participants Listener
  export const setupParticipantsListener = (roomId: string, callback: (participants: RoomParticipant[]) => void): Unsubscribe => {
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
    });
  };
  
  // Helper Functions
  const getGrowthStage = (focusMinutes: number): TreeGrowthStage => {
    if (focusMinutes === 0) return TreeGrowthStage.Seed;
    if (focusMinutes < 25) return TreeGrowthStage.Sprout;
    if (focusMinutes < 50) return TreeGrowthStage.Sapling;
    if (focusMinutes < 100) return TreeGrowthStage.YoungTree;
    return TreeGrowthStage.MatureTree;
  };