import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { encryp_ai } from "./encrypAI.js";

// --- CONFIGURATION ---
// User must replace these with their actual Firebase Project Keys
const firebaseConfig = {
    apiKey: "AIzaSyDZ7ofTSm5Y_0HnRpa4vyvQx6J9ORQ-br0",
    authDomain: "astadig-soc.firebaseapp.com",
    projectId: "astadig-soc",
    storageBucket: "astadig-soc.firebasestorage.app",
    messagingSenderId: "215587521467",
    appId: "1:215587521467:web:56330e4fd8608d43403a9e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- ZERO-TRUST LOGGING ---
// Logs encrypted metadata to Firestore 'logs' collection
// Logs encrypted metadata to Firestore 'logs' collection
async function logActivity(email, action, uid) {
    let userIP = "0.0.0.0";

    // Fallback Chain: Try 3 different secure providers
    try {
        // Provider 1: ipapi.co (Fastest)
        const res1 = await fetch('https://ipapi.co/json/');
        const data1 = await res1.json();
        userIP = data1.ip;
    } catch (e) {
        try {
            // Provider 2: IP-API (Via JSONP-style or raw)
            const res2 = await fetch('https://api.ipify.org?format=json');
            const data2 = await res2.json();
            userIP = data2.ip;
        } catch (e2) {
            try {
                // Provider 3: Cloudflare Trace
                const res3 = await fetch('https://www.cloudflare.com/cdn-cgi/trace');
                const text = await res3.text();
                userIP = text.match(/ip=(.*)/)[1];
            } catch (e3) {
                userIP = "SECURE_GATEWAY";
            }
        }
    }

    try {
        // Construct the Tactical Metadata String
        const rawLog = `USER:${email}|ACT:${action}|UID:${uid}|IP:${userIP}|TS:${new Date().toISOString()}`;

        // Encrypt via your EncrypAI module
        const encryptedLog = encryp_ai.encrypt(rawLog);

        await addDoc(collection(db, "logs"), {
            payload: encryptedLog,
            timestamp: new Date().toISOString(),
            level: 'system'
        });
        console.log("Trace Logged:", userIP);
    } catch (error) {
        console.error("SOC Logging Failure:", error);
    }
}

// --- AUTH ACTIONS ---

async function registerUser(email, password, username, role = "level_1") {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Store Profile in 'users' collection
        await setDoc(doc(db, "users", user.uid), {
            username: username,
            email: email,
            role: role, // 'level_1', 'admin', 'spectator'
            createdAt: new Date().toISOString(),
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}` // Auto-gen avatar
        });

        await logActivity(email, "USER_REGISTERED", user.uid);
        return { success: true, user: user };
    } catch (error) {
        console.error("Registration Error:", error);
        return { success: false, message: error.message };
    }
}

async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await logActivity(email, "USER_LOGIN_SUCCESS", user.uid);
        return { success: true, user: user };
    } catch (error) {
        console.warn("Login Failed:", error.code);
        return { success: false, message: error.message };
    }
}

async function logoutUser() {
    try {
        const user = auth.currentUser;
        if (user) await logActivity(user.email, "USER_LOGOUT", user.uid);
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// --- GUARDS ---
// For dashboard.html to check status
function initAuth(callback) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            callback(user);
        } else {
            callback(null);
        }
    });
}

export { auth, db, registerUser, loginUser, logoutUser, initAuth, doc, getDoc };