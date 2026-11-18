<#
.SYNOPSIS
  Final real-project test for eslint-plugin-sitecore-jss: rebuilds and repacks the plugin, installs the
  tarball into the Content SDK starter apps (App Router and Pages Router), lints them, runs --fix on a
  scratch copy of the deliberately bad components, type-checks the result and prints PASS/FAIL.

.DESCRIPTION
  Run from the plugin repo:

      powershell -ExecutionPolicy Bypass -File scripts\final-test.ps1

  The starter apps live in a git worktree of C:\projects\contentSDK (branch
  test/eslint-plugin-sitecore-jss-v2). Each app must already have its dependencies installed, the plugin
  wired into eslint.config.mjs and the bad components in src\components\eslint-plugin-test.
  See docs\real-project-test-report.md for how that was set up.

  The script never touches Sitecore, never reads .env files and never commits. It changes, per app:
  package.json / package-lock.json (the tarball path) and node_modules. Scratch files are removed again.

.PARAMETER StarterRoot
  Folder that contains the starter apps.

.PARAMETER Apps
  App folder names inside StarterRoot.

.PARAMETER SkipPluginChecks
  Skip `npm test`, `npm run lint` and `npm run typecheck` in the plugin repo (build + pack still run).

.PARAMETER Build
  Also run `next build` in each app with the fixed scratch copy in place. Needs the app's .env
  (Sitecore connectivity), so it is off by default.
#>
[CmdletBinding()]
param(
  [string]$StarterRoot = 'C:\projects\contentSDK-eslint-plugin-test',
  [string[]]$Apps = @('nextjs-app-router', 'nextjs-page-router'),
  [switch]$SkipPluginChecks,
  [switch]$Build
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$WorkDir = Join-Path ([System.IO.Path]::GetTempPath()) 'eslint-plugin-sitecore-jss-final-test'
$BadDir = 'src/components/eslint-plugin-test'
$FixedDir = 'src/components/eslint-plugin-fixed'
$ImportSourceConfig = 'eslint.final-test-importsource.tmp.mjs'
$ImportSourcePackage = '@sitecore-content-sdk/react'

# What the bad components must produce (see docs\real-project-test-report.md).
$ExpectedByRule = [ordered]@{
  'sitecore-jss/enforce-text-component'     = 11
  'sitecore-jss/enforce-richtext-component' = 4
  'sitecore-jss/enforce-image-component'    = 5
  'sitecore-jss/enforce-link-component'     = 4
  'sitecore-jss/enforce-file-component'     = 2
}
$ExpectedTotal = 26
$ExpectedFixable = 22
# After --fix only these remain: mixed children, custom wrapper, next/image and next/link conflicts.
$ExpectedUnfixable = @('useImageComponent', 'useLinkComponent', 'useTextComponent', 'useTextComponentInWrapper')

$Results = New-Object System.Collections.ArrayList

function Add-Check([string]$Scope, [string]$Name, [bool]$Ok, [string]$Detail = '') {
  [void]$Results.Add([pscustomobject]@{ Scope = $Scope; Name = $Name; Ok = $Ok; Detail = $Detail })
  $status = 'FAIL'
  $color = 'Red'
  if ($Ok) { $status = 'PASS'; $color = 'Green' }
  $line = "  [$status] $Name"
  if ($Detail) { $line += " - $Detail" }
  Write-Host $line -ForegroundColor $color
}

function Invoke-Tool([string]$File, [string[]]$Arguments, [string]$Cwd, [string]$Tag) {
  # Runs a native command with stdout/stderr captured in files (PowerShell 5.1 turns native stderr
  # into error records, so it is never redirected inside the pipeline).
  $out = Join-Path $WorkDir "$Tag.out.txt"
  $err = Join-Path $WorkDir "$Tag.err.txt"
  $quoted = $Arguments | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }
  $process = Start-Process -FilePath $File -ArgumentList $quoted -WorkingDirectory $Cwd -NoNewWindow `
    -Wait -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
  $stderr = ''
  if (Test-Path $err) { $stderr = "$(Get-Content $err -Raw)" }
  $stdout = ''
  if (Test-Path $out) { $stdout = "$(Get-Content $out -Raw)" }
  return [pscustomobject]@{ ExitCode = $process.ExitCode; StdOut = $stdout; StdErr = $stderr.Trim() }
}

function Invoke-Npm([string[]]$Arguments, [string]$Cwd, [string]$Tag) {
  return Invoke-Tool 'npm.cmd' $Arguments $Cwd $Tag
}

function Invoke-EsLint([string]$AppDir, [string[]]$Arguments, [string]$Tag) {
  # Returns exit code, stderr and the parsed JSON results (null when ESLint wrote none).
  $json = Join-Path $WorkDir "$Tag.json"
  if (Test-Path $json) { Remove-Item $json -Force }
  $eslint = Join-Path $AppDir 'node_modules\eslint\bin\eslint.js'
  $run = Invoke-Tool 'node' (@($eslint) + $Arguments + @('-f', 'json', '-o', $json)) $AppDir $Tag
  $parsed = $null
  if (Test-Path $json) { $parsed = Get-Content $json -Raw -Encoding UTF8 | ConvertFrom-Json }
  return [pscustomobject]@{ ExitCode = $run.ExitCode; StdErr = $run.StdErr; Results = $parsed }
}

function Get-Messages($LintResults) {
  $all = @()
  foreach ($file in @($LintResults)) {
    foreach ($message in @($file.messages)) {
      if ($null -ne $message) {
        $all += [pscustomobject]@{
          File      = $file.filePath
          Line      = $message.line
          RuleId    = [string]$message.ruleId
          MessageId = [string]$message.messageId
          Severity  = $message.severity
          Fatal     = [bool]$message.fatal
          HasFix    = ($null -ne $message.fix)
          Message   = [string]$message.message
        }
      }
    }
  }
  return $all
}

function Get-PluginMessages($LintResults) {
  return @(Get-Messages $LintResults) | Where-Object { $_.RuleId -like 'sitecore-jss/*' }
}

function Test-CleanRun($Run) {
  # No stderr output and no fatal (parse / configuration) message.
  if ($null -eq $Run.Results) { return $false }
  if ($Run.StdErr) { return $false }
  return (@(@(Get-Messages $Run.Results) | Where-Object { $_.Fatal }).Count -eq 0)
}

function Get-Hash([string]$Path) {
  return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash
}

function Test-Plugin {
  Write-Host ''
  Write-Host '== Plugin: build, checks, pack ==' -ForegroundColor Cyan

  $build = Invoke-Npm @('run', 'build') $RepoRoot 'plugin-build'
  Add-Check 'plugin' 'npm run build' ($build.ExitCode -eq 0)
  if ($build.ExitCode -ne 0) { Write-Host $build.StdOut; Write-Host $build.StdErr; return $null }

  if (-not $SkipPluginChecks) {
    foreach ($step in @(@('test'), @('run', 'lint'), @('run', 'typecheck'))) {
      $name = 'npm ' + ($step -join ' ')
      $run = Invoke-Npm $step $RepoRoot ('plugin-' + $step[-1])
      Add-Check 'plugin' $name ($run.ExitCode -eq 0)
      if ($run.ExitCode -ne 0) { Write-Host $run.StdOut; Write-Host $run.StdErr }
    }
  }

  Get-ChildItem $WorkDir -Filter '*.tgz' | Remove-Item -Force
  $pack = Invoke-Npm @('pack', '--pack-destination', $WorkDir) $RepoRoot 'plugin-pack'
  $tarball = Get-ChildItem $WorkDir -Filter 'eslint-plugin-sitecore-jss-*.tgz' | Select-Object -First 1
  $ok = ($pack.ExitCode -eq 0) -and ($null -ne $tarball)
  $detail = ''
  if ($tarball) { $detail = $tarball.Name }
  Add-Check 'plugin' 'npm pack' $ok $detail
  if (-not $ok) { Write-Host $pack.StdErr; return $null }
  return $tarball.FullName
}

function Test-App([string]$App, [string]$Tarball) {
  $appDir = Join-Path $StarterRoot $App
  Write-Host ''
  Write-Host "== $App ==" -ForegroundColor Cyan

  $badPath = Join-Path $appDir $BadDir
  $fixedPath = Join-Path $appDir $FixedDir
  $configPath = Join-Path $appDir $ImportSourceConfig
  $ready = (Test-Path (Join-Path $appDir 'node_modules\eslint')) -and (Test-Path $badPath)
  Add-Check $App 'app is prepared (node_modules, bad components)' $ready $appDir
  if (-not $ready) { return }

  try {
    if (Test-Path $fixedPath) { Remove-Item $fixedPath -Recurse -Force }

    # --- install the tarball ---------------------------------------------------------------
    $install = Invoke-Npm @('install', '--save-dev', '--no-audit', '--no-fund', $Tarball) $appDir "$App-install"
    $installed = Join-Path $appDir 'node_modules\eslint-plugin-sitecore-jss'
    $same = $false
    if ($install.ExitCode -eq 0) {
      $same = $true
      foreach ($file in @('dist\index.js', 'dist\utils\imports.js', 'package.json')) {
        if ((Get-Hash (Join-Path $installed $file)) -ne (Get-Hash (Join-Path $RepoRoot $file))) { $same = $false }
      }
    }
    Add-Check $App 'install tarball (installed copy equals this build)' $same
    if (-not $same) { Write-Host $install.StdErr; return }

    # --- baseline: the app's own source --------------------------------------------------
    $baseline = Invoke-EsLint $appDir @('src/**/*.ts', 'src/**/*.tsx', '--ignore-pattern', "$BadDir/**",
      '--ignore-pattern', "$FixedDir/**") "$App-baseline"
    Add-Check $App 'baseline lint runs clean (no stderr, no fatal)' (Test-CleanRun $baseline) $baseline.StdErr
    $baselineFindings = @(Get-PluginMessages $baseline.Results)
    Add-Check $App 'baseline: no plugin findings in the starter components' ($baselineFindings.Count -eq 0) `
      "$($baselineFindings.Count) finding(s) in $(@($baseline.Results).Count) files"
    foreach ($finding in $baselineFindings) {
      Write-Host "      $($finding.File):$($finding.Line) $($finding.RuleId) $($finding.MessageId)"
    }

    # --- plain JS files must not crash the type-aware rules ---------------------------
    $js = Invoke-EsLint $appDir @('eslint.config.mjs') "$App-js"
    Add-Check $App 'plain JS file (eslint.config.mjs) lints without a type-information error' (Test-CleanRun $js) `
      ($js.StdErr -split "`n" | Select-Object -First 3 | Out-String).Trim()

    # --- bad components: flat/recommended --------------------------------------------
    $bad = Invoke-EsLint $appDir @($BadDir) "$App-bad"
    Add-Check $App 'bad components lint runs clean (no stderr, no fatal)' (Test-CleanRun $bad) $bad.StdErr
    $findings = @(Get-PluginMessages $bad.Results)
    $byRuleOk = $true
    $summary = @()
    foreach ($rule in $ExpectedByRule.Keys) {
      $count = @($findings | Where-Object { $_.RuleId -eq $rule }).Count
      $summary += "$($rule -replace 'sitecore-jss/enforce-', '' -replace '-component', '')=$count"
      if ($count -ne $ExpectedByRule[$rule]) { $byRuleOk = $false }
    }
    Add-Check $App "bad components: $ExpectedTotal findings, expected count per rule" `
      ($byRuleOk -and $findings.Count -eq $ExpectedTotal) ($summary -join ' ')
    $fixable = @($findings | Where-Object { $_.HasFix }).Count
    Add-Check $App "bad components: $ExpectedFixable findings carry a fix" ($fixable -eq $ExpectedFixable) "$fixable fixable"
    $warnings = @($findings | Where-Object { $_.Severity -eq 1 }).Count
    Add-Check $App 'flat/recommended reports warnings' ($warnings -eq $findings.Count -and $findings.Count -gt 0)

    # --- flat/strict -----------------------------------------------------------------------
    $env:SITECORE_JSS_CONFIG = 'strict'
    try { $strict = Invoke-EsLint $appDir @($BadDir) "$App-strict" } finally { Remove-Item Env:\SITECORE_JSS_CONFIG }
    $strictFindings = @(Get-PluginMessages $strict.Results)
    $errors = @($strictFindings | Where-Object { $_.Severity -eq 2 }).Count
    Add-Check $App 'flat/strict reports the same findings as errors (exit code 1)' `
      ($strict.ExitCode -eq 1 -and $errors -eq $ExpectedTotal -and $strictFindings.Count -eq $ExpectedTotal) `
      "$errors errors, exit $($strict.ExitCode)"

    # --- importSource option ------------------------------------------------------------
    Copy-Item $badPath $fixedPath -Recurse
    $config = @"
// Temporary config written by eslint-plugin-sitecore-jss scripts/final-test.ps1; safe to delete.
import base from "./eslint.config.mjs";
export default [
  ...base,
  {
    files: ["**/*.tsx"],
    rules: {
      "sitecore-jss/enforce-text-component": ["warn", { importSource: "$ImportSourcePackage" }],
      "sitecore-jss/enforce-image-component": ["warn", { importSource: "$ImportSourcePackage" }],
    },
  },
];
"@
    [System.IO.File]::WriteAllText($configPath, $config)
    $target = "$FixedDir/BadNoSitecoreImport.tsx"
    $importRun = Invoke-EsLint $appDir @('-c', $ImportSourceConfig, '--fix', $target) "$App-importsource"
    $text = [System.IO.File]::ReadAllText((Join-Path $appDir $target))
    $importOk = (Test-CleanRun $importRun) -and
      ($text -match ('import \{ Text, Image \} from "' + [regex]::Escape($ImportSourcePackage) + '"'))
    Add-Check $App "importSource option: the fix imports from $ImportSourcePackage" $importOk $importRun.StdErr
    Remove-Item $configPath -Force
    Remove-Item $fixedPath -Recurse -Force

    # --- eslint --fix on a scratch copy ------------------------------------------------
    Copy-Item $badPath $fixedPath -Recurse
    $fix = Invoke-EsLint $appDir @('--fix', $FixedDir) "$App-fix"
    Add-Check $App 'eslint --fix runs clean (no stderr, no fatal)' (Test-CleanRun $fix) $fix.StdErr

    $fields = [System.IO.File]::ReadAllText((Join-Path $fixedPath 'BadFields.tsx'))
    $importBlock = [regex]::Match($fields, 'import\s*\{([^}]*)\}\s*from\s*"@sitecore-content-sdk/nextjs"').Groups[1].Value
    $names = @($importBlock -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    $missing = @('Text', 'RichText', 'Image', 'Link', 'File' | Where-Object { $names -notcontains $_ })
    Add-Check $App 'fix adds Text, Image, Link and File to the existing Sitecore import' ($missing.Count -eq 0) `
      ($missing -join ', ')
    $rewritten = ($fields -match '<Text field=\{fields\.Title\} tag="h1" className="title" />') -and
      ($fields -match '<RichText field=\{fields\.Body\} tag="div" className="rte" />') -and
      ($fields -match '<Image field=\{fields\.Image\} alt="Hero" className="hero" />') -and
      ($fields -match '<Link field=\{fields\.Link\} className="cta">') -and
      ($fields -match '<File field=\{fields\.File\} />') -and
      ($fields -notmatch '__html') -and ($fields -notmatch 'field={fields.Body} tag="p"')
    Add-Check $App 'fix rewrites text, rich text, image, link and file elements' $rewritten

    $noImports = [System.IO.File]::ReadAllText((Join-Path $fixedPath 'BadNoImports.tsx'))
    $directiveFirst = $noImports.TrimStart().StartsWith('"use client";') -and
      ($noImports -match 'import \{ Text \} from "@sitecore-content-sdk/nextjs";')
    Add-Check $App 'fix keeps "use client" first in a file without imports' $directiveFirst

    $conflicts = [System.IO.File]::ReadAllText((Join-Path $fixedPath 'BadNextConflicts.tsx'))
    $original = [System.IO.File]::ReadAllText((Join-Path $badPath 'BadNextConflicts.tsx'))
    Add-Check $App 'next/link + next/image file is reported but left untouched' ($conflicts -eq $original)

    $second = Invoke-EsLint $appDir @($FixedDir) "$App-second"
    $left = @(Get-PluginMessages $second.Results)
    $leftIds = @($left | ForEach-Object { $_.MessageId } | Sort-Object)
    $leftOk = (Test-CleanRun $second) -and (($leftIds -join ',') -eq ($ExpectedUnfixable -join ',')) -and
      (@($left | Where-Object { $_.HasFix }).Count -eq 0)
    Add-Check $App 'second lint shows only the 4 unfixable findings' $leftOk ($leftIds -join ', ')

    # --- tsc on the fixed copy -----------------------------------------------------------
    $tsc = Invoke-Tool 'node' @((Join-Path $appDir 'node_modules\typescript\bin\tsc'), '--noEmit',
      '--incremental', 'false', '-p', 'tsconfig.json') $appDir "$App-tsc"
    $tscErrors = @($tsc.StdOut -split "`r?`n" | Where-Object { $_ -match 'error TS\d+' })
    $ours = @($tscErrors | Where-Object { $_ -match 'eslint-plugin-(fixed|test)' })
    $other = $tscErrors.Count - $ours.Count
    $detail = 'no type errors in the fixed components'
    if ($other -gt 0) { $detail += "; $other error(s) elsewhere in the app, not caused by the plugin" }
    Add-Check $App 'tsc --noEmit accepts the fixed components' ($ours.Count -eq 0) $detail
    foreach ($line in $ours) { Write-Host "      $line" }
    if ($other -gt 0) {
      foreach ($line in @($tscErrors | Where-Object { $_ -notmatch 'eslint-plugin-(fixed|test)' })) {
        Write-Host "      (app) $line" -ForegroundColor DarkGray
      }
    }

    # --- optional: next build ------------------------------------------------------------
    if ($Build) {
      $next = Invoke-Tool 'node' @((Join-Path $appDir 'node_modules\next\dist\bin\next'), 'build') $appDir "$App-build"
      Add-Check $App 'next build' ($next.ExitCode -eq 0) "log: $(Join-Path $WorkDir "$App-build.out.txt")"
      if ($next.ExitCode -ne 0) { Write-Host ($next.StdErr -split "`n" | Select-Object -First 30 | Out-String) }
    }
  }
  finally {
    if (Test-Path $fixedPath) { Remove-Item $fixedPath -Recurse -Force }
    if (Test-Path $configPath) { Remove-Item $configPath -Force }
  }
}

# ---------------------------------------------------------------------------------------------
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
Write-Host "eslint-plugin-sitecore-jss final test  ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))"
Write-Host "plugin repo : $RepoRoot"
Write-Host "starter root: $StarterRoot"
Write-Host "work files  : $WorkDir"

$tarball = Test-Plugin
if ($tarball) {
  foreach ($app in $Apps) { Test-App $app $tarball }
}

Write-Host ''
Write-Host '== Summary ==' -ForegroundColor Cyan
$overall = $true
foreach ($scope in (@('plugin') + $Apps)) {
  $checks = @($Results | Where-Object { $_.Scope -eq $scope })
  $failed = @($checks | Where-Object { -not $_.Ok })
  $ok = ($checks.Count -gt 0) -and ($failed.Count -eq 0)
  if (-not $ok) { $overall = $false }
  $status = 'FAIL'
  $color = 'Red'
  if ($ok) { $status = 'PASS'; $color = 'Green' }
  Write-Host ("  {0,-20} {1}  ({2}/{3} checks)" -f $scope, $status, ($checks.Count - $failed.Count), $checks.Count) -ForegroundColor $color
  foreach ($check in $failed) { Write-Host "      failed: $($check.Name) $($check.Detail)" -ForegroundColor Red }
}
if ($overall) {
  Write-Host '  OVERALL              PASS' -ForegroundColor Green
  exit 0
}
Write-Host '  OVERALL              FAIL' -ForegroundColor Red
exit 1
