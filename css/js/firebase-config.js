// Configuración de Firebase
// IMPORTANTE: Reemplaza estos valores con los de tu proyecto Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBGPqlxFwB6Tc2Xo2nqSK29s_M3RBFxg-M",
    authDomain: "castillo-sem6.firebaseapp.com",
    projectId: "castillo-sem6",
    storageBucket: "castillo-sem6.firebasestorage.app",
    messagingSenderId: "656452655199",
    appId: "1:656452655199:android:d4fb653bb3c4345b9d63ea"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Servicios de Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// Email de admin (puedes cambiar esto)
const ADMIN_EMAIL = "admin@juanchos.com";
const ADMIN_PASSWORD = "admin123"; // Cambiar en producción

console.log('Firebase inicializado correctamente');