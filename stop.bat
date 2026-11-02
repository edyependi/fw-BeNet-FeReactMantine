@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ============================================================================
echo   Stopping CoreEnterprise Boilerplate & Releasing Ports (5080, 5173, 5433)
echo ============================================================================

echo.
echo [1/3] Releasing Backend API port 5080...
set FOUND_5080=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5080 " ^| findstr "LISTENING"') do (
    if not "%%a"=="0" (
        set FOUND_5080=1
        echo   - Stopping process on port 5080 ^(PID: %%a^)...
        taskkill /F /T /PID %%a >nul 2>&1
    )
)
if "!FOUND_5080!"=="0" echo   - Port 5080 is already free.

echo.
echo [2/3] Releasing Frontend Vite port 5173...
set FOUND_5173=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    if not "%%a"=="0" (
        set FOUND_5173=1
        echo   - Stopping process on port 5173 ^(PID: %%a^)...
        taskkill /F /T /PID %%a >nul 2>&1
    )
)
if "!FOUND_5173!"=="0" echo   - Port 5173 is already free.

:: Close dedicated terminal windows if still open
taskkill /F /FI "WINDOWTITLE eq CoreEnterprise-Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq CoreEnterprise-Frontend*" >nul 2>&1

echo.
echo [3/3] Stopping PostgreSQL Docker container and releasing port 5433...
docker compose down
echo   - PostgreSQL container stopped (database volume 'postgres_data' is preserved).

echo.
echo ============================================================================
echo   All services stopped and ports 5080, 5173, and 5433 have been released.
echo ============================================================================
endlocal

