export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDzh4etp331ytRyd3_2HQrl3pGTzKeUJ38",
  authDomain: "toeic-master-8e0f1.firebaseapp.com",
  projectId: "toeic-master-8e0f1",
  storageBucket: "toeic-master-8e0f1.firebasestorage.app",
  messagingSenderId: "2478267193",
  appId: "1:2478267193:web:2d0ef78dcc6b683a7826e8",
  measurementId: "G-MCW62M38QT"
};
export const ADMIN_EMAIL = "s111001@hcvs.hc.edu.tw";

export function getFirebaseConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem("toeicFirebaseConfig") || "null");
    return saved && saved.apiKey ? saved : DEFAULT_FIREBASE_CONFIG;
  } catch {
    return DEFAULT_FIREBASE_CONFIG;
  }
}
