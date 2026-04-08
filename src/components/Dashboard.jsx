import React from 'react';
import { Target, Zap, Clock, TrendingUp } from 'lucide-react';
import './Dashboard.css';

const Dashboard = ({ tasks }) => {
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const missedTasks = tasks.filter(t => t.status === 'missed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const totalXP = completedTasks * 150; // simple mock gamification

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="glass-panel stat-card">
        <div className="stat-header">
          <Zap className="stat-icon text-cyan" />
          <h3>Total XP</h3>
        </div>
        <p className="stat-value">{totalXP}</p>
        <p className="stat-desc">Keep studying to level up!</p>
      </div>

      <div className="glass-panel stat-card">
        <div className="stat-header">
          <Target className="stat-icon text-low" />
          <h3>Completed</h3>
        </div>
        <p className="stat-value">{completedTasks}</p>
        <p className="stat-desc">Tasks finished</p>
      </div>

      <div className="glass-panel stat-card">
        <div className="stat-header">
          <Clock className="stat-icon text-high" />
          <h3>Missed</h3>
        </div>
        <p className="stat-value">{missedTasks}</p>
        <p className="stat-desc">Tasks rescheduled</p>
      </div>

      <div className="glass-panel stat-card">
        <div className="stat-header">
          <TrendingUp className="stat-icon text-violet" />
          <h3>Pending</h3>
        </div>
        <p className="stat-value">{pendingTasks}</p>
        <p className="stat-desc">Tasks in queue</p>
      </div>
    </div>
  );
};

export default Dashboard;
