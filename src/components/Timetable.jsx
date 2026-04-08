import React, { useState } from 'react';
import { Calendar, AlertCircle, CheckCircle, Clock, Play, ShieldAlert, Zap, Book, Settings } from 'lucide-react';
import './Timetable.css';

const Timetable = ({ schedule, onUpdateTaskStatus, onStartSession, activeSessionTaskId }) => {
  const [expandedTimerId, setExpandedTimerId] = useState(null);
  const [customMins, setCustomMins] = useState('');
  const [isStrict, setIsStrict] = useState(false);

  if (!schedule || schedule.length === 0) {
    return (
      <div className="glass-panel animate-fade-in empty-schedule">
        <Calendar size={48} className="text-muted" />
        <h2>Your Schedule is Empty</h2>
        <p>Add some tasks to get your dynamic study plan.</p>
      </div>
    );
  }

  // Format dates for grouping
  const formatDay = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Group by date
  const groupedSchedule = schedule.reduce((acc, slot) => {
    const day = formatDay(slot.date);
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {});

  return (
    <div className="timetable-container animate-fade-in">
      {Object.entries(groupedSchedule).map(([day, slots], index) => (
        <div key={day} className="day-group">
          <h2 className="day-header">{day}</h2>
          <div className="slots-container">
            {slots.map((slot, i) => (
              <React.Fragment key={`${slot.taskId}-${day}-${i}`}>
              <div 
                className={`glass-panel slot-item status-${slot.status} ${slot.isFreeSlot ? 'free-slot' : ''} ${expandedTimerId === slot.taskId ? 'slot-expanded' : ''} animate-fade-in`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="slot-info">
                  <div className="slot-header">
                    {!slot.isFreeSlot && (
                      <span className={`priority-badge prio-${slot.priority}`}>
                        {slot.priority.toUpperCase()}
                      </span>
                    )}
                    {slot.isFreeSlot && (
                      <span className="priority-badge free-badge">
                        FREE BLOCK
                      </span>
                    )}
                    <span className="duration">
                      <Clock size={14} /> {slot.startTime} - {slot.endTime} {!slot.isFreeSlot && `(${slot.allocatedHours.toFixed(1)}h)`}
                    </span>
                  </div>
                  <h3>{slot.subject}</h3>
                  <p>{slot.topic}</p>
                </div>

                {!slot.isFreeSlot && (
                <div className="slot-actions">
                  {activeSessionTaskId === slot.taskId ? (
                    <span className="active-badge">Studying...</span>
                  ) : expandedTimerId === slot.taskId ? (
                    <button 
                      className="action-btn play-btn expanded-btn" 
                      title="Cancel"
                      onClick={() => setExpandedTimerId(null)}
                    >
                      <Settings size={20} />
                    </button>
                  ) : (
                    <>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                        title="Quick Start Timer"
                        onClick={() => onStartSession(slot.taskId, null, false)}
                      >
                        <Play size={14} style={{ marginRight: 4 }}/> Start 
                      </button>
                      <button 
                        className="action-btn play-btn" 
                        title="Configure Timer"
                        onClick={() => setExpandedTimerId(slot.taskId)}
                      >
                        <Settings size={20} />
                      </button>
                    </>
                  )}
                  <button 
                    className="action-btn miss-btn" 
                    title="Abandon Task"
                    onClick={() => onUpdateTaskStatus(slot.taskId, 'missed')}
                  >
                    <AlertCircle size={20} />
                  </button>
                </div>
              )}
              </div>
              
              {expandedTimerId === slot.taskId && !slot.isFreeSlot && activeSessionTaskId !== slot.taskId && (
                <div className="inline-timer-config animate-fade-in">
                  <div className="inline-options">
                    <button className="inline-btn" onClick={() => onStartSession(slot.taskId, 25, isStrict)}>
                      <Zap size={14}/> 25m Sprint
                    </button>
                    <button className="inline-btn" onClick={() => onStartSession(slot.taskId, 50, isStrict)}>
                      <Book size={14}/> 50m Deep Work
                    </button>
                    <button className="inline-btn" onClick={() => onStartSession(slot.taskId, null, isStrict)}>
                      <CheckCircle size={14}/> Full Session
                    </button>
                  </div>
                  
                  <div className="inline-custom">
                    <input 
                      type="number" 
                      placeholder="Custom mins" 
                      value={customMins} 
                      onChange={e => setCustomMins(e.target.value)}
                    />
                    <button 
                      className="inline-btn btn-primary" 
                      onClick={() => {
                        if(customMins > 0) onStartSession(slot.taskId, Number(customMins), isStrict);
                      }}
                    >
                      Start
                    </button>
                  </div>

                  <div className="strict-toggle-row">
                    <label className="strict-label">
                      <input 
                        type="checkbox" 
                        checked={isStrict} 
                        onChange={(e) => setIsStrict(e.target.checked)} 
                      />
                      <ShieldAlert size={14} className={isStrict ? "text-high" : "text-muted"} />
                      Strict Focus Lock (Prevents Tab Switching)
                    </label>
                  </div>
                </div>
              )}

            </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timetable;
