from datetime import date
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional

class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    initial_amount: float = Field(gt=0)
    description: Optional[str] = Field(default=None, max_length=300)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        return value.strip()

class AccountUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=300)
    is_active: Optional[bool] = None

class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    paid_to: str = Field(min_length=1, max_length=120)
    reason: str = Field(min_length=1, max_length=300)
    category: str = Field(default="Other", max_length=50)
    expense_date: date
    notes: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("paid_to", "reason", "category")
    @classmethod
    def clean_text(cls, value):
        return value.strip()

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    paid_to: Optional[str] = Field(default=None, min_length=1, max_length=120)
    reason: Optional[str] = Field(default=None, min_length=1, max_length=300)
    category: Optional[str] = Field(default=None, max_length=50)
    expense_date: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=1000)

class AccountOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    initial_amount: float
    total_spent: float
    balance: float
    is_active: bool
    created_at: str

class ExpenseOut(BaseModel):
    id: str
    account_id: str
    amount: float
    paid_to: str
    reason: str
    category: str
    expense_date: str
    notes: Optional[str] = None
    created_at: str
    running_balance: Optional[float] = None
