const firebaseConfig = {
  apiKey: "AIzaSyCqRL_X83z9QaXJGe5qgrPaCWM-heoVB-E",
  authDomain: "keep-your-projects-alive.firebaseapp.com",
  projectId: "keep-your-projects-alive",
  storageBucket: "keep-your-projects-alive.firebasestorage.app",
  messagingSenderId: "514938379771",
  appId: "1:514938379771:web:1687233dc82a0d31513f5e",
  youtubeApiKey: "YOUR_YOUTUBE_API_KEY"
};

// Initialize Firebase App
let app, auth, storage, db;

try {
    app = firebase.initializeApp(firebaseConfig);
    
    // Initialize services
    auth = firebase.auth();
    storage = firebase.storage();
    db = firebase.firestore();
    
    console.log("Firebase explicitly initialized.");
} catch (error) {
    console.error("Firebase initialization error:", error);
}
