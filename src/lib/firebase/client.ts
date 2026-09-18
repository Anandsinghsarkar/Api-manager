'use client';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail,
  signOut as fbSignOut, updateProfile, onAuthStateChanged, type User, type Auth,
} from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let authInstance: Auth | undefined;

function getClientAuth(): Auth {
  if (!authInstance) {
    const app = getApps().length ? getApp() : initializeApp(config);
    authInstance = getAuth(app);
  }
  return authInstance;
}

export const auth = new Proxy({} as Auth, {
  get(_target, property, receiver) {
    return Reflect.get(getClientAuth(), property, receiver);
  },
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function establishSession(user: User) {
  const idToken = await user.getIdToken(true);
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Session failed');
  return res.json() as Promise<{ ok: true; role: 'admin' | 'user' }>;
}

export async function logout() {
  await fetch('/api/auth/session', { method: 'DELETE' });
  await fbSignOut(auth);
}

export {
  signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, updateProfile, onAuthStateChanged,
};
export type { User };
