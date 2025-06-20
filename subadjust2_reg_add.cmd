@echo off

set REG_VAL="\"C:\Users\Denis\Documents\home\33-webapp\build\msvc\win\x64\Release\webapp.exe\" -d -p \"C:\Users\Denis\Documents\home\34-subadjust2\" \"%%1\""

whoami /groups | find "S-1-16-12288" > nul

if %errorlevel% == 0 (
  echo Setting key as admin
  reg add "HKCR\Applications\zrtx.cmd\shell\open\command" /ve /t REG_SZ /d %REG_VAL% /f
  reg add "HKCR\zrtx_auto_file\shell\open\command" /ve /t REG_SZ /d %REG_VAL% /f
) else (
  echo Setting key as user
  reg add "HKCU\Software\Classes\.zrtx\shell\open\command" /ve /t REG_SZ /d %REG_VAL% /f
)

