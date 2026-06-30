This directory holds app icons for Electron builds.

Required files:
- icon.ico (256x256 .ico for Windows)
- icon.icns (1024x1024 .icns for Mac)
- icon.png (512x512 .png fallback)

You can generate these from any PNG using:
- Windows: https://convertico.com/ 
- Mac: Use `iconutil` command or https://cloudconvert.com/png-to-icns
- Or use electron-icon-builder: npx electron-icon-builder --input=icon.png --output=build/
