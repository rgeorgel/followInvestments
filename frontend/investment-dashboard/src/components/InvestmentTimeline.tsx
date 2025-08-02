import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { InvestmentTimelineData, TimelinePoint } from '../types/Investment';

interface InvestmentTimelineProps {
  timelineData: InvestmentTimelineData;
  displayCurrency?: string;
}

const InvestmentTimeline: React.FC<InvestmentTimelineProps> = ({ timelineData, displayCurrency }) => {
  const formatCurrency = (value: number, currency: string = 'CAD') => {
    // Use the display currency if provided, otherwise use the original currency
    const currencyCode = displayCurrency || (currency === 'BRL' ? 'BRL' : (currency === 'USD' ? 'USD' : 'CAD'));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Prepare data for the chart
  const chartData = timelineData.timelinePoints.map((point: TimelinePoint) => ({
    date: formatDate(point.date),
    dateValue: new Date(point.date).getTime(),
    totalValue: point.totalValue,
    brlValue: point.brlValue,
    cadValue: point.cadValue,
  }));

  // Sort by date
  chartData.sort((a, b) => a.dateValue - b.dateValue);


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="timeline-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value, entry.name === 'BRL Value' ? 'BRL' : 'CAD')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="investment-timeline">
      <div className="timeline-header">
        <h3>Portfolio Growth Timeline {displayCurrency ? `(${displayCurrency})` : ''}</h3>
        <div className="timeline-summary">
          <div className="summary-item">
            <span className="label">Current Total:</span>
            <span className="value">{formatCurrency(timelineData.currentTotalValue)}</span>
          </div>
          {timelineData.currentBrlValue > 0 && (
            <div className="summary-item">
              <span className="label">BRL:</span>
              <span className="value">{formatCurrency(timelineData.currentBrlValue, 'BRL')}</span>
            </div>
          )}
          {timelineData.currentCadValue > 0 && (
            <div className="summary-item">
              <span className="label">CAD:</span>
              <span className="value">{formatCurrency(timelineData.currentCadValue, 'CAD')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="timeline-chart">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Portfolio value lines */}
            <Line 
              type="monotone" 
              dataKey="totalValue" 
              stroke="#2c3e50" 
              strokeWidth={3}
              dot={{ fill: '#2c3e50', r: 4 }}
              activeDot={{ r: 6 }}
              name="Total Portfolio"
            />
            
            {timelineData.currentBrlValue > 0 && (
              <Line 
                type="monotone" 
                dataKey="brlValue" 
                stroke="#28a745" 
                strokeWidth={2}
                dot={{ fill: '#28a745', r: 3 }}
                name="BRL Value"
              />
            )}
            
            {timelineData.currentCadValue > 0 && (
              <Line 
                type="monotone" 
                dataKey="cadValue" 
                stroke="#dc3545" 
                strokeWidth={2}
                dot={{ fill: '#dc3545', r: 3 }}
                name="CAD Value"
              />
            )}

            {/* Show only 5-year total goal as key milestone */}
            {(() => {
              const fiveYearGoal = timelineData.goalMarkers.find((goal: any) => 
                goal.year === '2029' && (goal.currency === 'TOTAL' || goal.type === 'total')
              );
              
              if (!fiveYearGoal) return null;
              
              return (
                <ReferenceLine 
                  y={fiveYearGoal.value} 
                  stroke="#6f42c1"
                  strokeDasharray="8 4"
                  strokeWidth={2}
                  label={{ 
                    value: `5-Year Goal: ${formatCurrency(fiveYearGoal.value, fiveYearGoal.currency)}`, 
                    position: 'top',
                    fontSize: 12,
                    fill: '#6f42c1',
                    fontWeight: 'bold'
                  }}
                />
              );
            })()}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Simplified goal indicator */}
      {(() => {
        const fiveYearGoal = timelineData.goalMarkers.find((goal: any) => 
          goal.year === '2029' && (goal.currency === 'TOTAL' || goal.type === 'total')
        );
        
        if (!fiveYearGoal) return null;
        
        return (
          <div className="milestone-indicator">
            <div className="milestone-item">
              <span className="milestone-marker"></span>
              <span className="milestone-text">
                <strong>2029 Target:</strong> {formatCurrency(fiveYearGoal.value, fiveYearGoal.currency)}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default InvestmentTimeline;