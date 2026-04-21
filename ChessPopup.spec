# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:\\Users\\breeves\\Desktop\\VS Code\\Chess Popup\\chess_popup_app.py'],
    pathex=[],
    binaries=[],
    datas=[('C:\\Users\\breeves\\Desktop\\VS Code\\Chess Popup\\chess_popup.html', '.'), ('C:\\Users\\breeves\\Desktop\\VS Code\\Chess Popup\\chess_popup.css', '.'), ('C:\\Users\\breeves\\Desktop\\VS Code\\Chess Popup\\chess_popup.js', '.'), ('C:\\Users\\breeves\\Desktop\\VS Code\\Chess Popup\\chess_popup.ico', '.')],
    hiddenimports=['PySide6.QtWebEngineCore', 'PySide6.QtWebEngineWidgets', 'PySide6.QtPrintSupport'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='ChessPopup',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['C:\\Users\\breeves\\Desktop\\VS Code\\Chess Popup\\chess_popup.ico'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='ChessPopup',
)
