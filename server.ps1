param(
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Web

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$prefix = "http://localhost:$Port/"

$mime = @{ 
  ".html" = "text/html; charset=utf-8";
  ".css"  = "text/css; charset=utf-8";
  ".js"   = "text/javascript; charset=utf-8";
  ".json" = "application/json; charset=utf-8";
  ".webmanifest" = "application/manifest+json; charset=utf-8";
  ".svg"  = "image/svg+xml";
  ".png"  = "image/png";
  ".jpg"  = "image/jpeg";
  ".jpeg" = "image/jpeg";
  ".ico"  = "image/x-icon";
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Server running at $prefix"

try {
  while ($true) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $path = [System.Web.HttpUtility]::UrlDecode($req.Url.AbsolutePath)
    if ($path -eq '/') { $path = '/index.html' }
    $filePath = Join-Path $root $path.TrimStart('/')
    $full = [System.IO.Path]::GetFullPath($filePath)

    if (-not $full.StartsWith($root)) {
      $res.StatusCode = 403
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
      $res.OutputStream.Write($bytes,0,$bytes.Length)
      $res.OutputStream.Close()
      continue
    }

    if (Test-Path $full) {
      if ((Get-Item $full).PSIsContainer) { $full = Join-Path $full 'index.html' }
      if (-not (Test-Path $full)) {
        $res.StatusCode = 404
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
        $res.OutputStream.Write($bytes,0,$bytes.Length)
        $res.OutputStream.Close()
        continue
      }
      $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
      $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $res.Headers['Content-Type'] = $contentType
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $res.StatusCode = 200
      $res.OutputStream.Write($bytes,0,$bytes.Length)
      $res.OutputStream.Close()
    } else {
      $res.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
      $res.OutputStream.Write($bytes,0,$bytes.Length)
      $res.OutputStream.Close()
    }
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}