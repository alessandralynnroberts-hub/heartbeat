@echo off
echo Preparing to publish Heartbeat to GitHub...
git init
git add .
git commit -m "Launch Heartbeat"
git branch -M main

:: IMPORTANT: Change YOUR_USERNAME below to your actual GitHub username!
git remote add origin https://github.com/YOUR_USERNAME/heartbeat.git

echo Sending files to GitHub...
git push -u origin main

echo.
echo If it says 'Done', your site is live!
echo Remember to add your github.io link to Firebase Authorized Domains!
pause
