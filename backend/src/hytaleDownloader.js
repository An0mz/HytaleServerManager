const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const AdmZip = require('adm-zip');
const os = require('os');
const EventEmitter = require('events');
const { exec } = require('child_process');

const HYTALE_DOWNLOADER_URL = 'https://downloader.hytale.com/hytale-downloader.zip';

class HytaleDownloader extends EventEmitter {
  constructor(cacheDir) {
    super();
    this.cacheDir = cacheDir;
    this.downloaderDir = path.join(cacheDir, 'downloader');
    this.platform = os.platform();
    this.downloadProcess = null;
  }

  async ensureDirectories() {
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.mkdir(this.downloaderDir, { recursive: true });
  }

  async downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
      const file = require('fs').createWriteStream(outputPath);
      
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          https.get(response.headers.location, (redirectResponse) => {
            redirectResponse.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve();
            });
          }).on('error', reject);
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }
      }).on('error', (err) => {
        fs.unlink(outputPath);
        reject(err);
      });
    });
  }

  async downloadAndExtract() {
    console.log('📥 Downloading Hytale downloader...');
    
    const zipPath = path.join(this.downloaderDir, 'hytale-downloader.zip');
    
    try {
      // Download
      await this.downloadFile(HYTALE_DOWNLOADER_URL, zipPath);
      console.log('✅ Downloaded hytale-downloader.zip');

      // Extract
      console.log('📦 Extracting...');
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(this.downloaderDir, true);
      
      // Find executable
      const files = await fs.readdir(this.downloaderDir);
      let executable = null;
      
      if (this.platform === 'win32') {
        executable = files.find(f => f.includes('hytale-downloader') && f.endsWith('.exe'));
      } else if (this.platform === 'linux') {
        executable = files.find(f => f.includes('hytale-downloader-linux'));
      } else if (this.platform === 'darwin') {
        executable = files.find(f => f.includes('hytale-downloader-mac') || f.includes('hytale-downloader-darwin'));
      }
      
      if (!executable) {
        throw new Error('Could not find downloader executable');
      }
      
      const execPath = path.join(this.downloaderDir, executable);
      
      // Make executable on Unix
      if (this.platform !== 'win32') {
        await fs.chmod(execPath, 0o755);
      }
      
      console.log(`✅ Found executable: ${executable}`);
      
      return execPath;
      
    } catch (error) {
      console.error('❌ Failed:', error);
      throw error;
    }
  }

async startDownload(execPath, outputZipPath) {
  console.log('🚀 Starting Hytale download with OAuth...');
  
  return new Promise((resolve, reject) => {
    // Convert to absolute paths
    const absoluteExecPath = path.resolve(execPath);
    const absoluteOutputPath = path.resolve(outputZipPath);
    
    console.log('📂 Exec:', absoluteExecPath);
    console.log('📂 Output:', absoluteOutputPath);
    
    // Check if exec exists
    fs.access(absoluteExecPath, fs.constants.X_OK).then(() => {
      console.log('✅ Executable is accessible');
    }).catch(err => {
      console.warn('⚠️ Warning: Executable may not be accessible:', err.message);
    });
    
    // Run downloader with -download-path flag
    this.downloadProcess = spawn(absoluteExecPath, ['-download-path', absoluteOutputPath], {
      cwd: path.dirname(absoluteExecPath)
    });

    console.log('✅ Process spawned, PID:', this.downloadProcess.pid);

    let stdout = '';
    let stderr = '';
    let oauthUrl = null;
    let oauthCode = null;

this.downloadProcess.stdout.on('data', (data) => {
  const output = data.toString();
  stdout += output;
  console.log(output.trim());

  // Parse OAuth URL and code
  const urlMatch = output.match(/https:\/\/oauth\.accounts\.hytale\.com\/oauth2\/device\/verify\?user_code=([A-Za-z0-9]+)/);
  const codeMatch = output.match(/Authorization code: ([A-Za-z0-9]+)/);

  if (urlMatch && !oauthUrl) {
    oauthUrl = urlMatch[0];
    console.log(`🔗 OAuth URL found: ${oauthUrl}`);
    this.emit('oauth-url', oauthUrl);
  }

  if (codeMatch && !oauthCode) {
    oauthCode = codeMatch[1];
    console.log(`🔑 OAuth Code found: ${oauthCode}`);
    this.emit('oauth-code', oauthCode);
  }

        // Check for completion
        if (output.includes('Download complete') || output.includes('successfully')) {
          this.emit('download-complete');
        }

        // Emit progress updates
        this.emit('progress', output.trim());
      });

      this.downloadProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(output.trim());
        this.emit('error-output', output.trim());
      });

      this.downloadProcess.on('exit', (code) => {
        console.log(`Downloader exited with code ${code}`);
        
        if (code === 0) {
          resolve({
            success: true,
            stdout,
            stderr,
            oauthUrl,
            oauthCode
          });
        } else {
          reject(new Error(`Download failed with exit code ${code}\n${stderr || stdout}`));
        }
      });

      this.downloadProcess.on('error', (error) => {
        console.error('❌ Process error:', error);
        reject(error);
      });

      // Timeout after 10 minutes
      setTimeout(() => {
        if (this.downloadProcess) {
          this.downloadProcess.kill();
          reject(new Error('Download timeout after 10 minutes'));
        }
      }, 10 * 60 * 1000);
    });
  }

async extractGameZip(zipPath) {
  console.log('📦 Extracting game files...');
  
  try {
    const extractPath = path.dirname(zipPath);
    
    // Use system unzip command (works on both Windows and Linux)
    return new Promise((resolve, reject) => {
      const unzipCmd = process.platform === 'win32' 
        ? `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`
        : `unzip -o "${zipPath}" -d "${extractPath}"`;
      
      console.log('Running:', unzipCmd);
      
      const { exec } = require('child_process');
      exec(unzipCmd, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Extraction failed:', error);
          reject(error);
          return;
        }
        
        console.log('✅ Extraction complete');
        
        // Delete zip after extraction
        fs.unlink(zipPath).catch(err => console.warn('Could not delete zip:', err));
        
        resolve();
      });
    });
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    throw error;
  }
}

  async findAndCopyFiles() {
    console.log('🔍 Looking for server files...');
    
    // Look for files in downloader directory
    const serverPath = path.join(this.downloaderDir, 'Server', 'HytaleServer.jar');
    const assetsPath = path.join(this.downloaderDir, 'Assets.zip');
    
    let jarPath = null;
    let assetsZipPath = null;
    
    try {
      await fs.access(serverPath);
      jarPath = serverPath;
      console.log(`✅ Found HytaleServer.jar`);
    } catch {}
    
    try {
      await fs.access(assetsPath);
      assetsZipPath = assetsPath;
      console.log(`✅ Found Assets.zip`);
    } catch {}
    
    if (!jarPath || !assetsZipPath) {
      throw new Error('Server files not found after download');
    }
    
    // Copy to cache
    const cacheJar = path.join(this.cacheDir, 'HytaleServer.jar');
    const cacheAssets = path.join(this.cacheDir, 'Assets.zip');
    
    await fs.copyFile(jarPath, cacheJar);
    await fs.copyFile(assetsZipPath, cacheAssets);
    
    console.log('✅ Files copied to cache');
    
    return { cacheJar, cacheAssets };
  }

  async isCacheReady() {
    try {
      await fs.access(path.join(this.cacheDir, 'HytaleServer.jar'));
      await fs.access(path.join(this.cacheDir, 'Assets.zip'));
      return true;
    } catch {
      return false;
    }
  }

  cancelDownload() {
    if (this.downloadProcess) {
      this.downloadProcess.kill();
      this.downloadProcess = null;
    }
  }

  async downloadWithOAuth() {
    console.log('');
    console.log('='.repeat(60));
    console.log('🎮 HYTALE SERVER DOWNLOAD WITH OAUTH');
    console.log('='.repeat(60));
    console.log('');

    try {
      await this.ensureDirectories();

      const execPath = await this.downloadAndExtract();
      const gameZipPath = path.join(this.downloaderDir, 'game.zip');
      await this.startDownload(execPath, gameZipPath);
      await this.extractGameZip(gameZipPath);

      const { cacheJar, cacheAssets } = await this.findAndCopyFiles();

      console.log('');
      console.log('✅ DOWNLOAD COMPLETE!');
      console.log('');

      return {
        success: true,
        cacheJar,
        cacheAssets
      };

    } catch (error) {
      console.error('❌ Download failed:', error);
      throw error;
    }
  }
}

module.exports = HytaleDownloader;
