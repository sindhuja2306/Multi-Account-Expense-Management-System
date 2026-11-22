from pymongo import MongoClient, ASCENDING, DESCENDING
from app.config import settings

client = MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)
db = client[settings.database_name]
accounts = db["accounts"]
expenses = db["expenses"]
audit_logs = db["audit_logs"]

def init_db():
    client.admin.command("ping")
    accounts.create_index([("created_at", DESCENDING)])
    expenses.create_index([("account_id", ASCENDING), ("expense_date", DESCENDING)])
    expenses.create_index([("account_id", ASCENDING), ("is_deleted", ASCENDING)])
    audit_logs.create_index([("created_at", DESCENDING)])
