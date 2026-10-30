$ErrorActionPreference = 'Stop'
$playableRoot = Split-Path -Parent $PSScriptRoot
$playableEnvPath = Join-Path $playableRoot '.env.twitch'
if (Test-Path -LiteralPath $playableEnvPath) {
  Write-Host '.env.twitch already exists. Edit that file locally to update credentials; existing encryption keys must be preserved.'
  exit 1
}
Write-Host 'Register a confidential Twitch app with redirect URL http://localhost:3000/auth/twitch/callback.'
Write-Host 'Enter the credentials here in your own terminal. Do not paste secrets into chat.'
$playableClientId = (Read-Host 'Twitch Client ID').Trim()
$playableSecureSecret = Read-Host 'Twitch Client Secret (hidden)' -AsSecureString
$playableLogin = (Read-Host 'Your broadcaster username (without @)').Trim().ToLowerInvariant()
if ($playableClientId -notmatch '^[a-zA-Z0-9]{10,100}$' -or $playableLogin -notmatch '^[a-z0-9_]{1,25}$') { throw 'Check the Client ID and broadcaster username.' }
$playablePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($playableSecureSecret)
try { $playableSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($playablePointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($playablePointer) }
if ($playableSecret -notmatch '^[a-zA-Z0-9]{10,200}$') { throw 'Check the Client Secret.' }
$playableAppToken = $null
try {
  $playableTokenResponse = Invoke-RestMethod -Method Post -Uri 'https://id.twitch.tv/oauth2/token' -ContentType 'application/x-www-form-urlencoded' -Body @{ client_id=$playableClientId; client_secret=$playableSecret; grant_type='client_credentials' } -TimeoutSec 20
  $playableAppToken = $playableTokenResponse.access_token
  $playableUserResponse = Invoke-RestMethod -Uri ('https://api.twitch.tv/helix/users?login=' + $playableLogin) -Headers @{ Authorization=('Bearer ' + $playableAppToken); 'Client-Id'=$playableClientId } -TimeoutSec 20
  if ($playableUserResponse.data.Count -ne 1) { throw 'Broadcaster not found.' }
  $playableBroadcasterId = [string]$playableUserResponse.data[0].id
  if ($playableBroadcasterId -notmatch '^\d{1,30}$') { throw 'Invalid broadcaster response.' }
} catch {
  throw 'Could not validate the app and broadcaster with Twitch. Check your app credentials, username and internet connection.'
} finally {
  if ($playableAppToken) {
    try { $null = Invoke-RestMethod -Method Post -Uri 'https://id.twitch.tv/oauth2/revoke' -ContentType 'application/x-www-form-urlencoded' -Body @{ client_id=$playableClientId; token=$playableAppToken } -TimeoutSec 10 } catch { }
  }
  $playableTokenResponse = $null
  $playableAppToken = $null
}
function New-PlayableKey {
  $playableKeyBytes = New-Object byte[] 32
  $playableGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $playableGenerator.GetBytes($playableKeyBytes); return [Convert]::ToBase64String($playableKeyBytes) }
  finally { $playableGenerator.Dispose(); [Array]::Clear($playableKeyBytes, 0, $playableKeyBytes.Length) }
}
$playableLines = @(
  '# Local Twitch configuration. Keep this file private and preserve its keys.'
  'NODE_ENV=development'
  'APP_MODE=real'
  'HOST=127.0.0.1'
  'PORT=3000'
  'APP_ORIGIN=http://localhost:5173'
  'TWITCH_REDIRECT_URI=http://localhost:3000/auth/twitch/callback'
  ('TWITCH_CLIENT_ID=' + $playableClientId)
  ('TWITCH_CLIENT_SECRET=' + $playableSecret)
  ('ALLOWED_BROADCASTER_ID=' + $playableBroadcasterId)
  ('TOKEN_ENCRYPTION_KEY_BASE64=' + (New-PlayableKey))
  ('SESSION_SIGNING_KEY_BASE64=' + (New-PlayableKey))
  ('VOTE_HMAC_KEY_BASE64=' + (New-PlayableKey))
  'DATA_DIR=./data/twitch'
  'MIN_FREE_DISK_BYTES=2147483648'
)
$playableText = ($playableLines -join "`n") + "`n"
$playableStream = [IO.File]::Open($playableEnvPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
try { $playableBytes = [Text.Encoding]::UTF8.GetBytes($playableText); $playableStream.Write($playableBytes, 0, $playableBytes.Length) }
finally { $playableStream.Dispose(); $playableSecret = $null; $playableLines = $null; $playableText = $null; $playableSecureSecret.Dispose() }
Write-Host ('Saved private local configuration for ' + $playableLogin + ' (ID ' + $playableBroadcasterId + ').')
Write-Host 'Stop the running demo with Ctrl+C, then run .\start-twitch.cmd and open http://localhost:5173/studio.'
