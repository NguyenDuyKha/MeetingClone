"use client";

import React, { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  label?: string;
  isLocal?: boolean;
  isAudioMuted?: boolean;
  peerId?: string;
  isPinned?: boolean;
  onPin?: (peerId: string) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  muted = false,
  label,
  isLocal = false,
  isAudioMuted = false,
  peerId,
  isPinned = false,
  onPin
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative w-full h-full bg-gray-800 rounded-xl overflow-hidden shadow-2xl border group transition-all duration-200 ${isPinned ? 'border-primary-500 border-2 shadow-primary-500/50' : 'border-gray-700/50'}`}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <div className="w-16 h-16 rounded-full border-4 border-gray-700 border-t-primary-500 animate-spin" />
        </div>
      )}

      {/* Label Overlay */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2">
        <span className="text-sm font-semibold text-white tracking-wide">
          {label || 'Unknown'} {isLocal && '(You)'}
        </span>
        {isAudioMuted && (
           <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
           </svg>
        )}
      </div>

      {/* Connection Indicator */}
      <div className="absolute top-4 right-4 flex space-x-1">
         <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      </div>

      {/* Pin Button - Show on hover for remote participants */}
      {!isLocal && peerId && onPin && (
        <button
          onClick={() => onPin(peerId)}
          className="absolute top-4 left-4 p-2 bg-black/60 hover:bg-primary-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-md"
          title={isPinned ? "Unpin Participant" : "Pin Participant"}
        >
          {isPinned ? (
            <svg className="w-5 h-5 text-primary-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};