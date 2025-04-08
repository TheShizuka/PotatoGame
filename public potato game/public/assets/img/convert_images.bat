@echo off
setlocal enabledelayedexpansion
for %%i in (0 1 2 3 4 5 6 7 8 9 10) do (
    ffmpeg -i circle%%i.png -vf "scale=iw*0.5:ih*0.5" circle%%i.webp
)
endlocal
