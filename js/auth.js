// Configuración de Firebase - NUEVA CONFIGURACIÓN WEB
const firebaseConfig = {
    apiKey: "AIzaSyA8kwhiKJSGLBZRLi1yrXmdnUWGXnY-kgU",
    authDomain: "castillo-sem6.firebaseapp.com",
    projectId: "castillo-sem6",
    storageBucket: "castillo-sem6.firebasestorage.app",
    messagingSenderId: "656452655199",
    appId: "1:656452655199:web:caef2c8cf7d35b549d63ea",
    measurementId: "G-9GZ0L36WNT"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

console.log('🔥 Firebase configurado correctamente para app web');

// Verificar si ya está logueado
auth.onAuthStateChanged(user => {
    if (user) {
        console.log('✅ Usuario ya autenticado:', user.email);
        window.location.href = 'dashboard.html';
    } else {
        console.log('🔐 No hay usuario autenticado');
    }
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');
    const loading = document.getElementById('loading');

    errorMessage.style.display = 'none';
    loginBtn.disabled = true;
    loading.style.display = 'block';

    try {
        console.log('🔄 Intentando login con:', email);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Login exitoso:', userCredential.user.email);
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('❌ Error en login:', error);
        
        let errorMsg = 'Error al iniciar sesión';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMsg = 'El formato del email es incorrecto';
                break;
            case 'auth/user-disabled':
                errorMsg = 'Esta cuenta ha sido deshabilitada';
                break;
            case 'auth/user-not-found':
                errorMsg = 'No existe una cuenta con este email';
                break;
            case 'auth/wrong-password':
                errorMsg = 'Contraseña incorrecta';
                break;
            case 'auth/network-request-failed':
                errorMsg = 'Error de conexión a internet';
                break;
            default:
                errorMsg = `Error: ${error.message}`;
        }
        
        errorMessage.textContent = errorMsg;
        errorMessage.style.display = 'block';
        loginBtn.disabled = false;
        loading.style.display = 'none';
    }
});

// Función para crear usuario admin (ejecutar en consola)
function crearUsuarioAdmin() {
    const email = "admin@juanchos.com";
    const password = "admin123";
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('✅ Usuario admin creado:', userCredential.user);
            alert('Usuario admin creado exitosamente');
        })
        .catch((error) => {
            console.error('❌ Error creando usuario:', error);
            alert('Error: ' + error.message);
        });
}