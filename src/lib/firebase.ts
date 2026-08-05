// Firebase initialization — ALL application data is stored in Cloud Firestore.
// Nothing is persisted locally; the browser only holds an in-memory cache
// that is hydrated from Firestore on startup.
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC4Bfro9nrod5i2jVg728LPhY45bcMbLs0',
  authDomain: 'saxuravebi-6efb7.firebaseapp.com',
  projectId: 'saxuravebi-6efb7',
  storageBucket: 'saxuravebi-6efb7.firebasestorage.app',
  messagingSenderId: '649044368600',
  appId: '1:649044368600:web:178789a633570770ac4bad',
  measurementId: 'G-GRCCJMXMC4'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firestore = getFirestore(firebaseApp);
