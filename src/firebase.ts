import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

// TODO: Replace with your actual Firebase project configuration from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCcwNMEGtkKkvbFLKThhqHtw5aXXsU7O24",
  authDomain: "red-cherry-ab1c1.firebaseapp.com",
  projectId: "red-cherry-ab1c1",
  storageBucket: "red-cherry-ab1c1.firebasestorage.app",
  messagingSenderId: "214721057330",
  appId: "1:214721057330:web:c3f2c6ae7c10922747a22b",
  measurementId: "G-K9QDCQBCNW"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export const auth = firebase.auth();
