param(
    [switch]$Build,
    [switch]$Source
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildScript = Join-Path $ScriptDir "build_chess_popup_exe.ps1"
$PythonApp = Join-Path $ScriptDir "chess_popup_app.py"
$ExePath = Join-Path $ScriptDir "dist\ChessPopup\ChessPopup.exe"

function Get-PythonExecutable {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand) {
        return $pythonCommand.Source
    }

    throw "Could not find python.exe on this machine."
}

if ($Build) {
    & $BuildScript
}

if (-not $Source -and (Test-Path -LiteralPath $ExePath)) {
    Start-Process -FilePath $ExePath -WorkingDirectory (Split-Path -Parent $ExePath)
    return
}

$pythonExe = Get-PythonExecutable
& $pythonExe $PythonApp
