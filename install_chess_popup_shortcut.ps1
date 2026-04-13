param(
    [string]$ShortcutPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VbsPath = Join-Path $ScriptDir "launch_chess_popup.vbs"
$IconPath = Join-Path $ScriptDir "chess_popup.ico"
$DesktopPath = [Environment]::GetFolderPath("DesktopDirectory")
if ([string]::IsNullOrWhiteSpace($ShortcutPath)) {
    $ShortcutPath = Join-Path $DesktopPath "Chess Popup.lnk"
}

function Save-BitmapAsIcon {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$DestinationPath
    )

    $memoryStream = New-Object System.IO.MemoryStream
    try {
        $Bitmap.Save($memoryStream, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngBytes = $memoryStream.ToArray()
        $fileStream = [System.IO.File]::Open($DestinationPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
        try {
            $writer = New-Object System.IO.BinaryWriter($fileStream)
            try {
                $writer.Write([UInt16]0)
                $writer.Write([UInt16]1)
                $writer.Write([UInt16]1)
                $writer.Write([byte]0)
                $writer.Write([byte]0)
                $writer.Write([byte]0)
                $writer.Write([byte]0)
                $writer.Write([UInt16]1)
                $writer.Write([UInt16]32)
                $writer.Write([UInt32]$pngBytes.Length)
                $writer.Write([UInt32]22)
                $writer.Write($pngBytes)
            }
            finally {
                $writer.Dispose()
            }
        }
        finally {
            $fileStream.Dispose()
        }
    }
    finally {
        $memoryStream.Dispose()
    }
}

function New-ChessBitmap {
    $bitmap = New-Object System.Drawing.Bitmap 256, 256, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.Clear([System.Drawing.Color]::Transparent)

        $backgroundBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(18, 37, 48))
        $graphics.FillRectangle($backgroundBrush, 18, 18, 220, 220)

        $lightBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(241, 236, 227))
        $darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(48, 52, 58))
        $squareSize = 48
        for ($row = 0; $row -lt 4; $row++) {
            for ($col = 0; $col -lt 4; $col++) {
                $brush = if ((($row + $col) % 2) -eq 0) { $lightBrush } else { $darkBrush }
                $graphics.FillRectangle($brush, 32 + ($col * $squareSize), 52 + ($row * $squareSize), $squareSize, $squareSize)
            }
        }

        $accentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(217, 143, 43))
        $graphics.FillEllipse($accentBrush, 170, 24, 46, 46)

        $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(35, 0, 0, 0))
        $pieceFont = New-Object System.Drawing.Font("Segoe UI Symbol", 112, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        $pieceBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(246, 244, 237))
        $graphics.DrawString([string][char]0x2658, $pieceFont, $shadowBrush, 92, 90)
        $graphics.DrawString([string][char]0x2658, $pieceFont, $pieceBrush, 86, 84)
    }
    finally {
        $graphics.Dispose()
    }
    return $bitmap
}

if (-not (Test-Path -LiteralPath $VbsPath)) {
    throw "Could not find launch_chess_popup.vbs next to the installer."
}

$bitmap = New-ChessBitmap
try {
    Save-BitmapAsIcon -Bitmap $bitmap -DestinationPath $IconPath
}
finally {
    $bitmap.Dispose()
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = $VbsPath
$shortcut.WorkingDirectory = $ScriptDir
$shortcut.IconLocation = $IconPath
$shortcut.Description = "Open Chess Popup."
$shortcut.Save()

Write-Output "Shortcut: $ShortcutPath"
Write-Output "Icon: $IconPath"
