@echo off

if [%1]==[] goto def_srt
  set EXT=%1
  goto NXT
:def_srt
  set EXT=srt

:NXT
set WA_DIR=C:\Users\Denis\Documents\home\33-webapp\build\msvc\win\x64\Release\webapp.exe\
set SA_DIR=C:\Users\Denis\Documents\home\34-subadjust2\
set ICON_ROOT=app
set REG_VAL="\"%WA_DIR%" -d -p \"%SA_DIR%" \"%%1\""

whoami /groups | find "S-1-16-12288" > nul

if %errorlevel% == 0 (
  echo Setting key as admin
  reg add "HKCR\Applications\%EXT%.cmd\shell\open\command" /ve /t REG_SZ /d %REG_VAL% /f
  reg add "HKCR\%EXT%\shell\open\command" /ve /t REG_SZ /d %REG_VAL% /f
  reg add "HKCR\srt_auto_file\DefaultIcon" /ve  /t REG_EXPAND_SZ /d "%SA_DIR%\%ICON_ROOT%.ico,0" /f
) else (
  echo Setting key as user
  reg add "HKCU\Software\Classes\.%EXT%\shell\open\command" /ve /t REG_SZ /d %REG_VAL% /f
  reg add "HKCU\Software\Classes\srt_auto_file\DefaultIcon" /ve  /t REG_EXPAND_SZ /d "%SA_DIR%\%ICON_ROOT%.ico,0" /f
)

taskkill /F /IM explorer.exe
rem if exist %LOCALAPPDATA%\IconCache.db del /Q /F %LOCALAPPDATA%\IconCache.db
rem if exist %LOCALAPPDATA%\Microsoft\Windows\thumbcache_*.db del /Q /F %LOCALAPPDATA%\Microsoft\Windows\thumbcache_*.db 2>nul
rem ie4uinit.exe -ClearIconCache
rem ie4uinit.exe -show
timeout /t 3 >nul
start explorer.exe
timeout /t 2 >nul
start explorer.exe

