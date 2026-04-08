import React from 'react';
import { Lightbulb, AlertTriangle, Flame, ShieldCheck } from 'lucide-react';
import { ACTIVITY_MODIFIERS } from '../utils/scheduler';
import './InsightsPanel.css';

const InsightsPanel = ({ tasks, schedule }) => {
  const getInsights = () => {
    const insights = [];
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    // 1. Burnout Prevention
    const totalScheduledHours = schedule
      .filter(s => !s.isFreeSlot && s.status !== 'completed')
      .reduce((acc, s) => acc + s.allocatedHours, 0);

    if (totalScheduledHours >= 6) {
      insights.push({
        id: 'burnout',
        icon: <AlertTriangle size={16} className="text-high" />,
        text: `Heavy load ahead! You have ${totalScheduledHours} hours scheduled today. Force a 10-minute break every hour to avoid burnout.`
      });
    }

    // 2. Velocity Coaching
    let slowSubjectFlagged = false;
    pendingTasks.forEach(task => {
      if (ACTIVITY_MODIFIERS[task.subject] > 1.2 && !slowSubjectFlagged) {
        insights.push({
          id: `velocity-${task.id}`,
          icon: <Flame size={16} className="text-medium" />,
          text: `You generally need more time for ${task.subject}. Consider tackling it FIRST while your willpower is highest!`
        });
        slowSubjectFlagged = true; // only flag one
      }
    });

    // 3. Task Overload
    if (pendingTasks.length >= 8) {
      insights.push({
        id: 'overload',
        icon: <Lightbulb size={16} className="text-cyan" />,
        text: `You have ${pendingTasks.length} pending tasks. Ignore the easy ones and focus entirely on High Priority deadlines today.`
      });
    }

    // Default positive if no critical insights
    if (insights.length === 0) {
      if (pendingTasks.length === 0) {
        insights.push({
          id: 'clear',
          icon: <ShieldCheck size={16} className="text-low" />,
          text: "You are totally caught up! Incredible work. Take the rest of the day off or read ahead."
        });
      } else {
        insights.push({
          id: 'generic',
          icon: <ShieldCheck size={16} className="text-low" />,
          text: "Pace looks good! Your schedule is highly manageable. Stick to the live timer and maintain consistency."
        });
      }
    }

    return insights;
  };

  const insights = getInsights();

  return (
    <div className="insights-panel glass-panel animate-fade-in">
      <div className="insights-header">
        <Lightbulb size={18} className="text-cyan" />
        <h4>Smart Insights</h4>
      </div>
      
      <div className="insights-list">
        {insights.map(item => (
          <div key={item.id} className="insight-card">
            <div className="insight-icon">{item.icon}</div>
            <p className="insight-text">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsPanel;
