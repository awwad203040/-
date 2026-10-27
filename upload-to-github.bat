@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==============================================
echo  جاري الرفع إلى مستودعات GitHub والحساب الرسمي
echo ==============================================
git push origin main
git push origin main:master
git push awwad2030 main
git push awwad2030 main:master
echo.
echo ✅ تم الرفع والتحديث بنجاح!
pause
