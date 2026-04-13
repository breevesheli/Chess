param(
    [string]$ShortcutPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildScriptPath = Join-Path $ScriptDir "build_chess_popup_exe.ps1"
$ExePath = Join-Path $ScriptDir "dist\ChessPopup\ChessPopup.exe"
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

function New-RoundedRectanglePath {
    param(
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius
    )

    $diameter = $Radius * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-ChessBitmap {
    $bitmap = New-Object System.Drawing.Bitmap 256, 256, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Transparent)

        $shadowPath = New-RoundedRectanglePath -X 26 -Y 30 -Width 204 -Height 204 -Radius 34
        $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(74, 0, 0, 0))
        $graphics.FillPath($shadowBrush, $shadowPath)

        $tileRect = New-Object System.Drawing.Rectangle 18, 18, 220, 220
        $tilePath = New-RoundedRectanglePath -X 18 -Y 18 -Width 220 -Height 220 -Radius 38
        $tileGradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $tileRect,
            ([System.Drawing.Color]::FromArgb(16, 34, 48)),
            ([System.Drawing.Color]::FromArgb(31, 79, 104)),
            55.0
        )
        $graphics.FillPath($tileGradient, $tilePath)

        $overlayBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(26, 255, 255, 255))
        $graphics.FillRectangle($overlayBrush, 18, 18, 220, 92)

        $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(224, 200, 159, 92)), 4
        $graphics.DrawPath($borderPen, $tilePath)

        $graphics.SetClip($tilePath)
        $lightBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(46, 245, 239, 226))
        $darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(36, 23, 41, 55))
        $squareSize = 44
        for ($row = 0; $row -lt 4; $row++) {
            for ($col = 0; $col -lt 4; $col++) {
                $brush = if ((($row + $col) % 2) -eq 0) { $lightBrush } else { $darkBrush }
                $graphics.FillRectangle($brush, 40 + ($col * $squareSize), 118 + ($row * $squareSize), $squareSize, $squareSize)
            }
        }
        $graphics.ResetClip()

        $medallionRect = New-Object System.Drawing.Rectangle 46, 42, 164, 164
        $medallionBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $medallionRect,
            ([System.Drawing.Color]::FromArgb(62, 14, 28, 40)),
            ([System.Drawing.Color]::FromArgb(128, 9, 19, 28)),
            90.0
        )
        $graphics.FillEllipse($medallionBrush, $medallionRect)

        $medallionPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(164, 228, 205, 147)), 3
        $graphics.DrawEllipse($medallionPen, $medallionRect)

        $accentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(222, 195, 142, 68))
        $graphics.FillEllipse($accentBrush, 184, 30, 28, 28)
        $graphics.FillEllipse($accentBrush, 38, 188, 22, 22)

        $pieceShadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(88, 0, 0, 0))
        $pieceAccentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(214, 194, 152, 88))
        $pieceBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(248, 245, 236))
        $pieceFont = New-Object System.Drawing.Font("Segoe UI Symbol", 126, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        $glyph = [string][char]0x265E

        $graphics.DrawString($glyph, $pieceFont, $pieceShadowBrush, 63, 44)
        $graphics.DrawString($glyph, $pieceFont, $pieceAccentBrush, 58, 39)
        $graphics.DrawString($glyph, $pieceFont, $pieceBrush, 54, 35)

        $shinePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90, 255, 255, 255)), 3
        $graphics.DrawArc($shinePen, 36, 28, 150, 82, 198, 102)
    }
    finally {
        $graphics.Dispose()
    }
    return $bitmap
}

if (-not (Test-Path -LiteralPath $BuildScriptPath)) {
    throw "Could not find build_chess_popup_exe.ps1 next to the installer."
}

$bitmap = New-ChessBitmap
try {
    Save-BitmapAsIcon -Bitmap $bitmap -DestinationPath $IconPath
}
finally {
    $bitmap.Dispose()
}

& $BuildScriptPath | Out-Null

$exeItem = Get-Item -LiteralPath $ExePath -ErrorAction Stop
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = $ExePath
$shortcut.WorkingDirectory = Split-Path -Parent $ExePath
$shortcut.IconLocation = $IconPath
$shortcut.Description = "Open Chess Popup."
$shortcut.Arguments = ""
$shortcut.Save()

Write-Output "Shortcut: $ShortcutPath"
Write-Output "Icon: $IconPath"
Write-Output "Executable: $($exeItem.FullName)"
