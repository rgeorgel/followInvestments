import { useState } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import InvestmentForm from './components/InvestmentForm'
import AccountInvestments from './components/AccountInvestments'
import AccountList from './components/AccountList'
import Logo from './components/Logo'

type AppView = 'dashboard' | 'form' | 'account' | 'accounts'

function App() {
  const [activeView, setActiveView] = useState<AppView>('dashboard')
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [refreshDashboard, setRefreshDashboard] = useState(0)

  const handleInvestmentCreated = () => {
    setRefreshDashboard(prev => prev + 1)
    setActiveView('dashboard')
  }

  const handleNavigateToAccount = (account: string) => {
    setSelectedAccount(account)
    setActiveView('account')
  }

  const handleBackToDashboard = () => {
    setActiveView('dashboard')
    setSelectedAccount('')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">
          <Logo size={50} showText={false} />
          <h1>SmartWealthStack</h1>
        </div>
        {activeView !== 'account' && (
          <nav>
            <button 
              className={activeView === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveView('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={activeView === 'accounts' ? 'active' : ''}
              onClick={() => setActiveView('accounts')}
            >
              Accounts
            </button>
            <button 
              className={activeView === 'form' ? 'active' : ''}
              onClick={() => setActiveView('form')}
            >
              Add Investment
            </button>
          </nav>
        )}
      </header>

      <main className="app-main">
        {activeView === 'dashboard' && (
          <Dashboard 
            key={refreshDashboard} 
            onNavigateToAccount={handleNavigateToAccount}
          />
        )}
        {activeView === 'accounts' && (
          <AccountList />
        )}
        {activeView === 'form' && (
          <InvestmentForm onSuccess={handleInvestmentCreated} />
        )}
        {activeView === 'account' && (
          <AccountInvestments 
            account={selectedAccount}
            onBack={handleBackToDashboard}
          />
        )}
      </main>
    </div>
  )
}

export default App
