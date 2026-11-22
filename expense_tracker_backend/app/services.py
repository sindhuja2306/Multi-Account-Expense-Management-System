from datetime import datetime, timezone
from fastapi import HTTPException
from pymongo import ReturnDocument
from app.database import accounts, expenses, audit_logs
from app.utils import now_utc, oid, rupees, serialize

def amount_to_paise(amount: float) -> int:
    # Convert through string to avoid binary float artifacts.
    from decimal import Decimal, ROUND_HALF_UP
    value = (Decimal(str(amount)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(value)

def account_summary(account: dict) -> dict:
    spent = sum(x["amount_paise"] for x in expenses.find({
        "account_id": account["_id"], "is_deleted": False
    }, {"amount_paise": 1}))
    initial = account["initial_amount_paise"]
    return {
        "id": str(account["_id"]),
        "name": account["name"],
        "description": account.get("description"),
        "initial_amount": rupees(initial),
        "total_spent": rupees(spent),
        "balance": rupees(initial - spent),
        "is_active": account["is_active"],
        "created_at": account["created_at"].isoformat()
    }

def get_account_or_404(account_id: str):
    account = accounts.find_one({"_id": oid(account_id)})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account

def create_account(data):
    initial = amount_to_paise(data.initial_amount)
    if initial <= 0:
        raise HTTPException(status_code=422, detail="Initial amount must be greater than zero")
    doc = {
        "name": data.name, "description": data.description,
        "initial_amount_paise": initial, "guard_balance_paise": initial,
        "is_active": True, "created_at": now_utc(), "updated_at": now_utc()
    }
    result = accounts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return account_summary(doc)

def list_accounts(active_only=False):
    query = {"is_active": True} if active_only else {}
    return [account_summary(a) for a in accounts.find(query).sort("created_at", -1)]

def update_account(account_id, data):
    account = get_account_or_404(account_id)
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes and changes["name"] is not None:
        changes["name"] = changes["name"].strip()
        if not changes["name"]:
            raise HTTPException(status_code=422, detail="Account name cannot be empty")
    changes["updated_at"] = now_utc()
    accounts.update_one({"_id": account["_id"]}, {"$set": changes})
    return account_summary(get_account_or_404(account_id))

def delete_account(account_id):
    account = get_account_or_404(account_id)
    # Keep account and expense history; archive instead of hard deleting.
    accounts.update_one({"_id": account["_id"]}, {"$set": {
        "is_active": False, "updated_at": now_utc()
    }})
    return {"message": "Account archived. Its expense history is preserved."}

def add_expense(account_id, data):
    account = get_account_or_404(account_id)
    if not account["is_active"]:
        raise HTTPException(status_code=400, detail="This account is archived")
    amount = amount_to_paise(data.amount)
    if amount <= 0:
        raise HTTPException(status_code=422, detail="Expense must be greater than zero")
    # Atomically reserve the expense amount so simultaneous requests cannot overspend.
    guard = accounts.find_one_and_update(
        {"_id": account["_id"], "is_active": True, "guard_balance_paise": {"$gte": amount}},
        {"$inc": {"guard_balance_paise": -amount}},
        return_document=ReturnDocument.AFTER
    )
    if guard is None:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    expense = {
        "account_id": account["_id"], "amount_paise": amount,
        "paid_to": data.paid_to, "reason": data.reason, "category": data.category,
        "expense_date": datetime.combine(data.expense_date, datetime.min.time()).replace(tzinfo=timezone.utc),
        "notes": data.notes, "is_deleted": False,
        "created_at": now_utc(), "updated_at": now_utc()
    }
    # Re-check available balance in a single atomic conditional update of a dedicated guard.
    # `guard_balance_paise` is initialized on first use below.
    ensure_guard(account)
    guard = accounts.find_one_and_update(
        {"_id": account["_id"], "is_active": True, "guard_balance_paise": {"$gte": amount}},
        {"$inc": {"guard_balance_paise": -amount}},
        return_document=ReturnDocument.AFTER
    )
    if guard is None:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    try:
        result = expenses.insert_one(expense)
    except Exception:
        accounts.update_one({"_id": account["_id"]}, {"$inc": {"guard_balance_paise": amount}})
        raise
    expense["_id"] = result.inserted_id
    audit_logs.insert_one({"entity": "expense", "entity_id": result.inserted_id,
                           "action": "create", "created_at": now_utc(),
                           "snapshot": {"amount_paise": amount, "paid_to": data.paid_to}})
    return get_expense(result.inserted_id)

def get_expense(expense_id):
    doc = expenses.find_one({"_id": oid(str(expense_id)), "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Expense not found")
    return serialize_expense(doc)

def serialize_expense(doc):
    result = serialize(doc)
    result["amount"] = rupees(result.pop("amount_paise"))
    result["expense_date"] = result["expense_date"].date().isoformat()
    result["created_at"] = result["created_at"].isoformat()
    result["running_balance"] = None
    return result

def list_expenses(account_id, start_date=None, end_date=None, search=None):
    account = get_account_or_404(account_id)
    query = {"account_id": account["_id"], "is_deleted": False}
    if start_date:
        query["expense_date"] = {"$gte": datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)}
    if end_date:
        query.setdefault("expense_date", {})["$lte"] = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
    if search:
        query["$or"] = [
            {"paid_to": {"$regex": search, "$options": "i"}},
            {"reason": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}}
        ]
    docs = list(expenses.find(query).sort([("expense_date", 1), ("created_at", 1)]))
    # Running balance is calculated chronologically from initial amount.
    balance = account["initial_amount_paise"]
    output = []
    for doc in docs:
        balance -= doc["amount_paise"]
        item = serialize_expense(doc)
        item["running_balance"] = rupees(balance)
        output.append(item)
    return output

def update_expense(expense_id, data):
    doc = expenses.find_one({"_id": oid(expense_id), "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Expense not found")
    changes = data.model_dump(exclude_unset=True)
    if not changes:
        return get_expense(expense_id)
    old_amount = doc["amount_paise"]
    new_amount = amount_to_paise(changes.pop("amount")) if "amount" in changes else old_amount
    if new_amount <= 0:
        raise HTTPException(status_code=422, detail="Expense must be greater than zero")
    if "expense_date" in changes:
        changes["expense_date"] = datetime.combine(changes["expense_date"], datetime.min.time()).replace(tzinfo=timezone.utc)
    for key in ("paid_to", "reason", "category"):
        if key in changes:
            changes[key] = changes[key].strip()
            if not changes[key]:
                raise HTTPException(status_code=422, detail=f"{key} cannot be empty")
    delta = new_amount - old_amount
    if delta > 0:
        account = get_account_or_404(str(doc["account_id"]))
        changed = accounts.find_one_and_update(
            {"_id": doc["account_id"], "guard_balance_paise": {"$gte": delta}},
            {"$inc": {"guard_balance_paise": -delta}},
            return_document=ReturnDocument.AFTER
        )
        if changed is None:
            raise HTTPException(status_code=400, detail="Insufficient balance for this edit")
    elif delta < 0:
        get_account_or_404(str(doc["account_id"]))
        accounts.update_one({"_id": doc["account_id"]}, {"$inc": {"guard_balance_paise": -delta}})
    changes["amount_paise"] = new_amount
    changes["updated_at"] = now_utc()
    expenses.update_one({"_id": doc["_id"]}, {"$set": changes})
    audit_logs.insert_one({"entity": "expense", "entity_id": doc["_id"],
                           "action": "update", "created_at": now_utc(),
                           "before": {"amount_paise": old_amount},
                           "after": {"amount_paise": new_amount}})
    return get_expense(expense_id)

def delete_expense(expense_id):
    doc = expenses.find_one({"_id": oid(expense_id), "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Expense not found")
    account = get_account_or_404(str(doc["account_id"]))
    accounts.update_one({"_id": doc["account_id"]},
                        {"$inc": {"guard_balance_paise": doc["amount_paise"]}})
    expenses.update_one({"_id": doc["_id"]}, {"$set": {
        "is_deleted": True, "deleted_at": now_utc(), "updated_at": now_utc()
    }})
    audit_logs.insert_one({"entity": "expense", "entity_id": doc["_id"],
                           "action": "delete", "created_at": now_utc(),
                           "snapshot": {"amount_paise": doc["amount_paise"], "paid_to": doc["paid_to"]}})
    return {"message": "Expense deleted. Account balance has been restored."}

def dashboard():
    active = list(accounts.find({"is_active": True}))
    summaries = [account_summary(a) for a in active]
    total_initial = sum(x["initial_amount"] for x in summaries)
    total_spent = sum(x["total_spent"] for x in summaries)
    recent = list(expenses.find({"is_deleted": False}).sort("created_at", -1).limit(8))
    return {
        "accounts_count": len(active),
        "expenses_count": expenses.count_documents({"is_deleted": False}),
        "total_initial": round(total_initial, 2),
        "total_spent": round(total_spent, 2),
        "total_balance": round(total_initial - total_spent, 2),
        "recent_expenses": [serialize_expense(x) for x in recent]
    }
