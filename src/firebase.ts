import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const app = initializeApp({
  apiKey: "AIzaSyC1hs9ZzbPP2ejTcXfnnJlTxIioWfnXe3c",
  authDomain: "seminarkurs-lernapp.firebaseapp.com",
  projectId: "seminarkurs-lernapp",
  storageBucket: "seminarkurs-lernapp.firebasestorage.app",
  messagingSenderId: "640778470963",
  appId: "1:640778470963:web:507a2dcea453fd5595c546",
})

export const auth = getAuth(app)
