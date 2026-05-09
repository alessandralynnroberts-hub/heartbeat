@echo off
echo Disconnecting old project and connecting to Heartbeat...

:: Remove the old "fish" connection
git remote remove origin

:: Connect to the new Heartbeat repo
:: IMPORTANT: Change YOUR_USERNAME below!
git remote add origin https://github.com/YOUR_USERNAME/heartbeat.git

echo.
echo Publishing to GitHub Heartbeat...
git add .
git commit -m "Switch to Heartbeat App"
git branch -M main
git push -u origin main --force

echo.
echo All fixed! Your Heartbeat app is now on GitHub.
pause
