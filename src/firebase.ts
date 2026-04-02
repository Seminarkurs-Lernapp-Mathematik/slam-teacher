import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string

if (!apiKey || !authDomain || !projectId) {
  throw new Error(
    'Missing Firebase env vars. Copy .env.example to .env and fill in the values.'
  )
}

const app = initializeApp({ apiKey, authDomain, projectId })
export const auth = getAuth(app)
