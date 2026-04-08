import React from 'react';
import { Target, Clock, Zap } from 'lucide-react';
import './Reminders.css';

const Reminders = ({ tasks, activeSession }) => {
  // Compute studied time vs pending time
  const totalPendingMinutes = tasks
    .filter(t => t.status === 'pending')
    .reduce((acc, t) => acc + (t.estimatedHours * 60), 0);
    
  const tasksPendingCount = tasks.filter(t => t.status === 'pending').length;

  const totalStudiedMinutes = tasks
    .filter(t => t.status === 'completed')
    .reduce((acc, t) => acc + (t.originalEstimatedHours * 60), 0); // We assume original is stored

  const formatMinutes = (mins) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="reminders-banner animate-fade-in">
      <div className="reminder-item">
        <Zap size={20} className="text-violet" />
        <div className="reminder-text">
          <span className="reminder-label">Time Studied</span>
          <span className="reminder-value">{formatMinutes(totalStudiedMinutes)}</span>
        </div>
      </div>

      <div className="reminder-item">
        <Clock size={20} className="text-cyan" />
        <div className="reminder-text">
          <span className="reminder-label">Time Left</span>
          <span className="reminder-value">{formatMinutes(totalPendingMinutes)}</span>
        </div>
      </div>

      <div className="reminder-item">
        <Target size={20} className="text-high" />
        <div className="reminder-text">
          <span className="reminder-label">Pending Tasks</span>
          <span className="reminder-value">{tasksPendingCount}</span>
        </div>
      </div>
      
      {activeSession && (
        <div className="reminder-item active-alert">
          <div className="pulse-dot"></div>
          <span className="reminder-value">Actively Studying: {activeSession.task.subject}</span>
        </div>
      )}
    </div>
  );
};

export default Reminders;
