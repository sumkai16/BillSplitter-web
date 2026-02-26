# BillSplitter Web — Setup Guide

## Tech Stack

| Technology | Purpose |
|---|---|
| React 19 + Vite 7 | Frontend framework |
| Tailwind CSS | Utility-first styling |
| Framer Motion | Animations |
| Lucide React | Icons |
| React Hot Toast | Toast notifications |
| React Router DOM | Page navigation |
| Supabase | Authentication + Database |

---

## Prerequisites

Make sure the following are installed before proceeding:

- [Node.js](https://nodejs.org) v18 or higher
- [Git](https://git-scm.com)
- A code editor — [VS Code](https://code.visualstudio.com) recommended

Verify Node.js is installed:
```bash
node -v
npm -v
```

---

## Setup on a New Device

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd BillSplitter-web
```

### 2. Install Dependencies

```bash
npm install
```

> This reads `package.json` and installs everything into `node_modules`. This folder is never committed to Git — always run `npm install` on a fresh clone.

### 3. Create the Environment File

Create a `.env` file in the **root of the project** (same folder as `package.json`):

```
VITE_SUPABASE_URL=https://yajfsgtsomlzvrwnswcg.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

> ⚠️ This file is excluded from Git intentionally. You must create it manually on every new device. Get the values from your Supabase dashboard under **Settings → API Keys → Legacy API Keys**.

> ⚠️ Never use your `service_role` key here — only the `anon` public key.

### 4. Start the Development Server

```bash
npm run dev
```

Open your browser and go to:

```
http://localhost:5173
```

---

## Project Structure

```
BillSplitter-web/
├── public/                   # Static assets
├── src/
│   ├── context/
│   │   └── AuthContext.jsx   # Global auth state (login, register, logout)
│   ├── lib/
│   │   └── supabase.js       # Supabase client — reads from .env
│   ├── pages/
│   │   ├── Login.jsx         # Login page
│   │   ├── Register.jsx      # Registration page with validation
│   │   └── Dashboard.jsx     # Main dashboard after login
│   ├── App.jsx               # Routes and protected route logic
│   ├── main.jsx              # App entry point
│   └── index.css             # Tailwind CSS import
├── .env                      # Environment variables (DO NOT commit)
├── .gitignore                # Files excluded from Git
├── vite.config.js            # Vite + Tailwind configuration
└── package.json              # Project dependencies
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public anon key |

> Variables must be prefixed with `VITE_` to be accessible in the browser via `import.meta.env`.

---

## Supabase Setup

This project uses an existing Supabase project. The database and auth are already configured. You only need the `.env` credentials to connect.

### Database Tables

| Table | Purpose |
|---|---|
| `profiles` | Stores user info (name, nickname, username, account type) |
| `bills` | Bill records created by users |
| `bill_members` | Users belonging to each bill |
| `expenses` | Expenses added to bills |
| `expense_splits` | How expenses are split per member |

### User Account Types

| Type | Description |
|---|---|
| `guest` | View-only, 6hr access limit, no registration needed |
| `standard` | Default for new registrations, up to 5 bills and 3 members |
| `premium` | Unlimited bills and members |

To manually change a user's account type via Supabase SQL Editor:
```sql
update profiles 
set account_type = 'premium' 
where username = 'yourusername';
```

---

## Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
```

---

## Common Issues

**Blank white screen**
- Open browser console (F12) and check for errors
- Make sure `.env` file exists with correct values
- Stop server and run `npx vite --force` to clear cache

**`npm install` fails**
- Make sure you're in the correct project folder
- Delete `node_modules` and run `npm install` again
- Never run `npm audit fix --force` — it breaks package versions

**Supabase connection error**
- Double check `.env` values match your Supabase dashboard
- Make sure there are no spaces around the `=` sign in `.env`
- Restart the dev server after editing `.env`

**Port already in use**
- Another Vite instance is running. Stop it or use a different port:
```bash
npx vite --port 3000
```

---

## Deployment (After Deadline)

Before deploying to production:

1. Enable **email confirmation** — Supabase → Authentication → Providers → Email → turn on Confirm email
2. Set environment variables on your hosting platform (Vercel or Netlify recommended)
3. Run `npm run build` and deploy the `dist` folder

### Deploy to Vercel (recommended)
```bash
npm install -g vercel
vercel
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel's environment variables dashboard.
