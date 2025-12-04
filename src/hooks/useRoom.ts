"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import {
  ref, onValue, push, set, remove,
  onDisconnect, get, child, onChildAdded
} from 'firebase/database';
import { Participant, SignalData } from '../lib/types';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export const useRoom = (roomId: string, userDisplayName: string, localStream: MediaStream | null) => {
  const [participants, setParticipants] = useState<Record<string, Participant>>({});
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [userId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`);

  // Refs to store non-react state (Connections)
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  // Keep localStreamRef synced
  useEffect(() => {
    localStreamRef.current = localStream;
    // Update tracks for existing connections if stream changes (e.g., mute/unmute video replacing tracks)
    Object.values(pcsRef.current).forEach((pc) => {
      const peer = pc as RTCPeerConnection;
      const senders = peer.getSenders();
      localStream?.getTracks().forEach(track => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) sender.replaceTrack(track);
      });
    });
  }, [localStream]);

  // Helper to create a Peer Connection
  const createPeerConnection = useCallback((targetUserId: string, targetName: string, initiator: boolean) => {
    if (pcsRef.current[targetUserId]) return pcsRef.current[targetUserId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcsRef.current[targetUserId] = pc;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const signalRef = ref(db, `rooms/${roomId}/signals/${targetUserId}`);
        push(signalRef, {
          type: 'candidate',
          payload: event.candidate.toJSON(),
          senderId: userId,
          senderName: userDisplayName
        });
      }
    };

    // Handle Incoming Stream
    pc.ontrack = (event) => {
      setStreams(prev => ({
        ...prev,
        [targetUserId]: event.streams[0]
      }));
    };

    // Negotiation needed (only for stable connections re-negotiating)
    pc.onnegotiationneeded = async () => {
      // Basic negotiation logic usually handled by initial offer/answer in simple mesh
    };

    return pc;
  }, [roomId, userId, userDisplayName]);

  // Main Effect: Join Room & Listen to Signaling
  useEffect(() => {
    if (!roomId || !localStream) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    const participantsRef = ref(db, `rooms/${roomId}/participants`);
    const myParticipantRef = child(participantsRef, userId);
    const mySignalsRef = ref(db, `rooms/${roomId}/signals/${userId}`);

    // 1. Add self to participants
    set(myParticipantRef, {
      id: userId,
      displayName: userDisplayName,
      joinedAt: Date.now()
    });
    onDisconnect(myParticipantRef).remove();
    onDisconnect(mySignalsRef).remove();

    // 2. Listen for existing participants to connect to (I am the newcomer/initiator)
    get(participantsRef).then((snapshot) => {
      const users = snapshot.val() || {};
      Object.values(users).forEach(async (user: any) => {
        if (user.id === userId) return; // Skip self

        // Create PC and Offer
        const pc = createPeerConnection(user.id, user.displayName, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send Offer
        const targetSignalRef = ref(db, `rooms/${roomId}/signals/${user.id}`);
        push(targetSignalRef, {
          type: 'offer',
          payload: { type: offer.type, sdp: offer.sdp },
          senderId: userId,
          senderName: userDisplayName
        });
      });
    });

    // 3. Listen for changes in participants list (for UI)
    const unsubParticipants = onValue(participantsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setParticipants(data);

      // Cleanup streams for left users
      setStreams(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (!data[key]) delete next[key];
        });
        return next;
      });

      // Cleanup PCs for left users
      Object.keys(pcsRef.current).forEach(key => {
        if (!data[key]) {
          pcsRef.current[key].close();
          delete pcsRef.current[key];
        }
      });
    });

    // 4. Listen for incoming signals (Offers, Answers, Candidates)
    const unsubSignals = onChildAdded(mySignalsRef, async (snapshot) => {
      const data = snapshot.val() as SignalData;
      if (!data) return;

      const { type, payload, senderId, senderName } = data;
      remove(snapshot.ref);

      let pc = pcsRef.current[senderId];

      // If we receive something from a user we don't have a PC for yet, create it
      if (!pc) {
        pc = createPeerConnection(senderId, senderName, false);
      }

      try {
        if (type === "offer") {
          // Avoid duplicate offer application (Firebase can fire twice)
          if (pc.signalingState !== "stable") {
            console.warn("⚠ Ignoring offer: PC not stable", pc.signalingState);
            return;
          }

          // 1️⃣ Set remote description first
          await pc.setRemoteDescription(new RTCSessionDescription(payload));

          // 2️⃣ Prevent calling createAnswer when not ready
          const isRemoteOfferState = (state: RTCSignalingState) => state === "have-remote-offer";
          if (isRemoteOfferState(pc.signalingState)) {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Send Answer back
            const replyRef = ref(db, `rooms/${roomId}/signals/${senderId}`);
            push(replyRef, {
              type: "answer",
              payload: { type: answer.type, sdp: answer.sdp },
              senderId: userId,
              senderName: userDisplayName
            });
          }

        } else if (type === "answer") {
          // Avoid duplicate answer
          if (!pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
          }

        } else if (type === "candidate") {
          // Delay ICE if remote desc not set yet
          if (!pc.remoteDescription) {
            console.warn("⚠ Queueing ICE until remoteDescription exists");
            setTimeout(async () => {
              try {
                if (pc.remoteDescription) {
                  await pc.addIceCandidate(new RTCIceCandidate(payload));
                }
              } catch (err) {
                console.error("Delayed ICE add error", err);
              }
            }, 200);
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(payload));
          }
        }

      } catch (err) {
        console.error("Signal processing error", err, pc.signalingState);
      }
    });


    return () => {
      unsubParticipants();
      unsubSignals(); // Stops listening
      remove(myParticipantRef); // Remove self
      remove(mySignalsRef); // Clean signals

      // Close all connections
      Object.values(pcsRef.current).forEach((pc) => (pc as RTCPeerConnection).close());
      pcsRef.current = {};
    };
  }, [roomId, userId, userDisplayName, createPeerConnection, localStream]);

  return { userId, participants, streams };
};
