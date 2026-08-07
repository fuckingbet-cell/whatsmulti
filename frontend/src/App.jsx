import { useState, useEffect } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from './api/client';

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    navigate('/');
  };

  const register = async (email, password, name) => {
    const res = await authApi.register(email, password, name);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    navigate('/');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  if (!user && location.pathname !== '/login' && location.pathname !== '/register') {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

const AuthContext = React.createContext();

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/messages" element={<Messages />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  );
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-green-700">Multi-WhatsApp</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/accounts" className="nav-link">Accounts</Link>
          <Link to="/templates" className="nav-link">Templates</Link>
          <Link to="/messages" className="nav-link">Scheduled</Link>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-gray-500">{user.email}</span>
          </div>
          <button onClick={logout} className="w-full btn btn-secondary text-sm">Logout</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { await login(email, password); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>
        {err && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{err}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input type="password" className="input" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <button type="submit" className="w-full btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          No account? <a href="/register" className="text-green-600 hover:underline">Register</a>
        </p>
      </div>
    </div>
  );
}

function Register() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { await register(email, password, name); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Create Account</h2>
        {err && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{err}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
          <input type="email" className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input type="password" className="input" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} />
          <button type="submit" className="w-full btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Have an account? <a href="/login" className="text-green-600 hover:underline">Sign In</a>
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { accountsApi, messagesApi, templatesApi } = require('./api/client');
  const [stats, setStats] = useState({ accounts: 0, online: 0, templates: 0, scheduled: 0 });
  useEffect(() => {
    Promise.all([accountsApi.list(), templatesApi.list(), messagesApi.list()])
      .then(([acc, tmpl, msg]) => {
        setStats({
          accounts: acc.length,
          online: acc.filter(a => a.status === 'online').length,
          templates: tmpl.length,
          scheduled: msg.filter(m => m.status === 'pending').length,
        });
      });
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Accounts" value={stats.accounts} icon="📱" />
        <StatCard title="Online" value={stats.online} icon="🟢" color="text-green-600" />
        <StatCard title="Templates" value={stats.templates} icon="📝" />
        <StatCard title="Scheduled" value={stats.scheduled} icon="⏰" color="text-yellow-600" />
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4 flex-wrap">
          <Link to="/accounts" className="btn btn-primary">Add Account</Link>
          <Link to="/templates" className="btn btn-secondary">Create Template</Link>
          <Link to="/messages" className="btn btn-secondary">Schedule Message</Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color = 'text-gray-900' }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
}

function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const { accountsApi } = require('./api/client');

  useEffect(() => { load(); }, []);
  const load = async () => { setLoading(true); setAccounts(await accountsApi.list()); setLoading(false); };

  const handleAdd = async (label) => {
    await accountsApi.create({ label });
    load();
    setModal(null);
  };
  const handleDelete = async (id) => {
    if (!confirm('Delete this account?')) return;
    await accountsApi.delete(id);
    load();
  };
  const handleRefresh = async (id) => {
    await accountsApi.update(id, { status: 'qr_needed' });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">WhatsApp Accounts</h1>
        <button onClick={() => setModal({ type: 'add' })} className="btn btn-primary">+ Add Account</button>
      </div>
      {loading ? (
        <div className="card text-center py-12 text-gray-500">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          No accounts yet. Click "Add Account" to get started.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map(acc => (
            <AccountCard key={acc.id} account={acc} onDelete={handleDelete} onRefresh={handleRefresh} />
          ))}
        </div>
      )}
      {modal && <AccountModal modal={modal} onClose={() => setModal(null)} onSubmit={handleAdd} />}
    </div>
  );
}

function AccountCard({ account, onDelete, onRefresh }) {
  const badgeClass = {
    online: 'badge-online', offline: 'badge-offline', qr_needed: 'badge-qr', banned: 'badge-banned'
  }[account.status] || 'badge-offline';
  const statusLabel = { online: 'Online', offline: 'Offline', qr_needed: 'QR Needed', banned: 'Banned' }[account.status] || 'Unknown';
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg">{account.label}</h3>
        <span className={`badge ${badgeClass}`}>{statusLabel}</span>
      </div>
      <div className="space-y-1 text-sm text-gray-600 mb-4">
        {account.phone && <p>📞 {account.phone}</p>}
        {account.notes && <p>📝 {account.notes}</p>}
        <p>Last seen: {account.last_seen ? new Date(account.last_seen).toLocaleString() : 'Never'}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onRefresh(account.id)} className="btn btn-secondary text-sm flex-1">Refresh QR</button>
        <button onClick={() => onDelete(account.id)} className="btn btn-danger text-sm">Delete</button>
      </div>
    </div>
  );
}

function AccountModal({ modal, onClose, onSubmit }) {
  const [label, setLabel] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{modal.type === 'add' ? 'Add Account' : 'Edit Account'}</h2>
        <input type="text" className="input mb-4" placeholder="Account label" value={label} onChange={e=>setLabel(e.target.value)} autoFocus />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={() => { onSubmit(label); }} className="btn btn-primary">Save</button>
        </div>
      </div>
    </div>
  );
}

function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const { templatesApi } = require('./api/client');

  useEffect(() => { load(); }, []);
  const load = async () => { setLoading(true); setTemplates(await templatesApi.list()); setLoading(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await templatesApi.create(form);
    load();
    setModal(false);
    setForm({ title: '', body: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Message Templates</h1>
        <button onClick={() => { setForm({ title: '', body: '' }); setModal(true); }} className="btn btn-primary">+ New Template</button>
      </div>
      {loading ? <div className="card text-center py-12">Loading...</div> : templates.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">No templates yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <div key={t.id} className="card">
              <h3 className="font-semibold">{t.title}</h3>
              <p className="mt-2 text-gray-600 whitespace-pre-wrap text-sm">{t.body}</p>
              <button onClick={() => { if(confirm('Delete?')) templatesApi.delete(t.id).then(load); }} className="btn btn-danger text-sm mt-4">Delete</button>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="card w-full max-w-2xl max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">New Template</h2>
            <input type="text" className="input mb-4" placeholder="Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required />
            <textarea className="input mb-4 h-40" placeholder="Message body" value={form.body} onChange={e=>setForm({...form, body:e.target.value})} required />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={()=>setModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ account_id: '', recipient: '', message: '', send_at: '' });
  const { messagesApi, accountsApi } = require('./api/client');
  const [accounts, setAccounts] = useState([]);

  useEffect(() => { load(); loadAccounts(); }, []);
  const load = async () => { setLoading(true); setMessages(await messagesApi.list()); setLoading(false); };
  const loadAccounts = async () => { setAccounts(await accountsApi.list()); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await messagesApi.create(form);
    load();
    setModal(false);
    setForm({ account_id: '', recipient: '', message: '', send_at: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scheduled Messages</h1>
        <button onClick={() => { setModal(true); }} className="btn btn-primary">+ Schedule Message</button>
      </div>
      {loading ? <div className="card text-center py-12">Loading...</div> : messages.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">No scheduled messages.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="p-3">Account</th><th className="p-3">Recipient</th><th className="p-3">Message</th><th className="p-3">Send At</th><th className="p-3">Status</th><th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {messages.map(m => (
                <tr key={m.id}>
                  <td className="p-3">{m.account_label}</td>
                  <td className="p-3">{m.recipient}</td>
                  <td className="p-3 max-w-xs truncate">{m.message}</td>
                  <td className="p-3">{new Date(m.send_at).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`badge ${m.status==='pending'?'badge-yellow':m.status==='sent'?'badge-online':m.status==='failed'?'badge-banned':'badge-offline'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {m.status === 'pending' && (
                      <button onClick={() => messagesApi.updateStatus(m.id, 'cancelled').then(load)} className="btn btn-danger text-sm">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="card w-full max-w-2xl max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">Schedule Message</h2>
            <select className="input mb-4" value={form.account_id} onChange={e=>setForm({...form, account_id:e.target.value})} required>
              <option value="">Select Account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.label} ({a.status})</option>)}
            </select>
            <input type="text" className="input mb-4" placeholder="Recipient (phone with country code, e.g. 15551234567)" value={form.recipient} onChange={e=>setForm({...form, recipient:e.target.value})} required />
            <textarea className="input mb-4 h-24" placeholder="Message" value={form.message} onChange={e=>setForm({...form, message:e.target.value})} required />
            <input type="datetime-local" className="input mb-4" value={form.send_at} onChange={e=>setForm({...form, send_at:e.target.value})} required />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={()=>setModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Schedule</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}