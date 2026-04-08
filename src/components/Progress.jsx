import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import { ACTIVITY_MODIFIERS } from '../utils/scheduler';
import { Target, TrendingDown, TrendingUp, EqualSquare } from 'lucide-react';
import WordPuzzleGame from './WordPuzzleGame';
import './Progress.css';

const Progress = ({ tasks }) => {
  const [spentXP, setSpentXP] = useState(0);
  const [gameResult, setGameResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    const savedSpentXP = localStorage.getItem('spentXP');
    if (savedSpentXP) setSpentXP(Number(savedSpentXP));
  }, []);

  const totalEarnedXP = tasks.filter(t => t.status === 'completed').length * 150;
  const availableXP = totalEarnedXP - spentXP;

  const getVelocityIcon = (velocity) => {
    if (velocity < 1) return <TrendingUp className="text-low" size={20} />;
    if (velocity > 1) return <TrendingDown className="text-high" size={20} />;
    return <EqualSquare className="text-muted" size={20} />;
  };

  const getVelocityText = (velocity) => {
    if (velocity === 1) return "Average Pace";
    if (velocity < 1) return `${Math.round((1 - velocity)*100)}% Faster`;
    return `${Math.round((velocity - 1)*100)}% Slower`;
  };

  const handleSpendXP = (cost) => {
    let newSpent = spentXP + cost;
    setSpentXP(newSpent);
    localStorage.setItem('spentXP', newSpent);
  };

  return (
    <div className="progress-container animate-fade-in">
      <div className="progress-header">
        <h2>Your Progress & Stats</h2>
        <p>Track your XP and how fast you are learning topics.</p>
      </div>

      <div className="dashboard-section">
        <Dashboard tasks={tasks} />
      </div>

      <div className="velocity-section" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3>Learning Velocities</h3>
          <p className="section-desc">The engine tracks how fast you complete tasks vs your estimates to auto-adjust future schedules.</p>
          
          <div className="velocity-cards">
            {Object.entries(ACTIVITY_MODIFIERS).length === 0 ? (
              <div className="glass-panel text-center">
                <p>Complete some tasks to generate velocity data!</p>
              </div>
            ) : (
              Object.entries(ACTIVITY_MODIFIERS).map(([subject, velocity]) => (
                <div key={subject} className="glass-panel velocity-card">
                  <div className="veloc-head">
                    <Target size={24} className="text-violet" />
                    <h4>{subject}</h4>
                  </div>
                  <div className="veloc-stats">
                    {getVelocityIcon(velocity)}
                    <span>{getVelocityText(velocity)} ({velocity.toFixed(2)}x)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ flex: 1, minWidth: '350px' }}>
          <div style={{ padding: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>XP Balance</span>
            <span style={{ background: 'rgba(255, 215, 0, 0.2)', color: 'var(--accent-cyan)', padding: '0.4rem 1rem', borderRadius: '20px', fontWeight: '600' }}>{availableXP} XP</span>
          </div>
          <WordPuzzleGame availableXP={availableXP} onSpendXP={handleSpendXP} />
        </div>
      </div>
    </div>
  );
};

export default Progress;
