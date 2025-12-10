@echo off
echo ================================================
echo   INICIANDO CLIENTE GRPC DE DAMAS (JAVA)
echo ================================================
cd client
call mvn compile exec:java -Dexec.mainClass="com.checkers.client.CheckersClient"
