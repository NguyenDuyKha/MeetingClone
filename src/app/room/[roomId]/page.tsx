"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { useRoom } from '../../../hooks/useRoom';
import { VideoPlayer } from '../../../components/VideoPlayer';

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
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [showParticipantList, setShowParticipantList] = useState(false);
  const [page, setPage] = useState(1);

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

  const handlePinParticipant = (peerId: string) => {
    setPinnedParticipantId(pinnedParticipantId === peerId ? null : peerId);
    setShowParticipantList(pinnedParticipantId !== peerId); // Show sidebar when pinning
  };

  const totalParticipants = 1 + Object.keys(streams).length;

  if (!displayName) return null;

  const pinnedStream = pinnedParticipantId ? streams[pinnedParticipantId] : null;
  const pinnedParticipant = pinnedParticipantId ? participants[pinnedParticipantId] : null;

  // Calculate grid dimensions based on participant count
  const getGridDimensions = (count: number) => {
    if (count === 1) return { cols: 1, rows: 1, pageSize: 1 };
    if (count === 2) return { cols: 2, rows: 1, pageSize: 2 };
    if (count <= 4) return { cols: 2, rows: 2, pageSize: 4 };
    return { cols: 3, rows: 2, pageSize: 6 }; // For more than 4, use 3x2 grid
  };

  // Build participant list (local + remote)
  const remoteEntries = Object.entries(streams).filter(([peerId]) => peerId !== pinnedParticipantId);
  const allParticipants: { id: string; stream: MediaStream | null; label: string; isLocal?: boolean }[] = [
    { id: 'local', stream: localStream, label: displayName || 'You', isLocal: true },
    ...remoteEntries.map(([peerId, stream]) => ({
      id: peerId,
      stream,
      label: participants[peerId]?.displayName || 'Guest'
    }))
  ];

  const grid = getGridDimensions(allParticipants.length);
  const totalPages = Math.max(1, Math.ceil(allParticipants.length / grid.pageSize));

  // Reset to page 1 when participants change
  useEffect(() => {
    setPage(1);
  }, [allParticipants.length, pinnedParticipantId]);

  const pageStart = (page - 1) * grid.pageSize;
  const visibleParticipants = allParticipants.slice(pageStart, pageStart + grid.pageSize);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-900">

      {/* Header */}
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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Main Video Area */}
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-900 relative">
          {pinnedStream && pinnedParticipant ? (
            // Full-screen Pinned Participant
            <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl">
              <VideoPlayer
                stream={pinnedStream}
                label={pinnedParticipant.displayName}
                peerId={pinnedParticipantId!}
                isPinned={true}
                onPin={handlePinParticipant}
              />
            </div>
          ) : (
            // Grid View (No Pinned) - Dynamic grid with pagination
            <div className="w-full h-full flex items-center justify-center relative">
              <div
                className={`w-full h-full grid gap-4`}
                style={{
                  gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`
                }}
              >
                {visibleParticipants.map(participant => (
                  <div key={participant.id} className="relative w-full h-full rounded-lg overflow-hidden">
                    <VideoPlayer
                      stream={participant.stream}
                      label={participant.isLocal ? `${displayName}` : participant.label}
                      isLocal={participant.isLocal}
                      muted={participant.isLocal}
                      isAudioMuted={participant.isLocal ? !isAudioEnabled : false}
                      peerId={participant.isLocal ? undefined : participant.id}
                      isPinned={false}
                      onPin={participant.isLocal ? undefined : handlePinParticipant}
                    />
                    {participant.isLocal && !isVideoEnabled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg z-20">
                        <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                          {displayName?.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-3 z-20 bg-black/40 backdrop-blur-md px-2 py-2 rounded-lg border border-gray-600/30">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-gray-700/60 hover:bg-gray-600/60 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                    title="Previous page"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="text-sm text-gray-300 px-2 font-medium">
                    Page {page} / {totalPages}
                  </div>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 bg-gray-700/60 hover:bg-gray-600/60 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                    title="Next page"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Toggle Sidebar Button (When Pinned) */}
          {pinnedStream && (
            <button
              onClick={() => setShowParticipantList(!showParticipantList)}
              className="absolute top-4 right-4 p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-all duration-200 z-30"
              title={showParticipantList ? "Hide Participants" : "Show Participants"}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Right Sidebar - Participant List (Hidden by default, shown when pinned) */}
        <div
          className={`fixed right-0 top-16 h-[calc(100vh-80px-64px)] bg-gray-800 border-l border-gray-700 transition-all duration-300 ease-in-out z-40 ${
            showParticipantList && pinnedStream ? 'w-80' : 'w-0'
          } overflow-hidden`}
        >
          <div className="w-80 h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="h-12 flex items-center justify-between px-4 bg-gray-700 border-b border-gray-600">
              <h2 className="text-sm font-semibold text-white">
                Participants ({totalParticipants})
              </h2>
              <button
                onClick={() => setShowParticipantList(false)}
                className="p-1 hover:bg-gray-600 rounded transition-colors"
                title="Close"
              >
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Participant List */}
            <div
              className="flex-1 overflow-y-auto hide-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="p-3 space-y-2">

                {/* Local User */}
                <div className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {displayName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-400">You (Local)</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isAudioEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                </div>

                {/* Remote Participants */}
                {Object.entries(streams).map(([peerId, stream]) => {
                  const participant = participants[peerId];
                  const isPinned = peerId === pinnedParticipantId;
                  return (
                    <div
                      key={peerId}
                      className={`p-3 rounded-lg transition-all border cursor-pointer group ${
                        isPinned
                          ? 'bg-yellow-600/30 border-yellow-500 shadow-lg shadow-yellow-500/20'
                          : 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                      }`}
                      onClick={() => handlePinParticipant(peerId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {participant?.displayName.charAt(0).toUpperCase() || 'G'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {participant?.displayName || 'Guest'}
                          </p>
                          <p className="text-xs text-gray-400">Remote</p>
                        </div>
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-green-500 animate-pulse" />
                      </div>
                      {isPinned && (
                        <div className="mt-2 text-xs text-yellow-400 font-semibold flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-9h11v2h-11z"/>
                          </svg>
                          Pinned
                        </div>
                      )}
                    </div>
                  );
                })}

                {Object.keys(streams).length === 0 && (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    No other participants yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
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