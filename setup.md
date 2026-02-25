# BillSplitter Web — Setup Guide

## Prerequisites

Make sure the following are installed on your machine before proceeding:

- [Node.js](https://nodejs.org) (v18 or higher recommended)
- [Git](https://git-scm.com)
- A code editor (e.g. [VS Code](https://code.visualstudio.com))

---

## Getting Started on a New Device

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd BillSplitter-web
```

### 2. Install Dependencies

```bash
npm install
```

> This reads `package.json` and installs all required packages into `node_modules`. Never commit `node_modules` to Git.

### 3. Create the Environment File

Create a `.env` file in the **root of the project** (same level as `package.json`):

```
VITE_SUPABASE_URL=https://yajfsgtsomlzvrwnswcg.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

> ⚠️ This file is intentionally excluded from Git for security. You must create it manually on every new device. Get the values from your Supabase dashboard under **Settings → API Keys → Legacy**.

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
├── public/               # Static assets
├── src/
│   ├── context/
│   │   └── AuthContext.jsx   # Global auth state (login, register, logout)
│   ├── lib/
│   │   └── supabase.js       # Supabase client connection
│   ├── pages/
│   │   ├── Login.jsx         # Login page
│   │   └── Register.jsx      # Registration page
│   ├── App.jsx               # Routes and navigation
│   ├── main.jsx              # App entry point
│   └── index.css             # Global styles
├── .env                  # Environment variables (DO NOT commit)
├── .gitignore            # Files excluded from Git
└── package.json          # Project dependencies
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React + Vite | Frontend framework |
| React Router | Page navigation |
| Supabase | Authentication + Database |
| PostgreSQL | Database (via Supabase) |

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public anon key |

> Variables must be prefixed with `VITE_` to be accessible in the browser via `import.meta.env`.

---

## Common Issues

**Blank white screen**
- Check browser console (F12) for errors
- Make sure `.env` file exists and has correct values
- Stop the server and run `npx vite --force` to clear cache

**`npm install` fails**
- Make sure you're in the correct project folder
- Try deleting `node_modules` and running `npm install` again
- Never run `npm audit fix --force` — it breaks package versions

**Supabase connection error**
- Double check your `.env` values match the Supabase dashboard
- Make sure there are no spaces around the `=` sign in `.env`

---

## Useful Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build locally
```

---

## Deployment Notes

Before deploying to production:

- Enable **email confirmation** in Supabase → Authentication → Providers → Email
- Set environment variables on your hosting platform (Vercel, Netlify, etc.)
- Never expose your `service_role` key — only use the `anon` key in the frontend