# Project Astadig 🛡️🌐
### Synesthetic Flux & Zero-Trust SOC

> **Version**: v1.1.0
> **Status**: Live / Production-Ready

## 🔍 Overview
**Project Astadig** is a next-generation Cybersecurity Security Operations Center (SOC) dashboard designed with a "Synesthetic Flux" philosophy. It combines high-end "Cyber-Neon" aesthetics with rigorous "Zero-Trust" architecture. The interface reacts to the user's mental state and system status, shifting between "Calm" (Cyan) and "Anxious" (Matrix/Green) modes, while ensuring client-side data sovereignty via the custom **ENCRYPAI** engine.

## ✨ Key Features

### 1. Neural Entry Portal (Secure Login)
-   **Aesthetic**: sophisticated "Uninvented" UI with scanline overlays, glitch effects, and a reactive "Neural Grid" particle background.
-   **Dual-Pane Auth**: Seamless glassmorphic switch between **Login** and **Register** modes.
-   **Security**: Firebase Authentication integration with strict input validation.

### 2. Premium SOC Dashboard
-   **Smart Layout**: Professional Sidebar + Scrollable Main Content architecture.
-   **Premium Widgets**: 8 Core Security Segments (Perimeter, Web-Shield, Vault, etc.) housed in matte-black, glassmorphic cards with dynamic neon glow borders.
-   **Synesthetic Flux**: Real-time UI state toggling (Calm vs. Anxious) that alters color palettes, animations, and soundscapes.

### 3. Core Technologies & Logic
-   **Zero-Trust Logging**: All user activities are logged with a 30-day "Self-Destruct" (TTL) timer in Firestore.
-   **ENCRYPAI Engine**: A custom client-side encryption algorithm (`Reverse -> Shift 8 -> Jumble`) ensuring data privacy before it even touches the network.
-   **Admin Bridge**: A restricted `/admin` route featuring a dark-themed Leaflet.js map for visualizing decrypted threat data.

## 🛠️ Technology Stack
-   **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 (Tailwind CSS).
-   **Animation**: HTML5 Canvas (Particles), CSS Keyframes (Glitch/Shimmer).
-   **Backend**: Google Firebase (Authentication, Firestore, App Check).
-   **Maps**: Leaflet.js.

## 🚀 Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/astadig-core.git
    cd astadig-core
    ```

2.  **Configure Firebase**
    -   Create a project at [console.firebase.google.com](https://console.firebase.google.com).
    -   Enable **Authentication** (Email/Password).
    -   Enable **Firestore Database**.
    -   Update `scripts/auth.js` with your Firebase config keys.

3.  **Run Locally**
    Since this uses ES6 Modules, you must use a local server:
    ```bash
    python -m http.server 8080
    # OR
    npx http-server .
    ```
    Access at `http://localhost:8080`.

## 👥 Credits & Developers
**Concept & Architecture by:**
*   @GIRIDHAR PAI
*   @WHITEHATWOLF
*   @JESTEENA MARY OOMMEN
*   @LUNA PHOENIX

---
*Built with ❤️ for the Cyber-Defense Community.*
