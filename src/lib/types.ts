
export interface RoomInfo {
  id: string;
  name: string;
  createdAt: number;
  participantCount?: number;
}

export interface Participant {
  id: string;
  displayName: string;
  joinedAt: number;
}

export interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  payload: any; // RTCSessionDescriptionInit or RTCIceCandidateInit
  senderId: string;
  senderName: string;
}

export interface UserMediaConfig {
  video: boolean;
  audio: boolean;
}
