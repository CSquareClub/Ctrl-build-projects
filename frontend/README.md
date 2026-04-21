# Frontend - Triage Results Page 📊

## ✅ PAGE 1: Triage Results Page (COMPLETE)

This React component includes:
- **Top Navigation Bar** - with links and GitHub connect button
- **Side Navigation Bar** - collapsible sidebar with menu items
- **Issue Header** - breadcrumb and title
- **Result Cards** - Classification, Priority, Suggested Labels
- **AI Insights** - AI-powered analysis section
- **Duplicates List** - Similar issues with similarity scores
- **Action Buttons Bar** - Re-analyze, Mark Resolved, Apply Labels

### File Structure:
```
src/
├── pages/
│   ├── TriageResultsPage.jsx  (Page 1 - DONE)
│   └── [Page 2 - Next]
│   └── [Page 3 - Teammate]
│   └── [Page 4 - Teammate]
├── components/
│   ├── TopNavBar.jsx
│   ├── SideNavBar.jsx
│   ├── IssueHeader.jsx
│   ├── ResultCards.jsx
│   ├── AIInsights.jsx
│   ├── DuplicatesList.jsx
│   └── ActionButtonsBar.jsx
├── App.jsx
├── main.jsx
└── index.css
```

---

## 🚀 QUICK START (For Other Pages)

### Step 1: Create New Page Component

Create `src/pages/YourPageName.jsx`:

```jsx
import React from 'react';
import TopNavBar from '../components/TopNavBar';
import SideNavBar from '../components/SideNavBar';

export default function YourPageName() {
  return (
    <div className="bg-background text-on-surface min-h-screen">
      <TopNavBar />
      <SideNavBar />
      <main className="ml-60 pt-14 p-8 min-h-screen pb-32">
        {/* Your page content here */}
      </main>
    </div>
  );
}
```

### Step 2: Update App.jsx to Route to Your Page

```jsx
import YourPageName from './pages/YourPageName';

function App() {
  return <YourPageName />;
}
```

### Step 3: Create Sub-components as Needed

Create reusable components in `src/components/` and import them.

---

## 🎨 Tailwind Colors Available

All custom colors are defined in `tailwind.config.js`:

- **Primary**: `primary`, `primary-container`, `on-primary`
- **Secondary**: `secondary`, `secondary-container`, `on-secondary`
- **Tertiary**: `tertiary`, `tertiary-container`, `on-tertiary`
- **Error**: `error`, `error-container`, `on-error`
- **Surface**: `surface`, `surface-container`, `surface-container-high`, etc.
- **Outline**: `outline`, `outline-variant`

---

## 📝 Component Template

```jsx
import React from 'react';

export default function ComponentName() {
  return (
    <div className="bg-surface-container p-6 rounded-lg">
      <h2 className="font-headline text-lg font-bold text-on-surface">
        Title
      </h2>
      <p className="text-sm text-on-surface-variant">Content</p>
    </div>
  );
}
```

---

## 🔗 Branch Workflow

**You (Page 1):**
```bash
git checkout -b page-1-triage
git add .
git commit -m "feat: page 1 - triage results page with React components"
git push origin page-1-triage
```

**Teammate (Pages 2-3 or 3-4):**
```bash
git checkout main
git pull origin main
git checkout -b page-2-3-dashboard
# Add pages here
git push origin page-2-3-dashboard
```

Then create separate PRs and merge to main! ✅

---

## 📦 Install & Run

```bash
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:5173`

---

## ⚡ Material Icons

All components use Material Symbols. Usage:
```jsx
<span className="material-symbols-outlined">icon_name</span>
```

Common icons: `dashboard`, `settings`, `terminal`, `label`, `local_fire_department`, `auto_awesome`, etc.

---

**Ready for Page 2? Send the HTML for the second page!** 🚀
