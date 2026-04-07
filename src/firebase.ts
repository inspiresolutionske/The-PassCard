import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with experimentalForceLongPolling to handle potential connectivity issues
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// Test connection
async function testConnection() {
  try {
    // Try to get a document from the server to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error) {
    if (error instanceof Error) {
      console.error("Firestore connection error:", error.message);
      if (error.message.includes('the client is offline') || error.message.includes('unavailable')) {
        console.warn("Firestore is currently unavailable. Retrying in 5 seconds...");
        setTimeout(testConnection, 5000);
      }
    }
  }
}
testConnection();
