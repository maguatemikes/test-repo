# Bulk-create Phase 1 auth/identity UI work items in GitLab and assign to Jhimson.
#
# Usage:
#   1. Set your GitLab token (reuse the one from Mike's script if still in session):
#        $env:GITLAB_TOKEN = "glpat-XXXX..."
#   2. Run:
#        ./scripts/create-jhimson-tasks.ps1
#
# Re-running creates DUPLICATES - only run once.
# Note: "Users and roles" is NOT in this list - that issue already exists
# in GitLab (#39) and is being reassigned via the UI bulk edit.

$ErrorActionPreference = "Stop"

$GitLabUrl        = "https://git.netx.cc"
$ProjectPath      = "crm/crm-web"
$AssigneeUsername = "lupigajhimson"

if (-not $env:GITLAB_TOKEN) {
    Write-Error "Set GITLAB_TOKEN first: `$env:GITLAB_TOKEN = 'your-pat'"
    exit 1
}

Add-Type -AssemblyName System.Web
$headers = @{ "PRIVATE-TOKEN" = $env:GITLAB_TOKEN }
$encodedProject = [System.Web.HttpUtility]::UrlEncode($ProjectPath)

# ---------- Look up Jhimson's user ID ----------
Write-Host "Looking up $AssigneeUsername..."
$users = Invoke-RestMethod -Uri "$GitLabUrl/api/v4/users?username=$AssigneeUsername" -Headers $headers
if ($users.Count -eq 0) {
    Write-Error "User '$AssigneeUsername' not found. Make sure he has accepted the project invite and the username is correct."
    exit 1
}
$jhimsonId = $users[0].id
Write-Host "Found user id $jhimsonId"

# ---------- Task list ----------
$tasks = @(
    @{ title="Login page"; labels="P0,Auth,Phase-1"; description="Email + password fields. Remember-me checkbox. Forgot-password link. Wire to POST /api/auth/login. Error states for bad credentials, locked account, unverified email. Acceptance: existing user can log in and lands on /dashboard." },
    @{ title="Sign-up flow - new org + first user"; labels="P0,Auth,Phase-1"; description="Multi-step: (1) account email + password, (2) org name + slug, (3) confirmation. Calls POST /api/auth/signup which creates crm_organizations row + crm_users row + sends verification email. Acceptance: new sign-up creates org with plan_id = free, redirects to check-your-inbox screen." },
    @{ title="Email verification - check your inbox screen"; labels="P0,Auth,Phase-1"; description="Post-signup landing: 'We sent a link to <email>'. Resend button (rate-limited). Change-email link. Acceptance: clicking resend triggers another verification email." },
    @{ title="Email verification - confirm landing page"; labels="P0,Auth,Phase-1"; description="Public /verify/<token> route. Validates token, marks user as verified, auto-logs-in. Error states for expired/invalid token with resend CTA. Acceptance: valid token marks user verified and lands on dashboard." },
    @{ title="Forgot password page"; labels="P0,Auth,Phase-1"; description="Email field. Submit triggers POST /api/auth/forgot-password. Always show 'If that email exists, we sent a link' to prevent enumeration. Acceptance: existing email gets reset email; non-existent shows same confirmation." },
    @{ title="Reset password page"; labels="P0,Auth,Phase-1"; description="Public /reset/<token> route. New password + confirm. Strength meter. POST /api/auth/reset-password. Acceptance: valid token sets new password and auto-logs-in." },
    @{ title="Invite-accept landing"; labels="P0,Auth,Phase-1"; description="Public /invite/<token> route. Shows 'Join <org name> as <role>'. If new user: set name + password. If existing user: log in to confirm. Adds row to crm_org_users. Acceptance: invitee lands on dashboard scoped to inviting org." },
    @{ title="Account / profile settings"; labels="P0,Auth,Phase-1"; description="Personal info: name, email (verify on change), avatar. Change password section (current + new + confirm). Acceptance: name update reflects in topbar; password change forces re-login." },
    @{ title="2FA setup screen"; labels="P1,Auth,Phase-1"; description="In account settings. QR code for authenticator app. Verify with one TOTP code before enabling. Show + download recovery codes. Acceptance: enabling 2FA persists to crm_users and recovery codes are shown once." },
    @{ title="2FA challenge screen"; labels="P1,Auth,Phase-1"; description="After login, if 2FA enabled: 6-digit code input + 'use recovery code' link. Acceptance: correct code proceeds to dashboard; wrong code shows error." },
    @{ title="Session expired / re-auth modal"; labels="P1,Auth,Phase-1"; description="Global modal triggered when an API call returns 401. Inline login (email pre-filled) so user doesn't lose page state. Acceptance: idle for session lifetime, modal appears on next click; logging in dismisses it without nav." },
    @{ title="Logout confirmation"; labels="P2,Auth,Phase-1"; description="Topbar avatar menu -> Logout. Confirms, clears session, redirects to /login. Lightweight, no screen of its own." }
)

Write-Host ""
Write-Host "About to create $($tasks.Count) issues in $ProjectPath assigned to $AssigneeUsername (id $jhimsonId)."
$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne "y") { Write-Host "Cancelled."; exit 0 }

$created = 0
foreach ($task in $tasks) {
    $body = @{
        title       = $task.title
        description = $task.description
        labels      = $task.labels
        assignee_id = $jhimsonId
    } | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod -Uri "$GitLabUrl/api/v4/projects/$encodedProject/issues" `
            -Method POST -Headers $headers `
            -ContentType "application/json" `
            -Body $body
        Write-Host "  #$($response.iid) - $($task.title)" -ForegroundColor Green
        $created++
    } catch {
        Write-Warning "  Failed: $($task.title) - $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "Done. Created $created issues." -ForegroundColor Cyan
Write-Host "View at: $GitLabUrl/$ProjectPath/-/issues?assignee_username=$AssigneeUsername"
