import React from 'react';
import type { AccountGoalProgress } from '../types/Investment';

interface AccountGoalsProgressProps {
  accountGoals: AccountGoalProgress[];
}

const AccountGoalsProgress: React.FC<AccountGoalsProgressProps> = ({ accountGoals = [] }) => {
  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'BRL' ? 'BRL' : 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateProgress = (current: number, goal?: number) => {
    if (!goal || goal === 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#27ae60'; // Green - Goal reached
    if (progress >= 75) return '#f39c12';   // Orange - Close to goal
    if (progress >= 50) return '#3498db';   // Blue - Halfway
    return '#e74c3c'; // Red - Far from goal
  };

  // Early return if no account goals data
  if (!accountGoals || accountGoals.length === 0) {
    return (
      <div className="account-goals-progress">
        <h3>Account Goals Progress</h3>
        <div className="empty-state">
          <p>No accounts with financial goals found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-goals-progress">
      <h3>Account Goals Progress</h3>
      <div className="goals-progress-grid">
        {accountGoals.map((account) => (
          <div key={account.accountId} className="account-goals-card">
            <div className="account-header">
              <h4>{account.accountName}</h4>
              <div className="current-value">
                Current: {formatCurrency(account.currentValue, account.currency)}
              </div>
            </div>
            
            <div className="goals-progress">
              {[1, 2, 3, 4, 5].map((year) => {
                const goalKey = `year${year}` as keyof typeof account.goals;
                const goalValue = account.goals[goalKey];
                
                if (!goalValue) return null;
                
                const progress = calculateProgress(account.currentValue, goalValue);
                const progressColor = getProgressColor(progress);
                
                return (
                  <div key={year} className="goal-progress-item">
                    <div className="goal-info">
                      <span className="goal-year">Year {year}</span>
                      <span className="goal-target">
                        {formatCurrency(goalValue, account.currency)}
                      </span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar"
                        style={{ 
                          width: `${progress}%`, 
                          backgroundColor: progressColor 
                        }}
                      />
                      <span className="progress-percentage">
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {Object.values(account.goals).every(goal => !goal) && (
              <div className="no-goals">
                <p>No financial goals set for this account</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountGoalsProgress;