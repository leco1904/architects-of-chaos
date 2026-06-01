@echo off
set /p msg="Update-Beschreibung (z.B. UI Fixes): "

echo [1/3] Version wird erhoeht...
:: Erhoeht die Version in der package.json (0.0.1 -> 0.0.2)
call npm version patch --no-git-tag-version

echo [2/3] Frontend wird gebaut...
:: Erstellt den aktuellen dist-Ordner
call npm run build

echo [3/3] .exe wird erstellt und zu GitHub hochgeladen...
:: SETZE HIER DEINEN TOKEN EIN
set GH_TOKEN=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


:: Startet den Electron-Builder und laedt das Asset hoch
call npx electron-builder build --win --publish always

echo.
echo ======================================================
echo DEPLOY ERFOLGREICH! 
echo Die neue Version ist jetzt als Release auf GitHub.
echo ======================================================
pause