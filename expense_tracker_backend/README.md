# Expense Tracker Backend

FastAPI + MongoDB backend for account-wise expense tracking.

## 1. Requirements
- Python 3.10+
- MongoDB running locally or MongoDB Atlas

## 2. Setup
```bash
python -m venv .venv
```
Windows:
```bash
.venv\Scripts\activate
```
macOS/Linux:
```bash
source .venv/bin/activate
```
Install packages:
```bash
pip install -r requirements.txt
```
Create `.env` from `.env.example` and update `MONGODB_URL`.

## 3. Run
```bash
uvicorn app.main:app --reload
```
- API: http://127.0.0.1:8000
- Swagger testing: http://127.0.0.1:8000/docs

## 4. Main endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/accounts` | Create account |
| GET | `/api/accounts` | List accounts |
| GET | `/api/accounts/{id}` | Account details |
| PATCH | `/api/accounts/{id}` | Update account name/details |
| DELETE | `/api/accounts/{id}` | Archive account (history retained) |
| POST | `/api/accounts/{id}/expenses` | Add expense |
| GET | `/api/accounts/{id}/expenses` | Account expense history |
| GET | `/api/expenses/{id}` | Expense details |
| PUT | `/api/expenses/{id}` | Edit expense |
| DELETE | `/api/expenses/{id}` | Soft-delete expense |
| GET | `/api/dashboard` | Dashboard totals |

## 5. Example requests

Create an account:
```json
{
  "name": "Office Account",
  "initial_amount": 10000,
  "description": "Office expenses"
}
```

Add an expense:
```json
{
  "amount": 750,
  "paid_to": "Stationery Shop",
  "reason": "Notebooks and pens",
  "category": "Office",
  "expense_date": "2026-11-22",
  "notes": "Monthly stationery"
}
```

Filter history:
`GET /api/accounts/{id}/expenses?start_date=2026-11-01&end_date=2026-11-30&search=stationery`

Amounts are accepted and returned in rupees; stored in MongoDB as integer paise.

## Important implementation note
This is a starter backend. For production use, move expense insert/update/delete and account balance-guard changes into MongoDB transactions on a replica set, and add authentication/authorization before exposing it online. Do not expose this API publicly without authentication.
