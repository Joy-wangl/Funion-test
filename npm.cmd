@echo off
setlocal
set "PATH=%~dp0.playwright\node\win32_x64;%PATH%"
"%~dp0.playwright\node\win32_x64\node.exe" "%~dp0.local-tools\npm\bin\npm-cli.js" --prefix "%~dp0." %*
