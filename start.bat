@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ============================================================================
echo   Starting CoreEnterprise Boilerplate (.NET 10 + React Mantine + PostgreSQL)
echo ============================================================================

echo.
echo [1/4] Checking and releasing existing processes on ports 5080 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5080 " ^| findstr "LISTENING"') do (
    if not "%%a"=="0" (
        echo   - Releasing port 5080 ^(PID: %%a^)...
        taskkill /F /PID %%a >nul 2>&1
    )
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    if not "%%a"=="0" (
        echo   - Releasing port 5173 ^(PID: %%a^)...
        taskkill /F /PID %%a >nul 2>&1
    )
)

echo.
echo [2/4] Starting PostgreSQL 16 container (Port 5433)...
docker compose up -d
if errorlevel 1 (
    echo [ERROR] Failed to start PostgreSQL container. Make sure Docker Desktop is running.
    pause
    exit /b 1
)

echo.
echo [3/4] Starting .NET 10 Backend API on http://localhost:5080 ...
start "CoreEnterprise-Backend" cmd /k "cd /d "%~dp0" && dotnet run --project backend\src\CoreEnterprise.WebApi --urls http://localhost:5080"

echo.
echo [4/4] Starting React + Mantine v7 Frontend on http://localhost:5173 ...
if not exist "frontend\node_modules" (
    echo   - Installing frontend dependencies first...
    call npm --prefix frontend install
)
start "CoreEnterprise-Frontend" cmd /k "cd /d "%~dp0\frontend" && npm run dev -- --port 5173"

echo.
echo ============================================================================
echo   All services have been launched!
echo   - PostgreSQL DB : localhost:5433 (coreenterprise_db)
echo   - Backend API   : http://localhost:5080/api/SystemHealth/summary
echo   - Frontend App  : http://localhost:5173
echo.
echo   Use stop.bat to stop all services and release all ports.
echo ============================================================================
endlocal

