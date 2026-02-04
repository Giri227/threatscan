# 🛠️ ThreatScan Installation Guide (Windows)

This guide helps you resolve "Unavailable" engine errors by properly setting up the required local security tools and database.

## 1. ClamAV (The "Unavailable" fix)
Node.js looks for the `clamscan` command in your system PATH.

1.  **Download**: Go to the [ClamAV Windows Downloads](https://www.clamav.net/downloads#otherversions) and get the `.msi` installer.
2.  **Install**: Run the installer. By default, it installs to `C:\Program Files\ClamAV`.
3.  **PATH Variable**:
    *   Search "Environment Variables" in your Start Menu.
    *   Edit the `Path` variable and add: `C:\Program Files\ClamAV`.
4.  **Initialize**: Open CMD as Administrator and run `freshclam` to download the virus database.

## 2. YARA (The "Unavailable" fix)
1.  **Download**: Get the latest `yara-vX.X.X-win64.zip` from the [official GitHub releases](https://github.com/VirusTotal/yara/releases).
2.  **Install**: Unzip it to a folder (e.g., `C:\yara`).
3.  **PATH Variable**: Add `C:\yara` to your System Path (same process as ClamAV).
4.  **Verify**: Open a new CMD and type `yara --version`. If it prints a number, the backend will now "see" it.

## 3. MongoDB (The Database connection)
If you don't want to install it locally, the fastest way is using **MongoDB Atlas (Cloud)**.

1.  **Atlas Fix**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), create a free cluster, and get your SRV connection string.
2.  **Update .env**:
    ```env
    MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/threatscan
    ```

## 4. API Keys
1.  Open `backend/.env`.
2.  Paste your keys into `VIRUSTOTAL_API_KEY` and `GEMINI_API_KEY`.
3.  **Note**: Ensure there are no extra spaces or quotes around the keys.

---
*Once installed, restart the backend server with `npm start` for the changes to take effect.*
