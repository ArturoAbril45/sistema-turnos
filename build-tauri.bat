@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cd /d "C:\Users\artur\Desktop\SISTEM_TURNO\sistema-turnos"
set NEXT_TELEMETRY_DISABLED=1
npx tauri build
