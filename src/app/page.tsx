"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, push, onValue, remove, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { RoomInfo } from '../lib/types';
import { Button } from '../components/Button';

export default function Dashboard() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const roomsRef = ref(db, 'rooms');
    return onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomList: RoomInfo[] = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          name: val.info?.name || 'Untitled Room',
          createdAt: val.info?.createdAt || Date.now(),
          participantCount: val.participants ? Object.keys(val.participants).length : 0
        }));
        setRooms(roomList.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setRooms([]);
      }
    });
  }, []);

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const roomsRef = ref(db, 'rooms');
    const newRoomRef = push(roomsRef);
    const roomId = newRoomRef.key;

    if (roomId) {
      await set(newRoomRef, {
        info: {
          name: newRoomName,
          createdAt: Date.now()
        }
      });
      router.push(`/lobby/${roomId}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (confirmDeleteId === roomId) {
      remove(ref(db, `rooms/${roomId}`));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(roomId);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  return (
    <div className="min-h-screen p-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-indigo-400">
            MeetClone
          </h1>
          <p className="text-gray-400">Premium video meetings for everyone.</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">Create a New Room</h2>
          <form onSubmit={createRoom} className="flex gap-4 flex-col sm:flex-row">
            <input
              type="text"
              placeholder="e.g. Daily Standup, Design Review..."
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
              required
            />
            <Button type="submit" className="w-full sm:w-auto">
              Create Room
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span>Available Rooms</span>
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">{rooms.length}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                No active rooms. Create one above!
              </div>
            )}

            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => router.push(`/lobby/${room.id}`)}
                className="group cursor-pointer bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-primary-500/50 p-5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-primary-900/10 flex justify-between items-start"
              >
                <div>
                  <h3 className="font-bold text-lg text-gray-100 group-hover:text-primary-400 transition-colors">
                    {room.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {room.participantCount || 0} active
                    </span>
                    <span>•</span>
                    <span>{new Date(room.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeleteClick(e, room.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    confirmDeleteId === room.id
                      ? 'bg-red-500 text-white opacity-100'
                      : 'text-gray-500 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100'
                  }`}
                  title="Delete Room"
                >
                  {confirmDeleteId === room.id ? (
                    <span className="text-xs font-bold px-1 whitespace-nowrap">Confirm?</span>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
