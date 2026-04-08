import React, { useState } from 'react';
import { ChevronRight, Plus, Trash2, CheckCircle } from 'lucide-react';
import { SUBJECT_TOPICS } from '../utils/resources';
import { getSuggestionForSubject } from '../utils/scheduler';
import './SetupWizard.css';

const SetupWizard = ({ onCompleteSetup }) => {
  const [step, setStep] = useState(1);
  
  // Settings State
  const [startHour, setStartHour] = useState("8");
  const [endHour, setEndHour] = useState("22");

  const finishSetup = () => {
    onCompleteSetup({
      startHour: Number(startHour),
      endHour: Number(endHour),
      initialTasks: []
    });
  };

  return (
    <div className="setup-container animate-fade-in">
      <div className="glass-panel setup-panel">
        <div className="setup-header">
          <h2>Initial Setup</h2>
          <p>Configure your daily study window.</p>
        </div>

        {step === 1 && (
          <div className="setup-step step-1 animate-fade-in">
            <h3>When are you free to study?</h3>
            <p className="text-muted">Set the time frame in your day when you are potentially available. The scheduler will fill slots ONLY within these boundaries.</p>
            
            <div className="time-config-row">
              <div className="form-group flex-1">
                <label>Start Time</label>
                <select value={startHour} onChange={e => setStartHour(e.target.value)}>
                  {Array.from({length: 24}).map((_, i) => (
                    <option key={i} value={i}>{`${i.toString().padStart(2, '0')}:00`}</option>
                  ))}
                </select>
              </div>
              <div className="form-group flex-1">
                <label>End Time</label>
                <select value={endHour} onChange={e => setEndHour(e.target.value)}>
                  {Array.from({length: 25}).slice(1).map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1 === 24 ? '24:00 (Midnight)' : `${(i+1).toString().padStart(2, '0')}:00`}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="btn btn-primary mt-2" onClick={finishSetup}>
              Start Tracking <CheckCircle size={18} style={{ marginLeft: 8 }}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupWizard;
