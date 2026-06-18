# Azure AD Setup Guide
## One-time, ~15 minutes

This gives GitHub Actions permission to download your SharePoint Excel file automatically — no logins, no manual steps.

---

## Step 1 — Register an Azure AD App

1. Go to [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**
2. Name it: `Alya Tower Report Generator`
3. Supported account types: **Accounts in this organizational directory only**
4. Redirect URI: leave blank
5. Click **Register**

> Note the **Application (client) ID** and **Directory (tenant) ID** — you'll need these.

---

## Step 2 — Create a Client Secret

1. In your new app → **Certificates & secrets** → **New client secret**
2. Description: `GitHub Actions`
3. Expiry: **24 months** (set a calendar reminder to renew before expiry)
4. Click **Add**

> Copy the **Value** immediately — it's only shown once.

---

## Step 3 — Grant SharePoint Permission

1. In your app → **API permissions** → **Add a permission** → **Microsoft Graph** → **Application permissions**
2. Search for and add: `Sites.Read.All`
3. Click **Grant admin consent** (requires admin role)

---

## Step 4 — Find Your SharePoint Details

You need three things from your SharePoint:

**SHAREPOINT_HOSTNAME** — just the domain, e.g.:
```
tashyid.sharepoint.com
```

**SHAREPOINT_SITE_PATH** — the path after the domain, e.g.:
```
/sites/ProjectManagement
```
*(Find it in the SharePoint URL bar: `https://tashyid.sharepoint.com/sites/ProjectManagement`)*

**SHAREPOINT_FILE_PATH** — the path to your Excel file within the site, e.g.:
```
/Shared Documents/Alya Tower/Report.xlsx
```
*(Right-click the file in SharePoint → Details → Path)*

---

## Step 5 — Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 6 secrets:

| Secret Name             | Where to get it                              |
|-------------------------|----------------------------------------------|
| `AZURE_TENANT_ID`       | Azure AD → App registrations → Directory ID  |
| `AZURE_CLIENT_ID`       | Azure AD → App registrations → Application ID|
| `AZURE_CLIENT_SECRET`   | Step 2 above (the value you copied)          |
| `SHAREPOINT_HOSTNAME`   | e.g. `tashyid.sharepoint.com`                |
| `SHAREPOINT_SITE_PATH`  | e.g. `/sites/ProjectManagement`              |
| `SHAREPOINT_FILE_PATH`  | e.g. `/Shared Documents/Alya Tower/Report.xlsx` |
| `TEAMS_WEBHOOK_URL`     | Teams → channel → connectors → Incoming Webhook |

---

## Step 6 — Test It

1. Make sure your Excel is set up per **EXCEL-TEMPLATE.md**
2. Go to GitHub → **Actions** → **Monthly Report Generator** → **Run workflow**
3. Watch the steps run — should complete in ~3 minutes
4. Check your Teams channel for the notification and test the download link

---

## Troubleshooting

**"Failed to download Excel (HTTP 403)"**  
→ Admin consent wasn't granted in Step 3. Ask your Azure admin.

**"No Excel source file found"**  
→ The SharePoint path is wrong. Double-check `SHAREPOINT_FILE_PATH` — it must start with `/Shared Documents/...` (or whatever your document library is named).

**"Teams returned 400"**  
→ The webhook URL is invalid or the Teams channel connector was removed. Recreate the incoming webhook.

**Client secret expired**  
→ Create a new secret in Azure AD → update `AZURE_CLIENT_SECRET` in GitHub Secrets.
