@echo off
setlocal enableextensions
cd /d "%~dp0"

rem ---------------------------------------------------------------------------
rem  NullLM - lokalny anonimizator PII. Uruchomienie: dwuklik na start.cmd
rem  Wymagany Node.js LTS (>= 20). Jesli nie ma go w PATH, skrypt sprawdzi
rem  instalacje przenosna w %LOCALAPPDATA%\Programs\nodejs.
rem ---------------------------------------------------------------------------

where node >nul 2>nul
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
  ) else (
    echo.
    echo  [NullLM] Nie znaleziono Node.js.
    echo  Zainstaluj Node.js LTS z https://nodejs.org i uruchom start.cmd ponownie.
    echo.
    pause
    exit /b 1
  )
)

if not exist "node_modules" (
  echo.
  echo  [NullLM] Pierwsze uruchomienie - instaluje zaleznosci...
  echo.
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo.
    echo  [NullLM] npm install nie powiodl sie. Sprawdz polaczenie z internetem.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo  [NullLM] Uruchamiam serwer dev i otwieram http://localhost:5173 ...
echo  [NullLM] Zatrzymanie: Ctrl+C
echo.
call npm run dev -- --open

pause
