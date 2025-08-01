@echo off

if [%1]==[] goto def_srt
  set EXT=%1
  goto NXT
:def_srt
  set EXT=srt

:NXT
set WA_DIR=C:\Users\Denis\Documents\home\33-webapp\build\msvc\win\x64\Release\webapp.exe\
set SA_DIR=C:\Users\Denis\Documents\home\34-subadjust2\
set REG_VAL="\"%WA_DIR%" -d -p \"%SA_DIR%" \"%%1\""

echo %REG_VAL%
echo HKCR\Applications\%EXT%.cmd\shell\open\command
echo HKCR\%EXT%\shell\open\command
echo HKCU\Software\Classes\.%EXT%\shell\open\command

whoami /groups | find "S-1-16-12288" > nul

if %errorlevel% == 0 (
  echo Setting key as admin
  reg add "HKCR\Applications\%EXT%.cmd\shell\open\command" /ve /t REG_SZ /d %REG_VAL% /f
  reg add "HKCR\%EXT%\shell\open\command" /ve /t REG_SZ /d %REG_VAL% /f
  reg add "HKCR\%EXT%\DefaultIcon" /ve /d "%SA_DIR%\app.ico"
) else (
  echo Setting key as user
  reg add "HKCU\Software\Classes\.%EXT%\shell\open\command" /ve /t REG_SZ /d %REG_VAL% /f
::  reg add "HKCU\Software\Classes\.%EXT%\DefaultIcon" /ve /d "%SA_DIR%\app.ico"
)

:eof
