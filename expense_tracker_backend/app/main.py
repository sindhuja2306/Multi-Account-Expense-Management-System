
from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.schemas import (
    AccountCreate,
    AccountUpdate,
    ExpenseCreate,
    ExpenseUpdate,
)
from app import services


# MongoDB connection lifecycle
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        print("MongoDB connected successfully")
    except Exception as exc:
        raise RuntimeError(
            f"Could not connect to MongoDB: {exc}"
        ) from exc

    yield


# Create FastAPI application
app = FastAPI(
    title="Expense Tracker API",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS configuration
allowed_origins = [
    "http://localhost:5173",
    "https://multi-account-expense-management-sy-theta.vercel.app",
    "https://multi-account-expense-management-sy-phi.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root route
@app.get("/")
def root():
    return {
        "message": "Expense Tracker API is running"
    }


# Health check
@app.get("/health")
def health():
    return {
        "status": "ok"
    }


# -------------------------------
# ACCOUNT ROUTES
# -------------------------------

# Create account
@app.post("/api/accounts", status_code=201)
def create_account(data: AccountCreate):
    return services.create_account(data)


# Get all accounts
@app.get("/api/accounts")
def get_accounts(active_only: bool = False):
    return services.list_accounts(active_only)


# Get account details
@app.get("/api/accounts/{account_id}")
def get_account(account_id: str):
    account = services.get_account_or_404(account_id)
    return services.account_summary(account)


# Update account
@app.patch("/api/accounts/{account_id}")
def patch_account(
    account_id: str,
    data: AccountUpdate
):
    return services.update_account(account_id, data)


# Archive account
@app.delete("/api/accounts/{account_id}")
def archive_account(account_id: str):
    return services.delete_account(account_id)


# -------------------------------
# EXPENSE ROUTES
# -------------------------------

# Create expense
@app.post(
    "/api/accounts/{account_id}/expenses",
    status_code=201
)
def create_expense(
    account_id: str,
    data: ExpenseCreate
):
    return services.add_expense(account_id, data)


# Get expenses for an account
@app.get("/api/accounts/{account_id}/expenses")
def get_expenses(
    account_id: str,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = Query(
        default=None,
        max_length=100
    )
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=422,
            detail="start_date cannot be after end_date"
        )

    return services.list_expenses(
        account_id,
        start_date,
        end_date,
        search
    )


# Get single expense
@app.get("/api/expenses/{expense_id}")
def get_expense(expense_id: str):
    return services.get_expense(expense_id)


# Update expense
@app.put("/api/expenses/{expense_id}")
def put_expense(
    expense_id: str,
    data: ExpenseUpdate
):
    return services.update_expense(expense_id, data)


# Delete expense
@app.delete("/api/expenses/{expense_id}")
def remove_expense(expense_id: str):
    return services.delete_expense(expense_id)


# -------------------------------
# DASHBOARD ROUTE
# -------------------------------

@app.get("/api/dashboard")
def get_dashboard():
    return services.dashboard()
