@echo off
echo ================================================
echo   INSTALANDO DEPENDENCIAS DO SERVIDOR NODE.JS
echo ================================================
cd server
call npm install
cd ..
echo.
echo ================================================
echo   COMPILANDO CLIENTE JAVA COM MAVEN
echo ================================================
cd client
call mvn clean compile
cd ..
echo.
echo ================================================
echo   BUILD CONCLUIDO COM SUCESSO!
echo ================================================
pause
