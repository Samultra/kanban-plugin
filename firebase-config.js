// 🔥 РЕАЛЬНАЯ КОНФИГУРАЦИЯ FIREBASE

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCd8PSR9hLx-lFDPY5I95XvIKEiykwzZsA",
    authDomain: "kanban-plugin.firebaseapp.com",
    databaseURL: "https://kanban-plugin-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "kanban-plugin",
    storageBucket: "kanban-plugin.firebasestorage.app",
    messagingSenderId: "65496026259",
    appId: "1:65496026259:web:b878eae86408bc6c969166",
    measurementId: "G-Z5E2JHSP0R"
};

// Инициализация Firebase (используем совместимую версию)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ✅ Конфигурация настроена! Приложение готово к облачной синхронизации!
