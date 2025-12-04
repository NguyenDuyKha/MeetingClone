"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { useRoom } from '../../../hooks/useRoom';
import { VideoPlayer } from '../../../components/VideoPlayer';

interface LocationState {
  displayName: string;
  initialConfig: { audio: boolean; video: boolean };
}

export default function MeetingRoom() {
  const { roomId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Normalize roomId (string | string[] | undefined) -> string
  const roomIdStr = Array.isArray(roomId) ? roomId[0] : (roomId ?? '');

  // Read from URL Query
  const displayName = searchParams.get("displayName");
  const audio = searchParams.get("audio") === "true";
  const video = searchParams.get("video") === "true";

  useEffect(() => {
    if (!displayName) {
      router.push(`/lobby/${roomIdStr}`);
    }
  }, [displayName, roomIdStr, router]);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(audio ?? true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(video ?? true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const init = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        stream.getAudioTracks().forEach(t => t.enabled = audio);
        stream.getVideoTracks().forEach(t => t.enabled = video);

        setLocalStream(stream);
      } catch (e) {
        console.error("Failed to get media in room", e);
        router.push(`/lobby/${roomIdStr}`);
      }
    };
    init();

    // Cleanup function when component unmounts (e.g. browser back button)
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomIdStr, audio, video, router]);

  const { userId, participants, streams } = useRoom(
    roomIdStr,
    displayName || 'Anonymous',
    localStream
  );

  const toggleAudio = () => {
    if (localStream) {
      const enabled = !isAudioEnabled;
      localStream.getAudioTracks().forEach(t => t.enabled = enabled);
      setIsAudioEnabled(enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const enabled = !isVideoEnabled;
      localStream.getVideoTracks().forEach(t => t.enabled = enabled);
      setIsVideoEnabled(enabled);
    }
  };

  const leaveRoom = () => {
    // Explicitly stop all tracks before navigating
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    router.push('/');
  };

  const totalParticipants = 1 + Object.keys(streams).length;

  const getGridClass = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 9) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-3 md:grid-cols-4";
  };

  if (!displayName) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      <div className="h-16 flex items-center justify-between px-6 bg-gray-800 border-b border-gray-700 z-10">
         <div className="flex items-center gap-4">
           <h1 className="font-bold text-lg text-white tracking-tight">Meeting: <span className="text-primary-400">{roomIdStr}</span></h1>
           <span className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300">
             {totalParticipants} Online
           </span>
         </div>
         <div className="text-gray-400 text-sm hidden md:block">
           {displayName} (You)
         </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex items-center justify-center">
        <div className={`grid gap-4 w-full max-w-7xl h-full content-center ${getGridClass(totalParticipants)}`}>

          <div className="relative aspect-video">
             <VideoPlayer
               stream={localStream}
               label={`${displayName}`}
               isLocal={true}
               muted={true}
               isAudioMuted={!isAudioEnabled}
             />
             {!isVideoEnabled && (
               <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-xl z-20">
                 <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                   {displayName.charAt(0).toUpperCase()}
                 </div>
               </div>
             )}
          </div>

          {Object.entries(streams).map(([peerId, stream]) => {
            const participant = participants[peerId];
            return (
              <div key={peerId} className="relative aspect-video">
                <VideoPlayer
                  stream={stream}
                  label={participant?.displayName || 'Guest'}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-20 bg-gray-800 border-t border-gray-700 flex items-center justify-center gap-4 z-20 shadow-lg">
        <button
          onClick={toggleAudio}
          className={`p-4 rounded-full transition-all duration-200 ${isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'}`}
          title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
        >
          {isAudioEnabled ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" stroke="#fff"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
          )}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all duration-200 ${isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'}`}
          title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
        >
          {isVideoEnabled ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          )}
        </button>

        <div className="w-px h-10 bg-gray-700 mx-2"></div>

        <button
          onClick={leaveRoom}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-semibold tracking-wide shadow-lg shadow-red-600/30 transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Leave
        </button>
      </div>
    </div>
  );
}