import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { InvestmentTimelineData, TimelinePoint, GoalMarker } from '../types/Investment';

interface InvestmentTimelineProps {
  timelineData: InvestmentTimelineData;
}

const InvestmentTimeline: React.FC<InvestmentTimelineProps> = ({ timelineData }) => {
  const formatCurrency = (value: number, currency: string = 'CAD') => {
    const currencyCode = currency === 'BRL' ? 'BRL' : 'CAD';
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

  // Group goal markers by currency for better visualization
  const brlGoals = timelineData.goalMarkers.filter(g => g.currency === 'BRL');
  const cadGoals = timelineData.goalMarkers.filter(g => g.currency === 'CAD');

  // Get the maximum value for Y-axis scaling
  const maxValue = Math.max(
    ...chartData.map(d => d.totalValue),
    ...timelineData.goalMarkers.map(g => g.value)
  );

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
        <h3>Portfolio Growth Timeline</h3>
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
        <ResponsiveContainer width="100%" height={400}>
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

            {/* Goal markers as reference lines - show all goals */}
            {timelineData.goalMarkers.map((goal: any, index: number) => {
              let strokeColor, fillColor;
              
              if (goal.currency === 'BRL') {
                strokeColor = '#28a745'; // Green for BRL
                fillColor = '#28a745';
              } else if (goal.currency === 'CAD') {
                strokeColor = '#dc3545'; // Red for CAD
                fillColor = '#dc3545';
              } else if (goal.currency === 'TOTAL') {
                strokeColor = '#6f42c1'; // Purple for total
                fillColor = '#6f42c1';
              } else {
                strokeColor = '#6c757d'; // Gray as fallback
                fillColor = '#6c757d';
              }
              
              // Different dash patterns for different types
              const dashArray = goal.type === 'total' ? '10 5' : '5 5';
              const strokeWidth = goal.type === 'total' ? 3 : 2;
              
              return (
                <ReferenceLine 
                  key={`goal-${index}`}
                  y={goal.value} 
                  stroke={strokeColor}
                  strokeDasharray={dashArray}
                  strokeWidth={strokeWidth}
                  label={{ 
                    value: `${goal.label}: ${formatCurrency(goal.value, goal.currency)}`, 
                    position: index % 2 === 0 ? 'topLeft' : 'topRight',
                    fontSize: 10,
                    fill: fillColor
                  }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Goal markers legend */}
      {timelineData.goalMarkers.length > 0 && (
        <div className="goals-legend">
          <h4>Financial Goals</h4>
          
          {/* BRL Goals */}
          <div className="goals-section">
            <h5>🇧🇷 BRL Goals</h5>
            <div className="goals-grid">
              {timelineData.goalMarkers
                .filter((goal: any) => goal.currency === 'BRL')
                .map((goal: any) => (
                  <div key={`brl-${goal.year}`} className="goal-item">
                    <span className="goal-marker brl"></span>
                    <span className="goal-text">
                      {goal.year}: {formatCurrency(goal.value, 'BRL')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
          
          {/* CAD Goals */}
          <div className="goals-section">
            <h5>🇨🇦 CAD Goals</h5>
            <div className="goals-grid">
              {timelineData.goalMarkers
                .filter((goal: any) => goal.currency === 'CAD')
                .map((goal: any) => (
                  <div key={`cad-${goal.year}`} className="goal-item">
                    <span className="goal-marker cad"></span>
                    <span className="goal-text">
                      {goal.year}: {formatCurrency(goal.value, 'CAD')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Total Goals */}
          <div className="goals-section">
            <h5>🌍 Total Goals (Combined)</h5>
            <div className="goals-grid">
              {timelineData.goalMarkers
                .filter((goal: any) => goal.currency === 'TOTAL')
                .map((goal: any) => (
                  <div key={`total-${goal.year}`} className="goal-item">
                    <span className="goal-marker total"></span>
                    <span className="goal-text">
                      {goal.year}: {formatCurrency(goal.value, 'CAD')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentTimeline;