


import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDzUJF0nVReRopL9_CwUBmrgs5yJAerBEc",
  authDomain: "bridgeaz-11650.firebaseapp.com",
  projectId: "bridgeaz-11650",
  storageBucket: "bridgeaz-11650.firebasestorage.app",
  messagingSenderId: "890492173447",
  appId: "1:890492173447:web:99b6f0e42ce83ac051cc22",
};

const app = initializeApp(firebaseConfig);

export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

export const auth = getAuth(app);
export default app;