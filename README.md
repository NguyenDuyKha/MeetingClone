# MeetingClone

A lightweight **Next.js WebRTC demo** supporting **one-to-many video meetings** using **Firebase Realtime Database** for signaling.


## 🚀 Quick Start


### **Prerequisites**

* **Node.js** 18+
* A **Firebase Realtime Database** project


## ⚙ Environment Setup

1. Create a Firebase project using **Firebase Console**.
2. Enable:

   * **Realtime Database**
   * **Anonymous Authentication**
3. Copy `.example.env` → `.env.local` and update these values:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.region.firebasedatabase.app
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> 📝 Variables beginning with **`NEXT_PUBLIC_`** are exposed to the browser; others remain server-side.


## ▶ Run Locally

```bash
npm install
npm run dev
# visit http://localhost:3000
```

Check `package.json` for available scripts.


## 🏗 Build & Deploy

```bash
npm run build
npm run start
```

**Recommended:** Deploy on **Vercel** following standard Next.js flow.
Remember to add your environment variables in **Vercel → Settings → Environment Variables**.


## 🧩 Project Structure

| Feature                             | Path                              |
| ----------------------------------- | --------------------------------- |
| Dashboard / Create rooms            | `src/app/page.tsx`                |
| Lobby (pre-join)                    | `src/app/lobby/[roomId]/page.tsx` |
| Active meeting                      | `src/app/room/[roomId]/page.tsx`  |
| WebRTC + Firebase signaling         | `useRoom` hook                    |
| Firebase bootstrap / anonymous auth | `src/lib/firebase.ts`             |
| Shared TypeScript types             | `src/lib/types.ts`                |


### UI Components

* `VideoPlayer` — Video tile
* `Button` — Standard button component


## 🧪 Usage Flow

1. Create a room from the **Dashboard**.
2. Enter the **Lobby** → set name, camera, and microphone.
3. Join the room:

   * You’re added to Firebase as a participant
   * `useRoom` sets up RTCPeerConnections
   * Offers/answers/candidates sync via
     **`rooms/<roomId>/signals`**


## 🛠 Notes & Troubleshooting

* `roomId` from Next.js router may be `string | string[] | undefined`; normalized internally to a safe `roomIdStr`.
* If media fails:

  * Check **browser permissions**
  * Check **Firebase Realtime Database rules**
* Do **NOT commit `.env.local`** — ensure it’s listed in `.gitignore`.
