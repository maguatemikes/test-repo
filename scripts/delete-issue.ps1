# Delete a GitLab issue by its IID (the #number shown in the UI).
#
# Usage:
#   $env:GITLAB_TOKEN = "glpat-XXXX..."
#   ./scripts/delete-issue.ps1 -Iid 12
#   ./scripts/delete-issue.ps1 -Iid 12,15,18         # multiple
#   ./scripts/delete-issue.ps1 -Iid 12 -Force        # skip confirmation
#
# Notes:
#   - You must be Owner or Maintainer of the project to delete issues.
#   - Deletion is permanent. The script prints title + assignee before deleting
#     so you can sanity-check.

param(
    [Parameter(Mandatory=$true)]
    [int[]]$Iid,

    [switch]$Force
)

$ErrorActionPreference = "Stop"

$GitLabUrl   = "https://git.netx.cc"
$ProjectPath = "crm/crm-web"

if (-not $env:GITLAB_TOKEN) {
    Write-Error "Set GITLAB_TOKEN first: `$env:GITLAB_TOKEN = 'your-pat'"
    exit 1
}

Add-Type -AssemblyName System.Web
$headers = @{ "PRIVATE-TOKEN" = $env:GITLAB_TOKEN }
$encodedProject = [System.Web.HttpUtility]::UrlEncode($ProjectPath)

foreach ($id in $Iid) {
    Write-Host ""
    Write-Host "Issue #$id"

    # Fetch first so we can show what we're about to nuke
    try {
        $issue = Invoke-RestMethod -Uri "$GitLabUrl/api/v4/projects/$encodedProject/issues/$id" -Headers $headers
    } catch {
        Write-Warning "  Could not fetch issue #$id : $($_.Exception.Message)"
        continue
    }

    $assignee = if ($issue.assignee) { $issue.assignee.username } else { "(unassigned)" }
    Write-Host "  Title:    $($issue.title)"
    Write-Host "  Assignee: $assignee"
    Write-Host "  State:    $($issue.state)"

    if (-not $Force) {
        $confirm = Read-Host "  Delete this issue? (y/N)"
        if ($confirm -ne "y") {
            Write-Host "  Skipped." -ForegroundColor Yellow
            continue
        }
    }

    try {
        Invoke-RestMethod -Uri "$GitLabUrl/api/v4/projects/$encodedProject/issues/$id" `
            -Method DELETE -Headers $headers | Out-Null
        Write-Host "  Deleted #$id" -ForegroundColor Green
    } catch {
        Write-Warning "  Failed to delete #$id : $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "Done."
