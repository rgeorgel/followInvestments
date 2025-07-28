import { useState } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import InvestmentForm from './components/InvestmentForm'

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form'>('dashboard')
  const [refreshDashboard, setRefreshDashboard] = useState(0)

  const handleInvestmentCreated = () => {
    setRefreshDashboard(prev => prev + 1)
    setActiveTab('dashboard')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Follow Investments</h1>
        <nav>
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={activeTab === 'form' ? 'active' : ''}
            onClick={() => setActiveTab('form')}
          >
            Add Investment
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard key={refreshDashboard} />}
        {activeTab === 'form' && <InvestmentForm onSuccess={handleInvestmentCreated} />}
      </main>
    </div>
  )
}

export default App
