@echo off
REM Hytale Server Files Downloader for Windows

set "CACHE_DIR=%HYTALE_CACHE_PATH%"
if "%CACHE_DIR%"=="" set "CACHE_DIR=cache\hytale"

echo ============================================
echo    Hytale Server Files Downloader
echo ============================================
echo.
echo Cache Directory: %CACHE_DIR%
echo.

REM Create cache directory
if not exist "%CACHE_DIR%" mkdir "%CACHE_DIR%"

REM Check if files exist
if exist "%CACHE_DIR%\HytaleServer.jar" if exist "%CACHE_DIR%\Assets.zip" (
    echo Files already exist in cache!
    echo   - HytaleServer.jar
    echo   - Assets.zip
    echo.
    set /p "REDOWNLOAD=Re-download? (y/N): "
    if /i not "%REDOWNLOAD%"=="y" (
        echo Skipping download.
        pause
        exit /b 0
    )
)

echo.
echo ============================================
echo    MANUAL DOWNLOAD REQUIRED
echo ============================================
echo.
echo The Hytale Server Manager cannot automatically
echo download server files yet.
echo.
echo Please follow these steps:
echo.
echo 1. Visit: https://downloader.hytale.com/
echo    Download: hytale-downloader.zip
echo.
echo 2. Extract and run the Hytale downloader
echo.
echo 3. Locate the downloaded files:
echo    - HytaleServer.jar
echo    - Assets.zip
echo.
echo 4. Copy them to this directory:
echo    %CD%\%CACHE_DIR%
echo.
echo 5. Files will then be automatically used
echo    for all servers!
echo.
echo After copying, verify with:
echo    dir %CACHE_DIR%
echo.

REM Open download page
set /p "OPEN=Open download page in browser? (y/N): "
if /i "%OPEN%"=="y" (
    start https://downloader.hytale.com/
)

echo.
pause
