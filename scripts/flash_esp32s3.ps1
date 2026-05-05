param(
  [string]$Port = "",
  [switch]$Monitor,
  [switch]$EraseFlash,
  [string]$FirmwareDir = "firmware\esp32-s3"
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  $root = git rev-parse --show-toplevel 2>$null
  if (-not $root) {
    throw "Run this script from inside the KC_PV_DG git repository."
  }
  return $root.Trim()
}

function Find-IdfPy {
  if ($env:IDF_PATH) {
    $candidate = Join-Path $env:IDF_PATH "tools\idf.py"
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  $cmd = Get-Command idf.py -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $candidateRoots = @(
    "C:\Espressif",
    "C:\esp",
    "$env:USERPROFILE\esp"
  )

  foreach ($root in $candidateRoots) {
    if (-not (Test-Path $root)) {
      continue
    }

    $found = Get-ChildItem -Path $root -Filter idf.py -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -match "\\esp-idf\\tools\\idf\.py$" } |
      Select-Object -First 1

    if ($found) {
      return $found.FullName
    }
  }

  return $null
}

function Initialize-IdfEnvironment {
  if (Get-Command idf.py -ErrorAction SilentlyContinue) {
    return
  }

  if (-not $env:IDF_PATH) {
    $idfCandidates = @(
      "C:\Espressif\frameworks\esp-idf-v5.5.4",
      "C:\Espressif\frameworks\esp-idf-v5.5",
      "C:\Espressif\frameworks\esp-idf"
    )
    foreach ($idf in $idfCandidates) {
      if (Test-Path (Join-Path $idf "tools\idf.py")) {
        $env:IDF_PATH = $idf
        break
      }
    }
  }

  $initCandidates = @(
    "C:\Espressif\Initialize-Idf.ps1",
    "$env:USERPROFILE\.espressif\Initialize-Idf.ps1"
  )

  foreach ($init in $initCandidates) {
    if (Test-Path $init) {
      Write-Host "Initializing ESP-IDF environment: $init"
      . $init -IdfId "esp-idf-20ee62e792ea89630ac6a777ab3ebc57"
      return
    }
  }
}

function Find-EspPort {
  $ports = Get-CimInstance Win32_SerialPort -ErrorAction SilentlyContinue |
    Where-Object {
      $_.DeviceID -match "^COM\d+$" -and
      $_.Name -notmatch "Active Management|AMT|SOL" -and
      (
        $_.Name -match "USB|UART|Serial|CP210|CH340|CH910|ESP|JTAG" -or
        $_.Description -match "USB|UART|Serial|CP210|CH340|CH910|ESP|JTAG"
      )
    } |
    Sort-Object DeviceID

  if (($ports | Measure-Object).Count -eq 1) {
    return $ports[0].DeviceID
  }

  if (($ports | Measure-Object).Count -gt 1) {
    $list = ($ports | ForEach-Object { "$($_.DeviceID): $($_.Name)" }) -join "`n"
    throw "Multiple possible ESP serial ports found. Re-run with -Port COMx.`n$list"
  }

  $pnpPorts = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -match "\(COM\d+\)" -and
      $_.Name -notmatch "Active Management|AMT|SOL" -and
      (
        $_.Name -match "USB|UART|Serial|SERIAL|CP210|CH340|CH343|CH910|ESP|JTAG" -or
        $_.DeviceID -match "VID_1A86|VID_10C4|VID_303A"
      )
    } |
    Sort-Object Name

  if (($pnpPorts | Measure-Object).Count -eq 1) {
    if ($pnpPorts[0].Name -match "(COM\d+)") {
      return $Matches[1]
    }
  }

  if (($pnpPorts | Measure-Object).Count -gt 1) {
    $list = ($pnpPorts | ForEach-Object { "$($_.Name)" }) -join "`n"
    throw "Multiple possible ESP PnP ports found. Re-run with -Port COMx.`n$list"
  }

  return $null
}

$repoRoot = Resolve-RepoRoot
$projectDir = Join-Path $repoRoot $FirmwareDir
if (-not (Test-Path $projectDir)) {
  throw "Firmware directory not found: $projectDir"
}

Initialize-IdfEnvironment
$idfPy = Find-IdfPy
if (-not $idfPy) {
  throw @"
ESP-IDF was not found.

Install ESP-IDF v5.x, then open the ESP-IDF PowerShell and run:
  .\scripts\flash_esp32s3.ps1 -Port COMx

Expected firmware directory:
  $projectDir
"@
}

if (-not $Port) {
  $Port = Find-EspPort
}

if (-not $Port) {
  throw @"
No ESP32-S3 serial port was detected.

Connect the board by USB, install the board USB driver if needed, then re-run:
  .\scripts\flash_esp32s3.ps1 -Port COMx

Currently detected serial ports:
$((Get-CimInstance Win32_SerialPort -ErrorAction SilentlyContinue | ForEach-Object { "  $($_.DeviceID): $($_.Name)" }) -join "`n")

Currently detected USB/PnP COM devices:
$((Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "\(COM\d+\)" } | ForEach-Object { "  $($_.Name)" }) -join "`n")
"@
}

Push-Location $projectDir
try {
  Write-Host "Using ESP-IDF: $idfPy"
  Write-Host "Using port: $Port"
  Write-Host "Firmware: $projectDir"

  if ($idfPy -match "\.exe$") {
    $idfCmd = { & $idfPy @args }
  } else {
    $idfCmd = { & python $idfPy @args }
  }

  & $idfCmd set-target esp32s3
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  & $idfCmd build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if ($EraseFlash) {
    & $idfCmd -p $Port erase-flash
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  if ($Monitor) {
    & $idfCmd -p $Port flash monitor
  } else {
    & $idfCmd -p $Port flash
  }

  exit $LASTEXITCODE
} finally {
  Pop-Location
}
