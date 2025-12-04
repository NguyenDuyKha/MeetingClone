"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '../../../components/Button';
import { VideoPlayer } from '../../../components/VideoPlayer';

export default function Lobby() {
  const { roomId } = useParams();
  const router = useRouter();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    let userStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        userStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setStream(userStream);
      } catch (err: any) {
        console.error("Access denied", err);
        setError("Could not access camera/microphone. Please check permissions.");
      }
    };
    startCamera();

    return () => {
      // Ensure tracks are stopped if user leaves lobby without joining (e.g. Back button)
      if (userStream) {
        userStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach(t => t.enabled = !isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = !isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const joinRoom = () => {
    if (!displayName.trim()) return;
    // We don't stop tracks here intentionally if we want a smooth transition,
    // but typically we stop lobby tracks and request fresh ones in the room
    // to ensure clean state.
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }

    router.push(`/room/${roomId}?displayName=${displayName}&audio=${isAudioEnabled}&video=${isVideoEnabled}`);
  };

  const goBack = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-gray-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">

        <div className="w-full md:w-3/5 p-6 bg-black flex flex-col items-center justify-center relative">
          <div className="w-full aspect-video bg-gray-900 rounded-xl overflow-hidden relative">
            {error ? (
              <div className="flex items-center justify-center h-full text-red-400 p-4 text-center">
                {error}
              </div>
            ) : (
              <VideoPlayer
                stream={stream}
                muted={true}
                isLocal={true}
                label={displayName || 'You'}
              />
            )}

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full ${isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-400'} text-white transition`}
              >
                {isAudioEnabled ? (
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                ) : (
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" stroke="#fff"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                )}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-400'} text-white transition`}
              >
                {isVideoEnabled ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="w-full md:w-2/5 p-8 flex flex-col justify-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Ready to join?</h2>
            <p className="text-gray-400">Setup your audio and video before entering the room.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:outline-none text-white"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <Button onClick={joinRoom} disabled={!displayName || !!error} className="w-full py-3 text-lg">
                Join Now
              </Button>
              <Button variant="ghost" onClick={goBack} className="w-full">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}