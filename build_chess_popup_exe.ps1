Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MainScript = Join-Path $ScriptDir "chess_popup_app.py"
$IconPath = Join-Path $ScriptDir "chess_popup.ico"
$DistPath = Join-Path $ScriptDir "dist"
$BuildPath = Join-Path $ScriptDir "build"
$SpecPath = Join-Path $ScriptDir "ChessPopup.spec"
$ExePath = Join-Path $DistPath "ChessPopup\ChessPopup.exe"

if (-not (Test-Path -LiteralPath $MainScript)) {
    throw "Could not find chess_popup_app.py next to the build script."
}

$arguments = @(
    "-m", "PyInstaller",
    "--noconfirm",
    "--clean",
    "--windowed",
    "--name", "ChessPopup",
    "--distpath", $DistPath,
    "--workpath", $BuildPath,
    "--specpath", $ScriptDir,
    "--icon", $IconPath,
    "--hidden-import", "PySide6.QtWebEngineCore",
    "--hidden-import", "PySide6.QtWebEngineWidgets",
    "--hidden-import", "PySide6.QtPrintSupport",
    "--add-data", ((Join-Path $ScriptDir "chess_popup.html") + ";."),
    "--add-data", ((Join-Path $ScriptDir "chess_popup.css") + ";."),
    "--add-data", ((Join-Path $ScriptDir "chess_popup.js") + ";."),
    "--add-data", ((Join-Path $ScriptDir "chess_popup.ico") + ";."),
    $MainScript
)

& python @arguments

if ($LASTEXITCODE -ne 0) {
    throw "PyInstaller failed while building ChessPopup.exe."
}

if (-not (Test-Path -LiteralPath $ExePath)) {
    throw "Build completed without producing dist\\ChessPopup\\ChessPopup.exe."
}

Write-Output "Built executable: $ExePath"
Write-Output "Spec file: $SpecPath"
