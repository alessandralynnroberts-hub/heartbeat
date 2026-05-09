@echo off
echo 🚀 Launching Heartbeat to GitHub...

:: Step 1: Initialize and clean up old connections
git init
git remote remove origin 2>nul

:: Step 2: Connect to your new repository (pre-filled with your username!)
git remote add origin https://github.com/alessandralynnroberts-hub/heartbeat.git

:: Step 3: Package and send your code
git add .
git commit -m "Launch Heartbeat Artist Management"
git branch -M main
git push -u origin main --force

echo.
echo ✨ DONE! Your site is being published.
echo.
echo 🔗 Your link will be: https://alessandralynnroberts-hub.github.io/heartbeat/
echo.
echo (Remember to add alessandralynnroberts-hub.github.io to Firebase Authorized Domains!)
pause
