Option Explicit

Dim shell
Dim fso
Dim scriptDir
Dim psScript
Dim psExe
Dim command

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
psScript = scriptDir & "\run_chess_popup.ps1"
psExe = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"

shell.CurrentDirectory = scriptDir
command = """" & psExe & """" & " -NoProfile -ExecutionPolicy Bypass -File """ & psScript & """"
shell.Run command, 0, False
