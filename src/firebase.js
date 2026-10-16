import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyDqlY3JoOEeSYvf-eP5SQ3pQD_nunjqEXc',
  authDomain: 'bandbrother2.firebaseapp.com',
  projectId: 'bandbrother2',
  storageBucket: 'bandbrother2-storage',
  messagingSenderId: '1060861693188',
  appId: '1:1060861693188:web:6c3ee2a06c1e0c677e9451',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
// AnalyticsはSSRや一部環境でエラーになるためコメントアウト
// const analytics = getAnalytics(app);
