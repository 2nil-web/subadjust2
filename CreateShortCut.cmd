::@echo off

set TARGET_PATH='C:\Users\Denis\Documents\home\33-webapp\build\msvc\win\x64\Release\webapp.exe'
set ARGUMENTS='-d -p %~dp0'
set ICON_PATH='%~dp0app.ico'
set SHORTCUT='%~dp0SubAdjust2.lnk'

set PWS=powershell.exe -ExecutionPolicy Bypass -NoLogo -NonInteractive -NoProfile

%PWS% -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut(%SHORTCUT%); $S.TargetPath = %TARGET_PATH%; $S.Arguments = %ARGUMENTS%; $S.IconLocation = %ICON_PATH%; $S.Save()"

::Name             MemberType Definition                             
::----             ---------- ----------                             
::Load             Method     void Load (string)                     
::Save             Method     void Save ()                           
::Arguments        Property   string Arguments () {get} {set}        
::Description      Property   string Description () {get} {set}      
::FullName         Property   string FullName () {get}               
::Hotkey           Property   string Hotkey () {get} {set}           
::IconLocation     Property   string IconLocation () {get} {set}     
::RelativePath     Property   string RelativePath () {set}           
::TargetPath       Property   string TargetPath () {get} {set}       
::WindowStyle      Property   int WindowStyle () {get} {set}         
::WorkingDirectory Property   string WorkingDirectory () {get} {set} 

pause
