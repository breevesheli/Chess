param(
    [switch]$SkipUi
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerScript = Join-Path $ScriptDir "chess_popup_server.py"
$ServerScriptName = "chess_popup_server.py"
$PowerShellExe = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"
$MshtaExe = Join-Path $env:WINDIR "System32\mshta.exe"
$PidPath = Join-Path $ScriptDir "chess_popup_server.pid"
$Port = 8765
$BaseUrl = "http://127.0.0.1:$Port"
$StatusUrl = "$BaseUrl/api/state"
$AppUrl = "$BaseUrl/app.hta"

function Get-PythonExecutable {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand) {
        return $pythonCommand.Source
    }

    $candidate = Join-Path $env:LOCALAPPDATA "Programs\Python\Python314\python.exe"
    if (Test-Path -LiteralPath $candidate) {
        return $candidate
    }

    throw "Could not find python.exe on this machine."
}

function Test-ServerReady {
    try {
        Invoke-WebRequest -Uri $StatusUrl -UseBasicParsing -TimeoutSec 2 | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Get-TrackedServerProcess {
    if (-not (Test-Path -LiteralPath $PidPath)) {
        return $null
    }

    try {
        $rawPid = Get-Content -LiteralPath $PidPath -Raw
        $pidValue = [int]$rawPid.Trim()
        return Get-Process -Id $pidValue -ErrorAction Stop
    }
    catch {
        Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
        return $null
    }
}

if (-not (Test-Path -LiteralPath $ServerScript)) {
    throw "Could not find chess_popup_server.py next to the launcher."
}
if (-not (Test-Path -LiteralPath $MshtaExe)) {
    throw "Could not find mshta.exe on this machine."
}

$pythonExe = Get-PythonExecutable

if (-not (Test-ServerReady)) {
    $trackedProcess = Get-TrackedServerProcess
    if (-not $trackedProcess) {
        $startedProcess = Start-Process -FilePath $pythonExe -ArgumentList @(
            $ServerScriptName,
            "--host",
            "127.0.0.1",
            "--port",
            "$Port"
        ) -WorkingDirectory $ScriptDir -WindowStyle Hidden -PassThru
        Set-Content -LiteralPath $PidPath -Value $startedProcess.Id -Encoding ASCII
    }

    $attempt = 0
    while ($attempt -lt 30 -and -not (Test-ServerReady)) {
        Start-Sleep -Milliseconds 400
        $attempt += 1
    }

    if (-not (Test-ServerReady)) {
        throw "Chess Popup server did not start on $BaseUrl."
    }
}

if (-not $SkipUi) {
    Start-Process -FilePath $MshtaExe -ArgumentList $AppUrl -WorkingDirectory $ScriptDir | Out-Null
}
