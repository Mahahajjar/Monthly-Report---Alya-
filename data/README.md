# Data Sources

The report is generated directly from **an Excel file on SharePoint**.
No Word document needed — the Excel is the single source of truth.

## How the pipeline works

```
Excel (SharePoint) → Graph API → Parse → HTML → PDF → GitHub Release → Teams
```

1. Team updates the Excel on SharePoint throughout the month.
2. On the **28th at 10:00 AM Riyadh time**, GitHub Actions automatically:
   - Downloads the Excel via Microsoft Graph API
   - Reads each sheet (Settings, Monthly, Progress, Next Steps, CEO Decisions, Phases)
   - Builds the branded HTML report
   - Renders it to an A4 landscape PDF
   - Publishes it to GitHub Releases
   - Sends a Teams notification with the download link

## One-time setup required

See **[AZURE-SETUP.md](AZURE-SETUP.md)** for the step-by-step guide to:
- Register the Azure AD app (15 minutes)
- Set the 6 GitHub Secrets
- Do a test run

## Excel structure

See **[EXCEL-TEMPLATE.md](EXCEL-TEMPLATE.md)** for the exact sheet structure to set up in SharePoint.

## Manual run

GitHub → Actions tab → "Monthly Report Generator" → **Run workflow**
