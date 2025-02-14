cd %CD%\cyclone_web
call npm i
call npm run build
cd ..
rmdir /s /q server\dist
move ./cyclone_web/dist ./server/
