import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const app = initializeApp({
  apiKey: "AIzaSyDTge-QQKB2aY-ZRZqtuDq8PcpBiErmfWQ",
  authDomain: "seminarkurs-lernapp.firebaseapp.com",
  projectId: "seminarkurs-lernapp",
  storageBucket: "seminarkurs-lernapp.firebasestorage.app",
  messagingSenderId: "640778470963",
  appId: "1:640778470963:web:ce209272262574ac95c546",
})

export const auth = getAuth(app)
