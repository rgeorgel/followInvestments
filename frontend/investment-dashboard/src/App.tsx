import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import Dashboard from './components/Dashboard'
import InvestmentForm from './components/InvestmentForm'
import AccountInvestments from './components/AccountInvestments'
import AccountList from './components/AccountList'
import Login from './components/Login'
import Logo from './components/Logo'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="app-loading">
        <Logo size={80} showText={true} />
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // Redirect to login route instead of showing login inline
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  return <>{children}</>;
};

// Login Page Component
const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/dashboard';
  
  const handleLoginSuccess = (user: any) => {
    login(user);
    navigate(redirectPath, { replace: true });
  };
  
  return <Login onLoginSuccess={handleLoginSuccess} />;
};

// Layout Component with Navigation
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  const handleLogout = () => {
    logout();
  };

  const isAccountDetailPage = location.pathname.startsWith('/account/');

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">
          <Logo size={50} showText={false} />
          <h1>SmartWealthStack</h1>
        </div>
        
        <div className="header-right">
          {!isAccountDetailPage && (
            <nav>
              <Link 
                to="/dashboard" 
                className={location.pathname === '/dashboard' ? 'active' : ''}
              >
                Dashboard
              </Link>
              <Link 
                to="/accounts" 
                className={location.pathname === '/accounts' ? 'active' : ''}
              >
                Accounts
              </Link>
              <Link 
                to="/add-investment" 
                className={location.pathname === '/add-investment' ? 'active' : ''}
              >
                Add Investment
              </Link>
            </nav>
          )}
          
          <div className="user-menu">
            <span className="user-name">Welcome, {user?.name}</span>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {children}
      </main>
    </div>
  );
};

// Dashboard Page Component
const DashboardPage = () => {
  const navigate = useNavigate();
  
  const handleNavigateToAccount = (accountName: string) => {
    navigate(`/account/${encodeURIComponent(accountName)}`);
  };

  return <Dashboard onNavigateToAccount={handleNavigateToAccount} />;
};

// Add Investment Page Component
const AddInvestmentPage = () => {
  const navigate = useNavigate();
  
  const handleSuccess = () => {
    navigate('/dashboard');
  };

  return <InvestmentForm onSuccess={handleSuccess} />;
};

// Account Detail Page Component
const AccountDetailPage = () => {
  const { accountName } = useParams();
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/dashboard');
  };

  if (!accountName) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AccountInvestments 
      account={decodeURIComponent(accountName)}
      onBack={handleBack}
    />
  );
};

// Main App Content Component
const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={
        isAuthenticated && !isLoading ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/accounts" element={
        <ProtectedRoute>
          <AppLayout>
            <AccountList />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/add-investment" element={
        <ProtectedRoute>
          <AppLayout>
            <AddInvestmentPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/account/:accountName" element={
        <ProtectedRoute>
          <AppLayout>
            <AccountDetailPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App
