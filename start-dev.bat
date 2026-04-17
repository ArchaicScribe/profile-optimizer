@echo off
cd /d C:\Users\xande\dev\profile-optimizer
for /f "usebackq tokens=1,2 delims==" %%a in (".env.local") do (
  if "%%a"=="ANTHROPIC_API_KEY" set ANTHROPIC_API_KEY=%%b
)
npm run dev
