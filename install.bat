@echo off
set "TEMP_DIR=%TEMP%\Gerentask"
mkdir "%TEMP_DIR%"
copy package.json "%TEMP_DIR%\"
cd /d "%TEMP_DIR%"
call npm install --no-fund --no-audit
xcopy /E /I /Y node_modules "g:\Meu Drive\C&S Sistemas\Projetos\Gerentask\node_modules\"
