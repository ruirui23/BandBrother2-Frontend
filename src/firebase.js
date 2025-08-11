import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyBEaGNPnuwDc8XM0wVLm9CKwzr_fujc8lU',
  authDomain: 'bandbrother2-2764c.firebaseapp.com',
  projectId: 'bandbrother2-2764c',
  storageBucket: 'bandbrother2-2764c.firebasestorage.app',
  messagingSenderId: '239349969556',
  appId: '1:239349969556:web:0559f3832faee4d54eba81',
  measurementId: 'G-R86LWKL3YD',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
// AnalyticsはSSRや一部環境でエラーになるためコメントアウト
// const analytics = getAnalytics(app);
