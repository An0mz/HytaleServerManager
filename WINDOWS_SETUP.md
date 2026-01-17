# Windows Setup Guide for Hytale Server Manager

## 🪟 Quick Start for Windows

This version has been optimized to work on Windows **without requiring build tools or compilation**.

### Method 1: Automated Setup (Easiest)

1. **Double-click `start-windows.bat`**
2. Wait for dependencies to install
3. Two command windows will open (backend and frontend)
4. Open your browser to **http://localhost:3001**

That's it! 🎉

### Method 2: Manual Setup

#### Step 1: Install Node.js

Download and install from: https://nodejs.org/
- Recommended: Latest LTS version (20.x or later)
- Make sure to check "Add to PATH" during installation

#### Step 2: Install Dependencies

Open PowerShell or Command Prompt in the project folder:

```powershell
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

#### Step 3: Create Configuration

```powershell
copy backend\.env.example backend\.env
```

#### Step 4: Start the Application

**Option A: Using the batch file**
```cmd
start-windows.bat
```

**Option B: Manual (two separate terminals)**

Terminal 1 - Backend:
```powershell
cd backend
npm start
```

Terminal 2 - Frontend:
```powershell
cd frontend
npm start
```

#### Step 5: Access the Application

Open your browser to: **http://localhost:3001**

## 📁 File Structure

```
hytale-manager/
├── start-windows.bat    ← Double-click this to start!
├── backend/             ← API server (Port 3000)
├── frontend/            ← Web interface (Port 3001)
├── servers/             ← Your Hytale servers (auto-created)
├── backups/             ← Backup storage (auto-created)
└── data/                ← Database file (auto-created)
```

## 🎮 Creating Your First Server

1. Click **"Create Server"** on the dashboard
2. Fill in the details:
   - **Name**: My First Hytale Server
   - **Port**: 5520 (default)
   - **Max Players**: 100
   - **View Radius**: 12 (recommended)
3. Click **"Create Server"**
4. Upload your server files:
   - Go to **File Manager** tab
   - Upload `HytaleServer.jar`
   - Upload `Assets.zip`
5. Click **"Start"** to launch the server!

## 🔧 Windows-Specific Notes

### Java 25 Requirement

Hytale servers require **Java 25**. Download from:
- https://adoptium.net/temurin/releases/?version=25

After installing, verify:
```cmd
java --version
```

Should show: `openjdk 25.x.x`

### Port Forwarding (For External Access)

1. Open Windows Firewall
2. Create new **Inbound Rule**
3. Select **Port** → **UDP**
4. Enter your server port (e.g., 5520)
5. Allow the connection

Then configure your router to forward UDP port 5520 to your PC.

### Antivirus/Windows Defender

If Windows Defender blocks the servers:

1. Open **Windows Security**
2. Go to **Virus & threat protection**
3. Click **Manage settings**
4. Add exclusion for the `hytale-manager` folder

## 🚨 Troubleshooting

### "Cannot find module 'express'"

The dependencies weren't installed. Run:
```powershell
cd backend
npm install
```

### "Port 3000 is already in use"

Something else is using port 3000. Either:
- Close the other application
- Or change the port in `backend/.env`:
  ```
  PORT=3001
  ```

### "npm ERR! code ENOENT"

Make sure you're in the correct directory:
```powershell
cd C:\path\to\hytale-manager
```

### Server won't start

1. Check that `HytaleServer.jar` and `Assets.zip` are uploaded
2. Verify Java 25 is installed: `java --version`
3. Check the console output for error messages

### "Access is denied" errors

Run Command Prompt or PowerShell as **Administrator**:
- Right-click on CMD/PowerShell
- Select **"Run as administrator"**

## 🔄 Updating the Application

To update to a new version:

```powershell
# Stop the servers (Ctrl+C in both windows)

# Update dependencies
cd backend
npm install
cd ..

cd frontend
npm install
cd ..

# Restart
start-windows.bat
```

## 💾 Backing Up Your Data

Your data is stored in:
- **Database**: `data/hytale-manager.json`
- **Servers**: `servers/` folder
- **Backups**: `backups/` folder

To backup everything, simply copy these folders to a safe location.

## 🆘 Still Having Issues?

Common fixes:

1. **Delete node_modules and reinstall:**
   ```powershell
   cd backend
   rmdir /s node_modules
   npm install
   ```

2. **Clear npm cache:**
   ```powershell
   npm cache clean --force
   ```

3. **Use a different Node.js version:**
   - Install nvm-windows: https://github.com/coreybutler/nvm-windows
   - Switch to LTS version:
     ```cmd
     nvm install 20.11.0
     nvm use 20.11.0
     ```

## ✨ Features Working on Windows

All features work perfectly on Windows:
- ✅ Multi-server management
- ✅ Real-time console with PTY support
- ✅ File upload/download
- ✅ Configuration editing
- ✅ Backup and restore
- ✅ Statistics and monitoring
- ✅ WebSocket live updates

## 🐳 Alternative: Docker Desktop

If you prefer Docker:

1. Install **Docker Desktop for Windows**: https://www.docker.com/products/docker-desktop
2. Enable WSL 2 backend
3. Run:
   ```powershell
   docker-compose up
   ```

## 📚 Additional Resources

- **Node.js**: https://nodejs.org/
- **Java 25**: https://adoptium.net/
- **Hytale Server Docs**: https://support.hytale.com/
- **Port Forwarding Guide**: https://portforward.com/

---

**Happy server managing! 🎮**
