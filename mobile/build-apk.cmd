@echo off
REM ============================================================
REM  Compila el APK debug de Foro Amigos.
REM  Pasos: build de Angular -> Capacitor sync -> Gradle assembleDebug.
REM  Requisitos: JDK 21 y Android SDK en %LOCALAPPDATA%\Android.
REM  La URL del backend se define en src\environments\environment.prod.ts.
REM  Uso: build-apk.cmd
REM ============================================================
setlocal
cd /d "%~dp0"
set "JAVA_HOME=%LOCALAPPDATA%\Android\jdk-21"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"

echo [1/3] Compilando frontend (Angular)...
call node node_modules\@angular\cli\bin\ng.js build || goto :error

echo [2/3] Copiando web a Android (Capacitor sync)...
call node node_modules\@capacitor\cli\bin\capacitor sync android || goto :error

echo [3/3] Compilando APK (Gradle)...
call "%~dp0android\gradlew.bat" -p "%~dp0android" assembleDebug -Dorg.gradle.java.home="%LOCALAPPDATA%\Android\jdk-21" || goto :error

copy /Y "%~dp0android\app\build\outputs\apk\debug\app-debug.apk" "%~dp0..\ForoAmigos-debug.apk" >nul

echo.
echo ============================================================
echo  APK generado en:
echo   android\app\build\outputs\apk\debug\app-debug.apk
echo  (copiado tambien a la raiz: ForoAmigos-debug.apk)
echo ============================================================
goto :eof

:error
echo.
echo  ERROR al compilar. Revisa el mensaje de arriba.
exit /b 1
