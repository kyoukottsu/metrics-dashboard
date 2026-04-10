@echo off
TITLE MetricFlow Dashboard
echo.
echo  ==========================================
echo    MetricFlow - Iniciando aplicacion...
echo  ==========================================
echo.

:: Cambiar al directorio del proyecto
cd /d "%~dp0"

:: Iniciar el servidor de desarrollo en segundo plano
echo  Iniciando servidor...
start /B powershell -ExecutionPolicy Bypass -Command "npm run dev" > nul 2>&1

:: Esperar 3 segundos a que el servidor inicie
echo  Abriendo navegador en 3 segundos...
timeout /t 3 /nobreak > nul

:: Abrir el navegador
start "" "http://localhost:5173"

echo.
echo  La aplicacion esta corriendo en: http://localhost:5173
echo  Cierra esta ventana para detener el servidor.
echo.
pause
