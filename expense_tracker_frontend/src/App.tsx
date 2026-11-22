import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Routes, Route, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Plus, Wallet, TrendingDown, PiggyBank, Receipt, ArrowUpRight,
  ArrowDownRight, MoreHorizontal, Search, CalendarDays, ChevronRight,
  ArrowLeft, Download, SlidersHorizontal, Pencil, Trash2, Eye,
  CircleDollarSign, BriefcaseBusiness, ShoppingBag, Car, HeartPulse,
  GraduationCap, Utensils, House, Ellipsis, CheckCircle2, AlertCircle,
  RefreshCw, X, ChartPie
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { apiError, apiService } from "./api";
import type { Account, Dashboard, Expense } from "./types";
import { categories, dateLabel, money, today } from "./utils";
import { Button, EmptyState, Modal, PageHeading, Shell, StatCard } from "./components";

function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  return { toast, showToast: (message: string, type: "success" | "error" = "success") => setToast({ message, type }) };
}

function Toast({ toast, onClose }: { toast: { message: string; type: "success" | "error" } | null; onClose: () => void }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type}`}><CheckCircle2 size={18}/>{toast.message}<button onClick={onClose}><X size={15}/></button></div>;
}

function useData() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const [a, d] = await Promise.all([apiService.accounts(), apiService.dashboard()]);
      setAccounts(a); setDashboard(d);
    } catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  return { accounts, setAccounts, dashboard, loading, error, refresh };
}

function DashboardPage() {
  const { accounts, dashboard, loading, error, refresh } = useData();
  const navigate = useNavigate();
  const chartData = [
    { month: "Jun", spent: 0 }, { month: "Jul", spent: 0 }, { month: "Aug", spent: 0 },
    { month: "Sep", spent: 0 }, { month: "Oct", spent: 0 }, { month: "Nov", spent: dashboard?.total_spent || 0 }
  ];
  return <div>
    <PageHeading eyebrow="MONDAY, NOVEMBER 22" title="Good to see you" description="Here’s a clear picture of where your money stands."
      action={<Button onClick={() => navigate("/add-expense")}><Plus size={17}/> Add expense</Button>}/>
    {error && <ErrorBanner message={error} retry={refresh}/>}
    {loading ? <Loading/> : <>
      <div className="stats-grid">
        <StatCard label="Total starting amount" value={money(dashboard?.total_initial)} icon={Wallet} tone="blue" footnote="Across active accounts"/>
        <StatCard label="Total spent" value={money(dashboard?.total_spent)} icon={TrendingDown} tone="rose" footnote={`${dashboard?.expenses_count || 0} recorded expenses`}/>
        <StatCard label="Available balance" value={money(dashboard?.total_balance)} icon={PiggyBank} tone="green" footnote="Money remaining across accounts"/>
        <StatCard label="Active accounts" value={String(dashboard?.accounts_count || 0)} icon={Receipt} tone="violet" footnote="Separate spending wallets"/>
      </div>
      <div className="dashboard-grid">
        <section className="panel spending-panel">
          <div className="panel-heading"><div><h2>Spending overview</h2><p>Your recorded spending at a glance</p></div><span className="subtle-tag">All accounts</span></div>
          <div className="chart-legend"><span><i/> Total expenses</span><b>{money(dashboard?.total_spent)}</b></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#edf0f5"/>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#98a2b3", fontSize: 12 }}/>
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#98a2b3", fontSize: 11 }} tickFormatter={v => v >= 1000 ? `₹${v/1000}k` : `₹${v}`}/>
                <Tooltip formatter={(v) => money(Number(v))} cursor={{ fill: "#f5f7fb" }}/>
                <Bar dataKey="spent" fill="#5279dc" radius={[7,7,0,0]} maxBarSize={38}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-note">Monthly breakdown will become more useful as you record expenses over time.</div>
        </section>
        <section className="panel account-panel">
          <div className="panel-heading"><div><h2>Your accounts</h2><p>Balances by account</p></div><button className="text-link" onClick={() => navigate("/accounts")}>View all <ChevronRight size={15}/></button></div>
          {accounts.length ? <div className="mini-account-list">{accounts.slice(0,4).map((a,i) => <button className="mini-account" key={a.id} onClick={() => navigate(`/accounts/${a.id}`)}>
            <div className={`account-symbol symbol-${i%4}`}><Wallet size={18}/></div>
            <div className="mini-account-copy"><strong>{a.name}</strong><span>{money(a.total_spent)} spent</span></div>
            <b>{money(a.balance)}</b><ChevronRight size={15} className="muted"/>
          </button>)}</div> : <EmptyState title="No accounts yet" description="Create your first account to start tracking expenses." action={<Button onClick={() => navigate("/accounts")}><Plus size={16}/> Create account</Button>}/>}
        </section>
      </div>
      <section className="panel recent-panel">
        <div className="panel-heading"><div><h2>Recent expenses</h2><p>Your latest recorded transactions</p></div><button className="text-link" onClick={() => navigate("/expenses")}>See history <ChevronRight size={15}/></button></div>
        <RecentTable expenses={dashboard?.recent_expenses || []} accounts={accounts}/>
      </section>
    </>}
  </div>;
}

function RecentTable({ expenses, accounts }: { expenses: Expense[]; accounts: Account[] }) {
  const accountName = (id: string) => accounts.find(a => a.id === id)?.name || "Account";
  if (!expenses.length) return <EmptyState title="No expenses recorded" description="Once you add an expense, your latest activity will appear here." />;
  return <div className="table-scroll"><table><thead><tr><th>PAYEE / REASON</th><th>ACCOUNT</th><th>DATE</th><th className="align-right">AMOUNT</th></tr></thead>
    <tbody>{expenses.map(e => <tr key={e.id}><td><div className="transaction-cell"><CategoryIcon category={e.category}/><div><strong>{e.paid_to}</strong><span>{e.reason}</span></div></div></td><td><span className="account-chip">{accountName(e.account_id)}</span></td><td>{dateLabel(e.expense_date)}</td><td className="amount-cell">− {money(e.amount)}</td></tr>)}</tbody>
  </table></div>;
}

function AccountsPage() {
  const { accounts, loading, error, refresh } = useData();
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(""); const [amount, setAmount] = useState(""); const [description, setDescription] = useState("");
  const { toast, showToast } = useToast();
  const navigate = useNavigate();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!name.trim() || !Number.isFinite(parsed) || parsed <= 0) return showToast("Enter an account name and a valid starting amount.", "error");
    setBusy(true);
    try { await apiService.createAccount({ name: name.trim(), initial_amount: parsed, description: description.trim() || undefined });
      setModal(false); setName(""); setAmount(""); setDescription(""); await refresh(); showToast("Account created successfully.");
    } catch (e) { showToast(apiError(e), "error"); } finally { setBusy(false); }
  };
  return <div><PageHeading eyebrow="YOUR MONEY, ORGANIZED" title="My accounts" description="Keep each pool of money separate and easy to follow."
    action={<Button onClick={() => setModal(true)}><Plus size={17}/> New account</Button>}/>
    {error && <ErrorBanner message={error} retry={refresh}/>}
    {loading ? <Loading/> : accounts.length ? <>
      <div className="account-summary-strip"><div><span>Combined available balance</span><strong>{money(accounts.reduce((s,a)=>s+a.balance,0))}</strong></div><div><span>Active accounts</span><strong>{accounts.filter(a=>a.is_active).length}</strong></div></div>
      <div className="accounts-grid">{accounts.map((a,i)=><article className="account-card" key={a.id}>
        <div className="account-card-top"><div className={`account-symbol symbol-${i%4}`}><Wallet size={20}/></div><span className="active-dot">Active</span><button className="icon-button" title="Account options" onClick={() => navigate(`/accounts/${a.id}`)}><MoreHorizontal size={19}/></button></div>
        <h3>{a.name}</h3><p className="account-description">{a.description || "Personal spending account"}</p>
        <div className="balance-label">AVAILABLE BALANCE</div><div className="account-balance">{money(a.balance)}</div>
        <div className="progress-track"><div style={{width: `${a.initial_amount > 0 ? Math.max(0,Math.min(100,(a.balance/a.initial_amount)*100)) : 0}%`}}/></div>
        <div className="account-meta"><span>Spent <b>{money(a.total_spent)}</b></span><span>Started <b>{money(a.initial_amount)}</b></span></div>
        <button className="account-open" onClick={() => navigate(`/accounts/${a.id}`)}>Open account <ArrowUpRight size={16}/></button>
      </article>)}</div>
    </> : <div className="panel"><EmptyState title="Start with your first account" description="Add an account and its starting amount. You can then record expenses against it." action={<Button onClick={() => setModal(true)}><Plus size={16}/> Create account</Button>}/></div>}
    {modal && <Modal title="Create a new account" onClose={() => setModal(false)}><form className="form-stack" onSubmit={submit}>
      <Field label="Account name"><input autoFocus placeholder="e.g. Office account" value={name} onChange={e=>setName(e.target.value)} required maxLength={80}/></Field>
      <Field label="Starting amount"><div className="money-input"><span>₹</span><input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} required/></div></Field>
      <Field label="Description (optional)"><textarea placeholder="What is this account used for?" value={description} onChange={e=>setDescription(e.target.value)} rows={3}/></Field>
      <div className="form-actions"><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Creating..." : "Create account"}</Button></div>
    </form></Modal>}
    <Toast toast={toast} onClose={()=>showToast("", "success")}/>
  </div>;
}

function AccountDetailsPage() {
  const { id = "" } = useParams(); const navigate = useNavigate();
  const [account,setAccount] = useState<Account|null>(null); const [expenses,setExpenses] = useState<Expense[]>([]);
  const [loading,setLoading] = useState(true); const [error,setError] = useState(""); const {toast,showToast}=useToast();
  const load = async () => { setLoading(true); try { const [a,e]=await Promise.all([apiService.account(id),apiService.expenses(id)]);setAccount(a);setExpenses(e);}catch(err){setError(apiError(err));}finally{setLoading(false);} };
  useEffect(()=>{void load();},[id]);
  const archive = async () => { if(!account || !window.confirm(`Archive "${account.name}"? Its history will be preserved.`)) return; try { await apiService.archiveAccount(id); showToast("Account archived."); navigate("/accounts"); } catch(e){showToast(apiError(e),"error");} };
  if(loading) return <Loading/>; if(error || !account) return <ErrorBanner message={error || "Account not found"} retry={load}/>;
  return <div><button className="back-link" onClick={()=>navigate("/accounts")}><ArrowLeft size={16}/> Back to accounts</button>
    <PageHeading eyebrow="ACCOUNT DETAILS" title={account.name} description={account.description || "Your account balance and spending activity."}
      action={<><Button variant="secondary" onClick={()=>navigate(`/add-expense?account=${id}`)}><Plus size={16}/> Add expense</Button><Button variant="ghost" onClick={archive}><MoreHorizontal size={18}/> Options</Button></>}/>
    <div className="stats-grid three-stats">
      <StatCard label="Starting amount" value={money(account.initial_amount)} icon={Wallet} tone="blue"/>
      <StatCard label="Total spent" value={money(account.total_spent)} icon={TrendingDown} tone="rose"/>
      <StatCard label="Available balance" value={money(account.balance)} icon={PiggyBank} tone="green"/>
    </div>
    <section className="panel recent-panel"><div className="panel-heading"><div><h2>Account activity</h2><p>{expenses.length} recorded expenses · Running balance included</p></div></div>
      <ExpenseTable expenses={expenses} onEdit={e=>navigate(`/expenses?edit=${e.id}`)} onDelete={async e=>{if(!window.confirm("Delete this expense? The account balance will be restored."))return;try{await apiService.deleteExpense(e.id);await load();showToast("Expense deleted.");}catch(err){showToast(apiError(err),"error");}}}/>
    </section><Toast toast={toast} onClose={()=>showToast("", "success")}/>
  </div>;
}

function AddExpensePage() {
  const navigate=useNavigate(); const location=useLocation();
  const initialAccount=new URLSearchParams(location.search).get("account") || "";
  const [accounts,setAccounts]=useState<Account[]>([]); const [accountId,setAccountId]=useState(initialAccount);
  const [amount,setAmount]=useState("");const [paidTo,setPaidTo]=useState("");const [reason,setReason]=useState("");
  const [category,setCategory]=useState("Other");const [expenseDate,setExpenseDate]=useState(today());const [notes,setNotes]=useState("");
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  useEffect(()=>{apiService.accounts(true).then(a=>{setAccounts(a);if(!initialAccount && a[0])setAccountId(a[0].id);}).catch(e=>setError(apiError(e)));},[]);
  const selected=accounts.find(a=>a.id===accountId); const value=Number(amount);
  const submit=async(e:FormEvent)=>{e.preventDefault();setError("");
    if(!accountId||!paidTo.trim()||!reason.trim()||!Number.isFinite(value)||value<=0)return setError("Please complete all required fields with valid values.");
    if(selected && value>selected.balance)return setError(`This account has only ${money(selected.balance)} available.`);
    setBusy(true);try{await apiService.addExpense(accountId,{amount:value,paid_to:paidTo.trim(),reason:reason.trim(),category,expense_date:expenseDate,notes:notes.trim()||undefined});navigate(`/accounts/${accountId}`,{state:{success:"Expense added"}});}catch(e){setError(apiError(e));}finally{setBusy(false);}
  };
  return <div><button className="back-link" onClick={()=>navigate(-1)}><ArrowLeft size={16}/> Go back</button>
    <PageHeading eyebrow="RECORD A TRANSACTION" title="Add an expense" description="Capture where the money went. Your account balance updates automatically."/>
    <div className="expense-layout"><form className="panel expense-form" onSubmit={submit}>
      {error&&<div className="inline-error"><AlertCircle size={17}/>{error}</div>}
      <div className="form-section-title"><span>01</span><div><h3>Expense details</h3><p>Tell us what you paid and why.</p></div></div>
      <Field label="Paying from"><select value={accountId} onChange={e=>setAccountId(e.target.value)} required><option value="">Select an account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} — {money(a.balance)} available</option>)}</select></Field>
      {selected&&<div className="available-hint"><Wallet size={16}/><span>Available in {selected.name}</span><b>{money(selected.balance)}</b></div>}
      <Field label="Amount"><div className="money-input large"><span>₹</span><input autoFocus type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} required/></div></Field>
      <div className="form-row"><Field label="Paid to"><input placeholder="Person or shop name" value={paidTo} onChange={e=>setPaidTo(e.target.value)} required maxLength={120}/></Field><Field label="Date"><input type="date" value={expenseDate} onChange={e=>setExpenseDate(e.target.value)} required/></Field></div>
      <Field label="Reason"><input placeholder="What was this expense for?" value={reason} onChange={e=>setReason(e.target.value)} required maxLength={300}/></Field>
      <Field label="Category"><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></Field>
      <Field label="Notes (optional)"><textarea rows={3} placeholder="Add any extra details..." value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1000}/></Field>
      <div className="form-actions"><Button variant="secondary" onClick={()=>navigate(-1)}>Cancel</Button><Button type="submit" disabled={busy||!accounts.length}>{busy?"Saving...":"Save expense"}</Button></div>
    </form>
    <aside className="expense-aside"><div className="aside-icon"><Receipt size={21}/></div><h3>Keep the details clear</h3><p>A useful expense record answers three simple questions: who received the money, what was it for, and when did it happen?</p>
      <div className="aside-tip"><strong>Balance preview</strong><span>Current balance</span><b>{money(selected?.balance || 0)}</b><span>After this expense</span><b className={selected && value>selected.balance?"negative":""}>{money((selected?.balance||0)-(Number.isFinite(value)?value:0))}</b></div>
      <div className="privacy-note"><CheckCircle2 size={16}/> Your expense history stays linked to the account you choose.</div>
    </aside></div>
  </div>;
}

function ExpensesPage() {
  const [accounts,setAccounts]=useState<Account[]>([]);const [accountId,setAccountId]=useState("all");
  const [expenses,setExpenses]=useState<Expense[]>([]);const [search,setSearch]=useState("");
  const [start,setStart]=useState("");const [end,setEnd]=useState("");
  const [loading,setLoading]=useState(true);const [error,setError]=useState("");const navigate=useNavigate();
  const load=async()=>{setLoading(true);setError("");try{const a=await apiService.accounts();setAccounts(a);const selected=accountId==="all"?a:[a.find(x=>x.id===accountId)].filter(Boolean) as Account[];
    const lists=await Promise.all(selected.map(a=>apiService.expenses(a.id,{search:search||undefined,start_date:start||undefined,end_date:end||undefined})));
    const all=lists.flat().sort((x,y)=>y.expense_date.localeCompare(x.expense_date));setExpenses(all);
  }catch(e){setError(apiError(e));}finally{setLoading(false);}};
  useEffect(()=>{void load();},[accountId,start,end]);
  const filtered=useMemo(()=>expenses.filter(e=>`${e.paid_to} ${e.reason} ${e.category}`.toLowerCase().includes(search.toLowerCase())),[expenses,search]);
  return <div><PageHeading eyebrow="ALL TRANSACTIONS" title="Expense history" description="Every payment, in one searchable place."
    action={<Button onClick={()=>navigate("/add-expense")}><Plus size={17}/> Add expense</Button>}/>
    <section className="panel history-panel">
      <div className="filter-bar"><div className="search-box"><Search size={17}/><input placeholder="Search payee, reason or category..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="all">All accounts</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <div className="date-filter"><CalendarDays size={15}/><input aria-label="Start date" type="date" value={start} onChange={e=>setStart(e.target.value)}/><span>to</span><input aria-label="End date" type="date" value={end} onChange={e=>setEnd(e.target.value)}/></div>
      </div>
      {error&&<ErrorBanner message={error} retry={load}/>}
      {loading?<Loading/>:<ExpenseTable expenses={filtered} accounts={accounts} onEdit={e=>navigate(`/expenses?edit=${e.id}`)} onDelete={async e=>{if(!window.confirm("Delete this expense? The amount will be restored to its account."))return;try{await apiService.deleteExpense(e.id);await load();}catch(err){setError(apiError(err));}}}/>}
      <div className="table-footer"><span>Showing <b>{filtered.length}</b> expense records</span><span>Total shown <b>{money(filtered.reduce((s,e)=>s+e.amount,0))}</b></span></div>
    </section>
  </div>;
}

function ExpenseTable({ expenses, accounts, onEdit, onDelete }: {
  expenses: Expense[]; accounts?: Account[]; onEdit?: (e:Expense)=>void; onDelete?: (e:Expense)=>void;
}) {
  if(!expenses.length)return <EmptyState title="Nothing to show yet" description="Try changing your filters or add an expense to see it here." />;
  const accountName=(id:string)=>accounts?.find(a=>a.id===id)?.name;
  return <div className="table-scroll"><table><thead><tr><th>PAYEE / REASON</th>{accounts&&<th>ACCOUNT</th>}<th>CATEGORY</th><th>DATE</th><th className="align-right">AMOUNT</th><th className="align-right">BALANCE AFTER</th><th/></tr></thead>
    <tbody>{expenses.map(e=><tr key={e.id}><td><div className="transaction-cell"><CategoryIcon category={e.category}/><div><strong>{e.paid_to}</strong><span>{e.reason}</span></div></div></td>
      {accounts&&<td><span className="account-chip">{accountName(e.account_id)||"Account"}</span></td>}
      <td><span className="category-tag">{e.category}</span></td><td>{dateLabel(e.expense_date)}</td><td className="amount-cell">− {money(e.amount)}</td>
      <td className="balance-cell">{e.running_balance==null?"—":money(e.running_balance)}</td>
      <td><div className="row-actions"><button title="Edit" onClick={()=>onEdit?.(e)}><Pencil size={15}/></button><button title="Delete" onClick={()=>onDelete?.(e)}><Trash2 size={15}/></button></div></td>
    </tr>)}</tbody></table></div>;
}

function ReportsPage() {
  const [accounts,setAccounts]=useState<Account[]>([]);const [expenses,setExpenses]=useState<Expense[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
  useEffect(()=>{Promise.all([apiService.accounts(),apiService.accounts().then(a=>Promise.all(a.map(x=>apiService.expenses(x.id))))]).then(([a,lists])=>{setAccounts(a);setExpenses(lists.flat());}).catch(e=>setError(apiError(e))).finally(()=>setLoading(false));},[]);
  const categoriesData=categories.map(c=>({name:c,value:expenses.filter(e=>e.category===c).reduce((s,e)=>s+e.amount,0)})).filter(x=>x.value>0);
  const colors=["#5578d8","#36a58a","#f2ae54","#9a83d7","#e27d82","#6da5c9","#8ba0b5","#d48d5e"];
  const monthData=Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-(5-i));const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;return {month:d.toLocaleString("en-IN",{month:"short"}),spent:expenses.filter(e=>e.expense_date.startsWith(key)).reduce((s,e)=>s+e.amount,0)};});
  if(loading)return <Loading/>;
  return <div><PageHeading eyebrow="UNDERSTAND YOUR SPENDING" title="Reports" description="Simple insights based on the expenses you have recorded."/>
    {error&&<ErrorBanner message={error} retry={()=>window.location.reload()}/>}
    <div className="stats-grid three-stats"><StatCard label="Total recorded" value={money(expenses.reduce((s,e)=>s+e.amount,0))} icon={TrendingDown} tone="rose"/><StatCard label="Average expense" value={money(expenses.length?expenses.reduce((s,e)=>s+e.amount,0)/expenses.length:0)} icon={CircleDollarSign} tone="blue"/><StatCard label="Largest expense" value={money(Math.max(0,...expenses.map(e=>e.amount)))} icon={ArrowUpRight} tone="violet"/></div>
    <div className="reports-grid"><section className="panel"><div className="panel-heading"><div><h2>Monthly spending</h2><p>Last six months</p></div></div><div className="report-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthData}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#edf0f5"/><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} width={55}/><Tooltip formatter={(v)=>money(Number(v))}/><Bar dataKey="spent" fill="#5578d8" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></section>
      <section className="panel"><div className="panel-heading"><div><h2>By category</h2><p>Where your money goes</p></div></div>{categoriesData.length?<><div className="pie-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoriesData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={3}>{categoriesData.map((_,i)=><Cell key={i} fill={colors[i%colors.length]}/>)}</Pie><Tooltip formatter={(v)=>money(Number(v))}/></PieChart></ResponsiveContainer></div><div className="category-legend">{categoriesData.map((c,i)=><div key={c.name}><span><i style={{background:colors[i%colors.length]}}/>{c.name}</span><b>{money(c.value)}</b></div>)}</div></>:<EmptyState title="No category data yet" description="Add expenses to see your spending breakdown."/>}</section></div>
    <section className="panel"><div className="panel-heading"><div><h2>Account comparison</h2><p>How much has been spent from each account</p></div></div><div className="account-report-list">{accounts.map(a=><div className="account-report" key={a.id}><div><strong>{a.name}</strong><span>{money(a.total_spent)} spent of {money(a.initial_amount)}</span></div><div className="progress-track"><div style={{width:`${a.initial_amount?Math.min(100,a.total_spent/a.initial_amount*100):0}%`}}/></div><b>{a.initial_amount?Math.round(a.total_spent/a.initial_amount*100):0}%</b></div>)}</div></section>
  </div>;
}

function SettingsPage() {
  const [dark,setDark]=useState(localStorage.getItem("ledgerly-theme")==="dark");
  useEffect(()=>{document.documentElement.dataset.theme=dark?"dark":"light";localStorage.setItem("ledgerly-theme",dark?"dark":"light");},[dark]);
  return <div><PageHeading eyebrow="PREFERENCES" title="Settings" description="A few simple preferences for your workspace."/>
    <section className="panel settings-panel"><div className="settings-row"><div><strong>Appearance</strong><p>Choose a comfortable theme for your workspace.</p></div><button className={`theme-toggle ${dark?"on":""}`} onClick={()=>setDark(v=>!v)}><span/>{dark?"Dark mode":"Light mode"}</button></div>
      <div className="settings-row"><div><strong>Currency</strong><p>Amounts are displayed in Indian Rupees.</p></div><span className="setting-value">INR · ₹</span></div>
      <div className="settings-row"><div><strong>Data storage</strong><p>Your accounts and expense history are stored in your connected MongoDB database.</p></div><span className="connected-label"><i/> API connected when available</span></div>
    </section>
    <div className="settings-footnote">Ledgerly is an expense tracker. It does not record income, sales, or money received.</div>
  </div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}) {return <label className="field"><span>{label}</span>{children}</label>;}
function CategoryIcon({category}:{category:string}) {
  const map:Record<string,React.ElementType>={Food:Utensils,Travel:Car,Shopping:ShoppingBag,Education:GraduationCap,Medical:HeartPulse,Bills:Receipt,Rent:House,Business:BriefcaseBusiness,Personal:Wallet};
  const Icon=map[category]||CircleDollarSign;return <div className="transaction-icon"><Icon size={17}/></div>;
}
function Loading(){return <div className="loading-state"><span className="spinner"/>Loading your data...</div>;}
function ErrorBanner({message,retry}:{message:string;retry:()=>void}){return <div className="error-banner"><AlertCircle size={18}/><span>{message}</span><button onClick={retry}><RefreshCw size={15}/> Retry</button></div>;}

function EditExpenseModal({expense,onClose,onSaved}:{expense:Expense;onClose:()=>void;onSaved:()=>void}) {
  const [amount,setAmount]=useState(String(expense.amount));const [paidTo,setPaidTo]=useState(expense.paid_to);const [reason,setReason]=useState(expense.reason);const [category,setCategory]=useState(expense.category);const [date,setDate]=useState(expense.expense_date);const [notes,setNotes]=useState(expense.notes||"");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError("");try{await apiService.updateExpense(expense.id,{amount:Number(amount),paid_to:paidTo,reason,category,expense_date:date,notes});onSaved();onClose();}catch(e){setError(apiError(e));}finally{setBusy(false);}};
  return <Modal title="Edit expense" onClose={onClose}><form className="form-stack" onSubmit={submit}>{error&&<div className="inline-error">{error}</div>}
    <Field label="Amount"><div className="money-input"><span>₹</span><input type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></div></Field>
    <Field label="Paid to"><input value={paidTo} onChange={e=>setPaidTo(e.target.value)} required/></Field>
    <Field label="Reason"><input value={reason} onChange={e=>setReason(e.target.value)} required/></Field>
    <Field label="Category"><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></Field>
    <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
    <Field label="Notes"><textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)}/></Field>
    <div className="form-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy?"Saving...":"Save changes"}</Button></div>
  </form></Modal>;
}

function RoutedExpensesPage() {
  const location=useLocation();const navigate=useNavigate();const params=new URLSearchParams(location.search);const editId=params.get("edit");
  const [editing,setEditing]=useState<Expense|null>(null);const [key,setKey]=useState(0);
  useEffect(()=>{if(editId){const load=async()=>{try{const all=await apiService.accounts();const lists=await Promise.all(all.map(a=>apiService.expenses(a.id)));setEditing(lists.flat().find(e=>e.id===editId)||null);}catch{}};void load();}},[editId,key]);
  return <><ExpensesPage key={key}/>{editing&&<EditExpenseModal expense={editing} onClose={()=>{setEditing(null);navigate("/expenses");}} onSaved={()=>setKey(v=>v+1)}/>}</>;
}

function NotFound(){return <div className="panel"><EmptyState title="Page not found" description="The page you are looking for does not exist." action={<Button onClick={()=>window.location.assign("/")}>Go to dashboard</Button>}/></div>;}

export default function App() {
  return <Shell><Routes>
    <Route path="/" element={<DashboardPage/>}/>
    <Route path="/accounts" element={<AccountsPage/>}/>
    <Route path="/accounts/:id" element={<AccountDetailsPage/>}/>
    <Route path="/add-expense" element={<AddExpensePage/>}/>
    <Route path="/expenses" element={<RoutedExpensesPage/>}/>
    <Route path="/reports" element={<ReportsPage/>}/>
    <Route path="/settings" element={<SettingsPage/>}/>
    <Route path="*" element={<NotFound/>}/>
  </Routes></Shell>;
}
