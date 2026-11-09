[CmdletBinding(DefaultParameterSetName = 'Days')]
param(
    [Parameter(ParameterSetName = 'Days')]
    [ValidateRange(1, 90)]
    [int]$Days = 7,

    [Parameter(ParameterSetName = 'StartDate', Mandatory = $true)]
    [datetime]$StartDate,

    [string]$BaseUrl = 'https://api.binance.com'
)

$ErrorActionPreference = 'Stop'
$apiKeyBstr = [IntPtr]::Zero
$secretBstr = [IntPtr]::Zero
$hmac = $null

try {
    Write-Host 'Binance Pay history query (read only)' -ForegroundColor Cyan
    if ($PSCmdlet.ParameterSetName -eq 'StartDate') {
        $requestedStartUtc = [DateTime]::SpecifyKind($StartDate.Date, [DateTimeKind]::Utc)
        Write-Host "Period: from $($requestedStartUtc.ToString('yyyy-MM-dd')) UTC to now. API host: $BaseUrl"
    }
    else {
        Write-Host "Period: last $Days day(s). API host: $BaseUrl"
    }
    Write-Host 'The Pay history API has a high request weight. Long ranges are split into windows with a pause between calls.'
    Write-Host 'Credentials are requested securely and are not saved in this file.'

    $apiKeySecure = Read-Host 'API Key' -AsSecureString
    $secretSecure = Read-Host 'Secret Key' -AsSecureString

    $apiKeyBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKeySecure)
    $secretBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretSecure)
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($apiKeyBstr)
    $secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretBstr)

    $base = $BaseUrl.TrimEnd('/')
    $serverTime = Invoke-RestMethod -Method Get -Uri "$base/api/v3/time"
    $localTime = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $clockOffset = [int64]$serverTime.serverTime - $localTime
    $rangeEndMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + $clockOffset
    $oldestAllowedMs = [DateTimeOffset]::UtcNow.AddMonths(-18).ToUnixTimeMilliseconds() + $clockOffset

    if ($PSCmdlet.ParameterSetName -eq 'StartDate') {
        $rangeStartMs = [DateTimeOffset]::new($requestedStartUtc).ToUnixTimeMilliseconds()
        if ($rangeStartMs -lt $oldestAllowedMs) {
            $oldestAllowedDate = [DateTimeOffset]::FromUnixTimeMilliseconds($oldestAllowedMs).UtcDateTime.ToString('yyyy-MM-dd')
            if ($requestedStartUtc.ToString('yyyy-MM-dd') -eq $oldestAllowedDate) {
                $rangeStartMs = $oldestAllowedMs + ([int64]24 * 60 * 60 * 1000)
                Write-Host "Start moved one day inside the 18-month window: $([DateTimeOffset]::FromUnixTimeMilliseconds($rangeStartMs).UtcDateTime.ToString('u'))"
            }
            else {
                throw "The Pay API only supports the last 18 months. Choose $oldestAllowedDate UTC or later."
            }
        }
    }
    else {
        $rangeStartMs = $rangeEndMs - ([int64]$Days * 24 * 60 * 60 * 1000)
    }

    # Binance limits each Pay-history query to a maximum 90-day span.
    # Use 89 days between endpoints to stay safely within that limit.
    $maxWindowSpanMs = [int64]89 * 24 * 60 * 60 * 1000
    $allTransactions = New-Object 'System.Collections.Generic.List[object]'
    $windowStartMs = $rangeStartMs
    $windowNumber = 0
    $hmac = [System.Security.Cryptography.HMACSHA256]::new(
        [System.Text.Encoding]::UTF8.GetBytes($secret)
    )

    while ($windowStartMs -le $rangeEndMs) {
        $windowNumber++
        $windowEndMs = [Math]::Min($windowStartMs + $maxWindowSpanMs, $rangeEndMs)
        $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + $clockOffset
        $query = "startTime=$windowStartMs&endTime=$windowEndMs&limit=100&recvWindow=5000&timestamp=$timestamp"
        $hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($query))
        $signature = [BitConverter]::ToString($hash).Replace('-', '').ToLowerInvariant()
        $uri = "$base/sapi/v1/pay/transactions?$query&signature=$signature"

        $result = Invoke-RestMethod -Method Get -Uri $uri -Headers @{ 'X-MBX-APIKEY' = $apiKey }
        $records = @($result.data)
        foreach ($record in $records) {
            if ($null -ne $record) { $allTransactions.Add($record) }
        }

        $fromLabel = [DateTimeOffset]::FromUnixTimeMilliseconds($windowStartMs).UtcDateTime.ToString('yyyy-MM-dd')
        $toLabel = [DateTimeOffset]::FromUnixTimeMilliseconds($windowEndMs).UtcDateTime.ToString('yyyy-MM-dd')
        Write-Host "Fetched Pay window $windowNumber ($fromLabel to $toLabel): $($records.Count) record(s)."
        if ($records.Count -ge 100) {
            Write-Warning "This window reached the 100-record limit; it may be incomplete. Narrow that date range to inspect it fully."
        }

        $windowStartMs = $windowEndMs + 1
        if ($windowStartMs -le $rangeEndMs) {
            Write-Host 'Waiting 31 seconds to respect the endpoint request weight...'
            Start-Sleep -Seconds 31
        }
    }

    Write-Host "`nTotal Pay records: $($allTransactions.Count)" -ForegroundColor Green
    ConvertTo-Json -InputObject @($allTransactions.ToArray()) -Depth 30
}
catch {
    if ($_.ErrorDetails -and -not [string]::IsNullOrWhiteSpace($_.ErrorDetails.Message)) {
        Write-Host "Binance/API error:`n$($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    $response = $_.Exception.Response
    if ($response) {
        $status = [int]$response.StatusCode
        $stream = $response.GetResponseStream()
        if ($stream) {
            $reader = [System.IO.StreamReader]::new($stream)
            try {
                $body = $reader.ReadToEnd()
                if ([string]::IsNullOrWhiteSpace($body)) {
                    Write-Host "Binance returned HTTP $status with an empty response body. Host: $BaseUrl" -ForegroundColor Red
                    Write-Host "Transport detail: $($_.Exception.Message)" -ForegroundColor DarkRed
                }
                else {
                    Write-Host "Binance HTTP $status response:`n$body" -ForegroundColor Red
                }
            }
            finally {
                $reader.Dispose()
            }
        }
        else {
            Write-Host "Binance returned HTTP $status. $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
finally {
    if ($hmac) { $hmac.Dispose() }
    if ($apiKeyBstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($apiKeyBstr)
    }
    if ($secretBstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretBstr)
    }
    Remove-Variable apiKey, secret, apiKeySecure, secretSecure, hash, signature, query, uri, result -ErrorAction SilentlyContinue
}
