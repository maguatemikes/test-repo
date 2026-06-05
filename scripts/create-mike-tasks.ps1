# Bulk-create Phase 1 UI work items in GitLab and assign them to Mike.
#
# Usage:
#   1. Generate a Personal Access Token with "api" scope at
#      https://git.netx.cc/-/user_settings/personal_access_tokens
#   2. Set it for this session:
#        $env:GITLAB_TOKEN = "glpat-XXXX..."
#   3. Run:
#        ./scripts/create-mike-tasks.ps1
#
# Re-running creates DUPLICATES - only run once.

$ErrorActionPreference = "Stop"

$GitLabUrl        = "https://git.netx.cc"
$ProjectPath      = "crm/crm-web"
$AssigneeUsername = "maguatemikes"

if (-not $env:GITLAB_TOKEN) {
    Write-Error "Set GITLAB_TOKEN first: `$env:GITLAB_TOKEN = 'your-pat'"
    exit 1
}

Add-Type -AssemblyName System.Web
$headers = @{ "PRIVATE-TOKEN" = $env:GITLAB_TOKEN }
$encodedProject = [System.Web.HttpUtility]::UrlEncode($ProjectPath)

# ---------- Look up Mike's user ID ----------
Write-Host "Looking up $AssigneeUsername..."
$users = Invoke-RestMethod -Uri "$GitLabUrl/api/v4/users?username=$AssigneeUsername" -Headers $headers
if ($users.Count -eq 0) {
    Write-Error "User '$AssigneeUsername' not found. Make sure he has accepted the project invite."
    exit 1
}
$mikeId = $users[0].id
Write-Host "Found user id $mikeId"

# ---------- Task list ----------
$tasks = @(
    @{ title="Customer Hub list view - wire to real data"; labels="P0,Customers,Phase-1"; description="Replace mock customer list with real Drizzle query on crm_customers. Columns: name, email, channels, lifetime spend, last order, last engagement. Server-side pagination (50 per page). Acceptance: real 5000+ customers visible at /customers." },
    @{ title="Customer search and filter chips"; labels="P0,Customers,Phase-1"; description="Server-side search by name/email + chip filters (VIP, At-risk, New 30d, Subscribed, Has refund). URL query params for shareable state. Acceptance: each chip narrows the list." },
    @{ title="Customer profile drawer"; labels="P0,Customers,Phase-1"; description="Click row, open drawer or full page with tabs: Overview, Orders, Engagement, Addresses, Activity. Acceptance: Sarah Chen profile shows actual order history joined from netx_orders." },
    @{ title="Edit VIP, tags, and notes on profile"; labels="P0,Customers,Phase-1"; description="VIP toggle persists to crm_customers.is_vip. Tags via crm_customer_tags + crm_customer_tag_links. Notes save to crm_customers.notes. Acceptance: refresh shows saved values." },
    @{ title="CSV import for customers"; labels="P1,Customers,Phase-1"; description="Drag-drop CSV upload, column mapping screen, conflict resolution (skip/update/overwrite). Background job for files over 1k rows. Acceptance: upload 100 contacts, see them in the list." },
    @{ title="Customer merge"; labels="P1,Customers,Phase-1"; description="Pick canonical and alias email. Preview merged result. Insert into crm_customer_aliases. Acceptance: aliased email rolls into canonical record." },
    @{ title="Bulk operations on customers (tag, suppress, export)"; labels="P2,Customers,Phase-1"; description="Select multiple rows, apply VIP tag, suppress, or export in one action." },

    @{ title="Lists index plus CRUD"; labels="P0,Lists,Phase-1"; description="New / rename / archive lists. Member count per list. Acceptance: create Test list, add a customer, count = 1." },
    @{ title="List detail with member management"; labels="P0,Lists,Phase-1"; description="Add/remove customers from a list. Import members from CSV. Acceptance: bulk-add 50 customers via CSV." },
    @{ title="Segments index plus CRUD"; labels="P0,Segments,Phase-1"; description="List existing segments with rule summary, live member count, last refreshed timestamp." },
    @{ title="Segment Builder UI - visual rule tree (BIG)"; labels="P0,Segments,Phase-1"; description="LARGEST single UI piece in Phase 1 (~4 days). Visual rule tree with nested AND/OR groups. Field picker (lifetime spend, order count, last order date, tag, channel). Operator picker. Live count of matching customers as rules change. Save rule_definition as JSON to crm_segments. Acceptance: build 'Lifetime spend > 500 AND last order within 30 days'; preview shows count." },
    @{ title="Segment engine - materialize membership"; labels="P0,Segments,Phase-1"; description="Background job that resolves rules and populates crm_segment_members. Runs every 5 min or on demand. Acceptance: segment with 100 matching customers populates segment_members." },

    @{ title="Campaign index"; labels="P0,Campaigns,Phase-1"; description="List with status tabs (Draft/Scheduled/Sent/Archived). Per-row KPIs: recipients, open rate, click rate, revenue." },
    @{ title="Campaign Composer - Step 1: Settings"; labels="P0,Campaigns,Phase-1"; description="Campaign name, subject, preheader, from name, from email. Validation: subject required, sender on verified domain. Saves draft to crm_campaigns." },
    @{ title="Campaign Composer - Step 2: Audience"; labels="P0,Campaigns,Phase-1"; description="Pick list OR segment OR both. Exclusion segment selector. Live recipient count." },
    @{ title="Campaign Composer - Step 3: Content (Email Builder)"; labels="P0,Campaigns,Phase-1"; description="Embed Unlayer or Stripo email builder. Personalization token dropdown. Save design_json + rendered html_body to crm_templates. Acceptance: drag button block, save, reopen - design intact." },
    @{ title="Campaign Composer - Step 4: Review and Send"; labels="P0,Campaigns,Phase-1"; description="Summary screen. 'Send now' vs 'Schedule for'. Final confirmation dialog." },
    @{ title="Send Test dialog"; labels="P0,Campaigns,Phase-1"; description="Modal to enter test emails. Calls ESP send endpoint. Acceptance: test email arrives in inbox." },
    @{ title="Campaign Detail / Analytics view"; labels="P0,Campaigns,Phase-1"; description="Send stats: delivered, open rate, click rate, revenue. Recipient table with per-recipient status. Per-link click breakdown." },
    @{ title="Campaign template library"; labels="P1,Campaigns,Phase-1"; description="Reusable starter templates. Save current campaign as template." },
    @{ title="Clone and archive campaign actions"; labels="P2,Campaigns,Phase-1"; description="Quick actions on campaign rows." },

    @{ title="Automation list"; labels="P0,Automations,Phase-1"; description="Cards showing status, enrolled count, conversion percent, revenue. Filter by status." },
    @{ title="Automation Editor - visual flow canvas (BIG)"; labels="P0,Automations,Phase-1"; description="Second-largest UI piece in Phase 1 (~4 days). Drag-and-drop trigger/action/delay/condition nodes. Connect nodes; condition nodes have yes/no branches. Side panel for selected node config. Save graph to crm_automations + crm_automation_steps. Library: react-flow or custom. Acceptance: build canonical abandoned-cart flow." },
    @{ title="Automation trigger types"; labels="P0,Automations,Phase-1"; description="Contact added, Form submitted, Added to cart, Purchase completed, Birthday. Each with config." },
    @{ title="Automation action types"; labels="P0,Automations,Phase-1"; description="Send Email (template picker, personalization). Wait (duration). Condition (rule). Add Tag / Remove Tag." },
    @{ title="Automation Detail / Stats view"; labels="P0,Automations,Phase-1"; description="Funnel view: enrolled, step 1, step 2, completed. Errors panel. Pause / resume / archive." },
    @{ title="Automation templates (Welcome, Abandoned cart, Win-back)"; labels="P1,Automations,Phase-1"; description="Pre-built starter automations." },

    @{ title="Forms index"; labels="P0,Forms,Phase-1"; description="Cards showing impressions, submissions, conversion. Status badges." },
    @{ title="Form Builder - Design tab"; labels="P0,Forms,Phase-1"; description="Field list (email, name, phone, custom dropdown). Type picker: popup, embed, slide-in, full-screen. Color/font/button style. Success behavior (message vs redirect)." },
    @{ title="Form Builder - Targeting tab"; labels="P0,Forms,Phase-1"; description="URL patterns. Trigger: time delay, scroll %, exit intent. Geo/device targeting." },
    @{ title="Form Builder - Behavior plus list integration"; labels="P0,Forms,Phase-1"; description="Target list selection. Save form config to crm_forms." },
    @{ title="Form embed snippet and hosted URL"; labels="P0,Forms,Phase-1"; description="Generate JS snippet for embed. Public hosted URL: /f/<slug>. Copy-to-clipboard buttons." },
    @{ title="Form submissions table"; labels="P0,Forms,Phase-1"; description="Per-form submissions list. View submission detail (data_json). Export to CSV." },

    @{ title="Email Performance dashboard"; labels="P0,Analytics,Phase-1"; description="Sparkline cards: sends, open rate, click rate, unsub rate. Performance over time line chart (recharts). Top campaigns table." },
    @{ title="Customer Insights dashboard"; labels="P0,Analytics,Phase-1"; description="New vs returning chart. Lifetime value distribution. Churn rate." },
    @{ title="Ecommerce dashboard"; labels="P1,Analytics,Phase-1"; description="Revenue, AOV, conversion (queries netx_orders). Top channels." },
    @{ title="Shared date range picker for analytics"; labels="P0,Analytics,Phase-1"; description="Last 7/30/90 days plus custom range. URL params. Reused across all dashboards." },

    @{ title="Organization settings"; labels="P0,Settings,Phase-1"; description="Org name, slug, logo upload, brand colors. Default sender identity." },
    @{ title="Integrations - Sending domain (DKIM)"; labels="P0,Settings,Phase-1"; description="Add domain, generate DKIM CNAME records. Verify button polls DNS. Status chips per record." },
    @{ title="Integrations - Ecommerce (Shopify, Woo)"; labels="P0,Settings,Phase-1"; description="Connect Shopify (OAuth). Connect WooCommerce (REST + webhooks). Status of each connection plus last sync." },
    @{ title="API keys management"; labels="P1,Settings,Phase-1"; description="List issued keys, generate, revoke." },
    @{ title="Webhooks list"; labels="P1,Settings,Phase-1"; description="List subscribed endpoints, add/edit, view delivery log, replay." },
    @{ title="Audit log viewer"; labels="P1,Settings,Phase-1"; description="Per-org chronological action history. Filter by user, action, date range. Export." },

    @{ title="Empty states per section"; labels="P0,Foundation,Phase-1"; description="Each list screen needs a real first-time empty state with helpful copy plus primary CTA. Acceptance: brand new tenant doesn't see empty tables." },
    @{ title="Loading skeletons"; labels="P0,Foundation,Phase-1"; description="Skeleton component reused across screens. Show during initial page load plus refresh." },
    @{ title="Error boundaries plus toast notifications"; labels="P0,Foundation,Phase-1"; description="Sonner (installed) for success/error toasts. Global error boundary for unhandled errors." },
    @{ title="Mobile responsiveness policy"; labels="P0,Foundation,Phase-1"; description="Dashboards: mobile-responsive read-only. Editors (segment, email, automation): 'open on desktop' message. Hosted public pages: fully mobile-first." },
    @{ title="Role-based UI gates"; labels="P0,Foundation,Phase-1"; description="Hide/disable destructive actions per role. Wired from day one." }
)

Write-Host ""
Write-Host "About to create $($tasks.Count) issues in $ProjectPath assigned to $AssigneeUsername (id $mikeId)."
$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne "y") { Write-Host "Cancelled."; exit 0 }

$created = 0
foreach ($task in $tasks) {
    $body = @{
        title       = $task.title
        description = $task.description
        labels      = $task.labels
        assignee_id = $mikeId
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
