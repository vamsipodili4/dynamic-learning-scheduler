import React, { useState, useEffect, useRef } from 'react';
import { Pause, Target, AlertTriangle, CheckCircle, Zap, Play, Square } from 'lucide-react';
import './LiveTimer.css';

const LiveTimer = ({ activeSession, onStopSession, onCompleteTask, onTick }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(activeSession?.startingElapsed || 0);
  const [isDistracted, setIsDistracted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioCtxRef = useRef(null);
  const beepIntervalRef = useRef(null);

  const stopAlarm = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  };

  // Safe side-effect sync to the global engine
  useEffect(() => {
    if (elapsedSeconds > 0 && onTick && activeSession?.taskId) {
      onTick(activeSession.taskId, elapsedSeconds);
    }
  }, [elapsedSeconds]);

  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      setIsDistracted(false);
      setIsSuccess(false);
      setIsPaused(false);
      stopAlarm();
      return;
    }

    const targetSeconds = activeSession.sessionDurationMins * 60;
    
    // In Strict Mode, we monitor visibility
    const handleVisibilityChange = () => {
      if (document.hidden && activeSession.isStrictMode) {
        setIsDistracted(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const calculateElapsed = () => {
      // If distracted, the timer stops naturally because we explicitly freeze state,
      // but to accurately track elapsed without bleeding into pause time, 
      // we must use a delta based tick instead of Date difference, OR we just let the Date diff continue and accept that the time passed while away counts? No! If distracted, they didn't study.
      // Easiest hack for pure React: just use `setInterval` to increment by 1 IF NOT distracted.
      setElapsedSeconds(prev => {
        if (isDistracted || isPaused) return prev;
        
        const next = prev + 1;

        if (next >= targetSeconds && !isSuccess) {
          setIsSuccess(true);
        }
        return next;
      });
    };
    
    const intervalId = setInterval(calculateElapsed, 1000);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeSession, isDistracted, isPaused, onStopSession]);

  // Handle the Audio Siren and Application Title flashing when distracted
  useEffect(() => {
    let titleInterval;

    const startWarningAlarm = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const playBeep = () => {
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        const osc = audioCtxRef.current.createOscillator();
        const gainNode = audioCtxRef.current.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtxRef.current.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtxRef.current.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.5, audioCtxRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.5);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);
        
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.5);
      };

      playBeep(); // Trigger immediate beep
      beepIntervalRef.current = setInterval(playBeep, 2000); // Beep every 2 seconds
    };

    const startSuccessAlarm = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const playChime = () => {
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        const osc = audioCtxRef.current.createOscillator();
        const gainNode = audioCtxRef.current.createGain();
        osc.type = 'sine';
        
        // Happy arpeggio (C5 - E5 - G5)
        osc.frequency.setValueAtTime(523.25, audioCtxRef.current.currentTime); 
        osc.frequency.setValueAtTime(659.25, audioCtxRef.current.currentTime + 0.15); 
        osc.frequency.setValueAtTime(783.99, audioCtxRef.current.currentTime + 0.3); 
        
        gainNode.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtxRef.current.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 1.0);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);
        
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 1.0);
      };
      playChime();
      beepIntervalRef.current = setInterval(playChime, 3000);
    };

    if (isDistracted) {
      startWarningAlarm();
      let isWarning = true;
      titleInterval = setInterval(() => {
        document.title = isWarning ? "🚨 COME BACK TO STUDY! 🚨" : "🚨 DISTRACTION DETECTED 🚨";
        isWarning = !isWarning;
      }, 1000);
    } else if (isSuccess) {
      startSuccessAlarm();
      let isWarn = true;
      titleInterval = setInterval(() => {
        document.title = isWarn ? "🎉 SESSION COMPLETED! 🎉" : "Great Job!";
        isWarn = !isWarn;
      }, 1000);
    } else {
      stopAlarm();
      document.title = "Dynamic Learning Scheduler";
    }

    return () => {
      clearInterval(titleInterval);
      stopAlarm();
      document.title = "Dynamic Learning Scheduler";
    };
  }, [isDistracted, isSuccess]);

  if (!activeSession) return null;

  const targetSeconds = activeSession.sessionDurationMins * 60;
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleStop = () => {
    onStopSession(activeSession.taskId, elapsedSeconds);
  };

  if (isDistracted && !isSuccess) {
    return (
      <div className="glass-panel live-timer-container distraction-trap animate-fade-in">
        <div className="timer-header">
          <AlertTriangle size={36} className="text-high" style={{ margin: '0 auto 1rem auto' }}/>
          <h3 className="text-high">DISTRACTION DETECTED</h3>
          <p>You left the tab while in Strict Focus Lock mode. Your timer has been paused.</p>
        </div>
        <div className="timer-actions">
          <button className="btn btn-primary" onClick={() => setIsDistracted(false)}>
            I'm Back - Resume Session
          </button>
          <button className="btn btn-secondary" onClick={handleStop}>
            End Session Early
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="glass-panel live-timer-container success-trap animate-fade-in" style={{ borderColor: 'var(--priority-low)' }}>
        <div className="timer-header">
          <CheckCircle size={36} style={{ color: 'var(--priority-low)', margin: '0 auto 1rem auto' }}/>
          <h3 style={{ color: 'var(--priority-low)' }}>Session Completed &mdash; Incredible Job!</h3>
          <p>You successfully focused for {activeSession.sessionDurationMins} minutes. The completion alarm is ringing!</p>
        </div>
        <div className="timer-actions">
          <button className="btn btn-primary" onClick={() => onCompleteTask(activeSession.taskId, targetSeconds)}>
            Mark Topic Completely Done
          </button>
          <button className="btn btn-secondary" onClick={() => onStopSession(activeSession.taskId, targetSeconds)}>
            Save Time (Still working on it)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel live-timer-container animate-fade-in">
      <div className="timer-header">
        <span className="live-indicator">
          <Target size={12} style={{marginRight: 4}}/> 
          {activeSession.isStrictMode ? 'STRICT LOCK' : 'ACTIVE SESSION'}
        </span>
        <h3>{activeSession.task.subject} - {activeSession.task.topic}</h3>
        {activeSession.isStrictMode && (
          <p className="timer-rule">Do not change tabs!</p>
        )}
      </div>
      
      <div className="timer-display">
        {formatTime(remainingSeconds)}
      </div>

      <div className="timer-actions">
        <button 
          className="btn btn-primary stop-btn" 
          onClick={() => setIsPaused(!isPaused)} 
          title="Pause Timer"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {isPaused ? <Play size={18} /> : <Pause size={18} />}
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button 
          className="btn btn-secondary stop-btn" 
          onClick={handleStop} 
          title="End Session & Save Partial Time"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Square size={18} /> End
        </button>
      </div>
    </div>
  );
};

export default LiveTimer;
