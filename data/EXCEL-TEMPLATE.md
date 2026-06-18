# Report Excel Template — Sheet Structure

The report is generated directly from your SharePoint Excel file.
Create the file with these **6 sheets**, exactly as named below.

---

## Sheet 1: `Settings`
Project metadata — update only when something about the project changes.

| A (Field)      | B (Value)                         |
|----------------|-----------------------------------|
| Project Name   | ALYA TOWER                        |
| Location       | Corniche, Jeddah                  |
| Fund Name      | Sidra Corniche Fund               |
| Phase Label    | Phase 1 of 3 · Apr – Jul 2026     |
| PM             | Abdullah Anbar                    |
| Units          | 65                                |
| Floors         | 30                                |
| Fund Manager   | Sidra Capital                     |
| Contractor     | UCCL                              |
| Designer       | Erga                              |
| Supervision    | Midrar                            |

---

## Sheet 2: `Monthly`
Update this sheet every month before the 28th.

| A (Field)          | B (Value)                                                                 |
|--------------------|---------------------------------------------------------------------------|
| Report Date        | 28 Jun 2026                                                               |
| Status             | AMBER  *(use GREEN, AMBER, or RED)*                                       |
| Days Sidra Open    | 91                                                                        |
| Overview Para 1    | Alya Tower is a 30-floor luxury apartment building...                     |
| Overview Para 2    | The land is owned by HH Prince Mohammed bin Abdullah Al Saud...           |
| Overview Para 3    | We are in Phase 1 (April – July 2026), covering architectural design...   |
| Financial Body     | The budget is unconfirmed as the Sidra Capital funding agreement...       |
| Financial Callout  | Resolving the Sidra Capital agreement is the single most urgent action... |

---

## Sheet 3: `Progress`
One row per bullet point. Update monthly.

| A (Bold Prefix — optional)             | B (Rest of the sentence)                                        |
|----------------------------------------|-----------------------------------------------------------------|
| Full architectural drawings            | complete — independently reviewed by supervision team           |
| Underground foundations and structural frame | already in place on site                                  |
| Ground excavation started              | — activity visible and underway                                 |
| Sidra Capital                          | funding proposal submitted — under review                       |
| Brandship                              | branding agency selected — contract signed                      |
|                                        | Site fence upgrade underway — 20% complete                      |
|                                        | New signboard installation planned 14 Jun 2026                  |

*(Leave col A blank if the whole sentence should not be bolded.)*

---

## Sheet 4: `Next Steps`
Up to 6 action items. Urgency values: `normal`, `urgent`, `complete`.

| A (Title)                              | B (Description)                                     | C (Due label)           | D (Urgency) |
|----------------------------------------|-----------------------------------------------------|-------------------------|-------------|
| Sign supervision contract with Midrar  | Required before construction works can progress.    | Due: 30 Jun 2026        | normal      |
| Resolve Sidra Capital funding agreement| CEO must escalate directly — blocking financial plan.| URGENT · 91 days open  | urgent      |
| Marketing contract with Brandship signed| Contract signed — Brandship handles brand & sales.  | ✓ Complete              | complete    |
| Obtain the Amana municipal permit      | Official Jeddah municipality letter needed.         | Due: Jul 2026           | normal      |

---

## Sheet 5: `CEO Decisions`
Urgency values: `Urgent` or `Review Required`.

| A (Urgency)     | B (Title — use CAPS)                          | C (Body text)                                                                                 |
|-----------------|-----------------------------------------------|-----------------------------------------------------------------------------------------------|
| Urgent          | APPROVE THE SIDRA CAPITAL FUNDING AGREEMENT   | Proposal has been waiting 91 days. Without approval, no sales prices, no procurement...       |
| Review Required | APPROVE THE APARTMENT SALES PRICE LIST        | Pricing plan for all 65 apartments is prepared and reviewed. CEO approval required before...  |

---

## Sheet 6: `Phases`

### Part 1 — Phase config (rows 2 onward, columns B–E)
Leave row 1 as a header. Leave col A blank in this section.

| A | B (Name)                    | C (Color)   | D (Badge) | E (Columns) |
|---|-----------------------------|-------------|-----------|-------------|
|   | Design Stage                | #7A1143     | PM        | 7           |
|   | Brand Stage                 | #6B45A0     | BS        | 5           |
|   | Marketing & Sales Stage     | #C0392B     | MK        | 5           |
|   | *(leave a blank row here)*  |             |           |             |

### Part 2 — Tasks (continue below the blank row, columns A–C)
Status values: `Done` or `Pending`.

| A (Phase Name)              | B (Task Name)                  | C (Status) |
|-----------------------------|--------------------------------|------------|
| Design Stage                | Pre-Concept                    | Done       |
| Design Stage                | Owner Review & Approval        | Done       |
| Design Stage                | Schematic Design               | Done       |
| Design Stage                | Owner Rev — Schematic          | Done       |
| Design Stage                | 50% Design                     | Pending    |
| Design Stage                | ID Concept 100%                | Pending    |
| Design Stage                | Design Dev 50%                 | Pending    |
| Design Stage                | Owner Rev — DD 50%             | Pending    |
| Design Stage                | Design Dev 100%                | Pending    |
| Design Stage                | Owner Approval DD              | Pending    |
| Design Stage                | ID Tender, Specs & BOQ         | Pending    |
| Design Stage                | Tender Doc, Specs & BOQ        | Pending    |
| Design Stage                | Owner Review / Approval        | Pending    |
| Brand Stage                 | Project Kickoff                | Done       |
| Brand Stage                 | Stakeholder Interviews         | Done       |
| Brand Stage                 | Benchmark Study                | Done       |
| Brand Stage                 | Brand Strategy                 | Pending    |
| Brand Stage                 | Brand Architecture             | Pending    |
| Brand Stage                 | Brand Identity — Logo          | Pending    |
| Brand Stage                 | Brand Identity — Visual Language | Pending  |
| Brand Stage                 | Brand Applications             | Pending    |
| Brand Stage                 | Brand Manual                   | Pending    |
| Marketing & Sales Stage     | Awareness Campaign 1           | Pending    |
| Marketing & Sales Stage     | Awareness Campaign 2           | Pending    |
| Marketing & Sales Stage     | Awareness Campaign 3           | Pending    |

---

## Checklist before the 28th

- [ ] Update `Monthly` sheet (date, status, days open, text paragraphs)
- [ ] Update `Progress` sheet with this month's bullet points
- [ ] Update `Next Steps` — mark completed items as `complete`, update urgencies
- [ ] Update `CEO Decisions` if needed
- [ ] Update `Phases` — flip any newly completed tasks from `Pending` → `Done`
- [ ] Save and make sure the file is synced to SharePoint

The report will generate automatically at **10:00 AM Riyadh time on the 28th**.
To run it early: GitHub → Actions → Monthly Report Generator → Run workflow.
