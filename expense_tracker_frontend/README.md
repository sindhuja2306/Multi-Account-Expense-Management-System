# Ledgerly Expense Tracker — Frontend

React + TypeScript + Vite frontend for the FastAPI expense tracker backend.

## Setup

1. Extract this project and open it in VS Code.
2. Install Node.js (18+ recommended).
3. In this folder, run:

```bash
npm install
```

4. Copy `.env.example` to `.env`:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

5. Start the backend first, then run:

```bash
npm run dev
```

Open the Vite URL printed in the terminal (usually http://localhost:5173).

## Build

```bash
npm run build
```

## Features

- Dashboard with total starting amount, total spent, remaining balance and account count
- Multiple account cards and account details
- Create accounts
- Add expenses with available-balance preview
- Search and filter expense history
- Edit and delete expenses
- Monthly, category and account spending reports
- Responsive sidebar and mobile layout
- Light/dark theme setting

## Backend compatibility

Uses the API routes from the FastAPI backend:
- `/api/dashboard`
- `/api/accounts`
- `/api/accounts/{id}`
- `/api/accounts/{id}/expenses`
- `/api/expenses/{id}`

The backend currently returns `running_balance` in the account-specific history response. When viewing all accounts together, running balance is not comparable across accounts, so it is shown as unavailable.
