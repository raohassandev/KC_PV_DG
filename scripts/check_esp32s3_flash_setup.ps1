$ErrorActionPreference = "Stop"

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host "ESP32-S3 firmware download setup check"
Write-Host "======================================"

if (-not (Get-Command idf.py -ErrorAction SilentlyContinue)) {
  if (-not $env:IDF_PATH) {
    $idfCandidates = @(
      "C:\Espressif\frameworks\esp-idf-v5.5.4",
      "C:\Espressif\frameworks\esp-idf-v5.5",
      "C:\Espressif\frameworks\esp-idf"
    )
    foreach ($idfPath in $idfCandidates) {
      if (Test-Path (Join-Path $idfPath "tools\idf.py")) {
        $env:IDF_PATH = $idfPath
        Write-Host "[INFO] IDF_PATH set to $env:IDF_PATH"
        break
      }
    }
  }

  $init = "C:\Espressif\Initialize-Idf.ps1"
  if (Test-Path $init) {
    Write-Host "[INFO] Initializing ESP-IDF environment: $init"
    . $init -IdfId "esp-idf-20ee62e792ea89630ac6a777ab3ebc57"
  }
}

$idf = Get-Command idf.py -ErrorAction SilentlyContinue
if ($idf) {
  Write-Host "[OK] idf.py found: $($idf.Source)"
} elseif ($env:IDF_PATH -and (Test-Path (Join-Path $env:IDF_PATH "tools\idf.py"))) {
  Write-Host "[OK] IDF_PATH found: $env:IDF_PATH"
} else {
  Write-Host "[MISSING] ESP-IDF environment is not active."
  Write-Host "          Install ESP-IDF v5.x, then open the ESP-IDF PowerShell."
}

if (Test-Command python) {
  $pythonVersion = python --version 2>&1
  Write-Host "[OK] Python available: $pythonVersion"
} else {
  Write-Host "[MISSING] Python is not available on PATH."
}

$ports = Get-CimInstance Win32_SerialPort -ErrorAction SilentlyContinue
if ($ports) {
  Write-Host "[INFO] Serial ports:"
  foreach ($port in $ports) {
    Write-Host "       $($port.DeviceID): $($port.Name)"
  }
} else {
  Write-Host "[MISSING] No serial ports detected."
}

$espPorts = $ports | Where-Object {
  $_.DeviceID -match "^COM\d+$" -and
  $_.Name -notmatch "Active Management|AMT|SOL" -and
  (
    $_.Name -match "USB|UART|Serial|CP210|CH340|CH910|ESP|JTAG" -or
    $_.Description -match "USB|UART|Serial|CP210|CH340|CH910|ESP|JTAG"
  )
}

$pnpEspPorts = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Name -match "\(COM\d+\)" -and
    $_.Name -notmatch "Active Management|AMT|SOL" -and
    (
      $_.Name -match "USB|UART|Serial|SERIAL|CP210|CH340|CH343|CH910|ESP|JTAG" -or
      $_.DeviceID -match "VID_1A86|VID_10C4|VID_303A"
    )
  }

if ($espPorts -or $pnpEspPorts) {
  Write-Host "[OK] Possible ESP board port(s):"
  foreach ($port in $espPorts) {
    Write-Host "     $($port.DeviceID): $($port.Name)"
  }
  foreach ($port in $pnpEspPorts) {
    Write-Host "     $($port.Name)"
  }
} else {
  Write-Host "[MISSING] No ESP USB serial/JTAG port detected."
  Write-Host "          Connect the ESP32-S3 board by USB and install the board driver if needed."
}

Write-Host ""
Write-Host "Flash command once setup is OK:"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\flash_esp32s3.ps1 -Port COMx -Monitor"
