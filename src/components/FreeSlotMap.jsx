import React, { useState } from 'react';
import { CalendarClock, Plus, Check } from 'lucide-react';
import './FreeSlotMap.css';

const FreeSlotMap = ({ schedule, onClaimSlot }) => {
  const [claimingSlotId, setClaimingSlotId] = useState(null);
  const [subject, setSubject] = useState('');

  // Filter free slots for today only
  const todayStr = new Date().toDateString();
  const freeSlotsToday = schedule.filter(s => 
    s.isFreeSlot && s.date.toDateString() === todayStr
  );

  const handleClaimSubmit = (slot) => {
    if (subject.trim()) {
      onClaimSlot({
        dateStr: slot.date.toDateString(),
        startHour: parseInt(slot.startTime.split(':')[0]),
        subject: subject.trim()
      });
      setClaimingSlotId(null);
      setSubject('');
    }
  };

  if (freeSlotsToday.length === 0) return null;

  return (
    <div className="free-slot-map glass-panel animate-fade-in mt-3">
      <div className="insights-header">
        <CalendarClock size={16} className="text-violet" />
        <h4>Open Slots Today</h4>
      </div>

      <div className="free-slot-list">
        {freeSlotsToday.map(slot => (
          <div key={slot.taskId} className="free-slot-item">
            <div className="free-slot-time">
              {slot.startTime} - {slot.endTime}
            </div>

            {claimingSlotId === slot.taskId ? (
              <div className="free-slot-input-row">
                <input 
                  type="text" 
                  placeholder="Task subject..." 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleClaimSubmit(slot)}
                />
                <button 
                  className="icon-btn text-cyan" 
                  onClick={() => handleClaimSubmit(slot)}
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <button 
                className="claim-btn"
                onClick={() => setClaimingSlotId(slot.taskId)}
              >
                <Plus size={14} /> Claim
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FreeSlotMap;
