import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Timetable from './components/Timetable';
import TaskForm from './components/TaskForm';
import LiveTimer from './components/LiveTimer';
import Reminders from './components/Reminders';
import Progress from './components/Progress';
import LandingPage from './components/LandingPage';
import SetupWizard from './components/SetupWizard';
import InsightsPanel from './components/InsightsPanel';
import FreeSlotMap from './components/FreeSlotMap';
import Cursor from './components/Cursor';
import { generateSchedule, updateActivityModifier } from './utils/scheduler';
import { BookOpen, LayoutDashboard, Target, Upload, X, Menu, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { saveStudyMaterial, getStudyMaterialsIndex, loadStudyMaterialUrl, deleteStudyMaterial } from './utils/storage';
import AIChat from './components/AIChat';
import { MessageCircle } from 'lucide-react';
import './App.css';

function App() {
  // Views: 'landing' | 'setup' | 'main' | 'progress'
  const [currentView, setCurrentView] = useState('landing');
  const [studyFileUrl, setStudyFileUrl] = useState(null);
  const [uploadedFilesCache, setUploadedFilesCache] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isViewerMaximized, setIsViewerMaximized] = useState(false);
  const [isViewerMinimized, setIsViewerMinimized] = useState(false);
  
  // Global Study Constraints
  const [studySettings, setStudySettings] = useState({ startHour: 8, dailyHours: 14 }); // Default 8am to 10pm

  // Main State for all tasks
  const [tasks, setTasks] = useState([]);
  
  // Derived state for the generated schedule
  const [schedule, setSchedule] = useState([]);

  // Preserve ongoing timers if users switch away
  const [taskSessions, setTaskSessions] = useState({});

  // Active Session State
  const [activeSession, setActiveSession] = useState(null);
  
  // AI Chat state
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // When tasks change, or time ticks forward, regenerate the schedule
  useEffect(() => {
    const updateSchedule = () => {
      if (tasks.length > 0) {
        const newSchedule = generateSchedule(tasks, studySettings.dailyHours, studySettings.startHour);
        setSchedule(newSchedule);
      } else {
        setSchedule([]);
      }
    };

    // Initial update
    updateSchedule();

    // Check every minute to keep schedule locked to real time
    const intervalId = setInterval(updateSchedule, 60000);

    return () => clearInterval(intervalId);
  }, [tasks, studySettings]);

  // Load uploaded files list from IndexedDB on component mount
  useEffect(() => {
    getStudyMaterialsIndex().then(index => setUploadedFilesCache(index));
  }, []);

  const handleAddTask = (newTask) => {
    const taskToAdd = {
      ...newTask,
      id: Date.now().toString(), // Simple unique ID
      status: 'pending'
    };
    setTasks(prev => [...prev, taskToAdd]);
  };

  const handleClaimSlot = ({ dateStr, startHour, subject }) => {
    const fixedTask = {
      id: Date.now().toString(),
      subject: subject,
      topic: 'Manual Allocation',
      estimatedHours: 1, // Pre-determined fixed 1h block
      originalEstimatedHours: 1,
      priority: 'high',
      status: 'pending',
      deadline: new Date(new Date().getTime() + 86400000).toISOString(),
      isFixed: true,
      fixedDateStr: dateStr,
      fixedStartHour: startHour
    };
    setTasks(prev => [...prev, fixedTask]);
  };

  const handleUpdateTaskStatus = (taskId, newStatus) => {
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    );
  };

  const handleStartSession = (taskId, sessionDurationMins, isStrictMode) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setActiveSession({
        sessionId: Date.now(),
        taskId,
        task,
        startTime: new Date(),
        sessionDurationMins: sessionDurationMins || task.estimatedHours * 60,
        isStrictMode: !!isStrictMode,
        startingElapsed: taskSessions[taskId] || 0
      });
    }
  };

  const handleTimerTick = (taskId, currentElapsed) => {
    setTaskSessions(prev => ({ ...prev, [taskId]: currentElapsed }));
  };

  const handleStopSession = (taskId, elapsedSeconds) => {
    setActiveSession(null);

    // Clear the preserved timer memory so it fully commits
    setTaskSessions(prev => {
      const updated = { ...prev };
      delete updated[taskId];
      return updated;
    });

    setTasks(prev => 
      prev.map(t => {
        if (t.id === taskId) {
          // Subtract elapsed hours from estimated hours
          const elapsedHours = elapsedSeconds / 3600;
          const newEstimatedHours = Math.max(0, t.estimatedHours - elapsedHours);
          return { ...t, estimatedHours: newEstimatedHours };
        }
        return t;
      })
    );
  };

  const handleCompleteTask = (taskId, elapsedSeconds) => {
    let remainingMins = 0;
    let wasStrict = false;
    
    if (activeSession && activeSession.taskId === taskId) {
      remainingMins = activeSession.sessionDurationMins - (elapsedSeconds / 60);
      wasStrict = activeSession.isStrictMode;
    }

    setTaskSessions(prev => {
      const updated = { ...prev };
      delete updated[taskId];
      return updated;
    });

    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          // Calculate velocity if making it entirely complete
          const totalElapsedHours = (elapsedSeconds / 3600);
          const originallyEstimated = t.originalEstimatedHours;
          const actualTimeSpent = originallyEstimated - t.estimatedHours + totalElapsedHours;
          
          updateActivityModifier(t.subject, originallyEstimated, actualTimeSpent);
          
          return { ...t, status: 'completed', estimatedHours: 0 };
        }
        return t;
      })
    );

    // Continuous Focus Chaining (Session Carryover)
    // If the user finished early and still has 5+ minutes of momentum, wrap them into next task
    if (remainingMins >= 5) {
      const nextScheduledBlock = schedule.find(s => s.status === 'pending' && s.taskId !== taskId && s.status !== 'completed');
      if (nextScheduledBlock) {
         const nextTaskObj = tasks.find(t => t.id === nextScheduledBlock.taskId);
         if (nextTaskObj) {
            setActiveSession({
              sessionId: Date.now(),
              taskId: nextTaskObj.id,
              task: nextTaskObj,
              startTime: new Date(),
              sessionDurationMins: remainingMins, // DOCK the remaining momentum only
              isStrictMode: wasStrict,
              startingElapsed: 0
            });
            return; // Gracefully exit and allow the continuous chain!
         }
      }
    }

    setActiveSession(null);
  };

  useEffect(() => {
    if (currentView === 'main' || currentView === 'progress') {
      document.body.classList.add('theme-light-brown');
    } else {
      document.body.classList.remove('theme-light-brown');
    }
  }, [currentView]);

  const handleCompleteSetup = (config) => {
    // config contains startHour, endHour, and initialTasks
    const dHours = config.endHour > config.startHour ? config.endHour - config.startHour : 24 - config.startHour + config.endHour;
    
    setStudySettings({
      startHour: config.startHour,
      dailyHours: dHours
    });
    
    setTasks(config.initialTasks);
    setCurrentView('main');
  };

  if (currentView === 'landing') {
    return (
      <>
        <Cursor />
        <LandingPage onEnterApp={() => setCurrentView('setup')} />
      </>
    );
  }

  if (currentView === 'setup') {
    return (
      <>
        <Cursor />
        <SetupWizard onCompleteSetup={handleCompleteSetup} />
      </>
    );
  }

  return (
    <div className="app-main">
      <Cursor />
      <header className="app-header animate-fade-in" style={{ position: 'relative', zIndex: 9999 }}>
        <div className="logo-container">
          <BookOpen className="logo-icon" size={32} />
          <h1>Dynamic Learning Scheduler</h1>
        </div>
        <p>Your adaptive, intelligent study dashboard.</p>
        
        <nav className="top-nav">
          <button 
            className={`nav-btn ${currentView === 'main' ? 'active' : ''}`}
            onClick={() => setCurrentView('main')}
          >
            <LayoutDashboard size={18} /> Schedule
          </button>
          <button 
            className={`nav-btn ${currentView === 'progress' ? 'active' : ''}`}
            onClick={() => setCurrentView('progress')}
          >
            <Target size={18} /> Progress & Stats
          </button>
          
          <label className="nav-btn file-upload-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}>
            <Upload size={18} /> Upload Study Material
            <input 
              type="file" 
              style={{ display: 'none' }} 
              accept="application/pdf, text/plain, image/*" 
              onChange={async (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                  await saveStudyMaterial(file);
                  const updatedList = await getStudyMaterialsIndex();
                  setUploadedFilesCache(updatedList);
                  
                  // Auto-open it as well
                  const url = await loadStudyMaterialUrl(updatedList[0].id);
                  setStudyFileUrl(url);
                  setIsMenuOpen(false); // Close menu if open
                }
              }}
            />
          </label>
          <button 
            className="nav-btn" 
            title="File Repository" 
            style={{ display: 'flex', alignItems: 'center', background: isMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu size={20} />
          </button>
          
          {isMenuOpen && (
            <div className="glass-panel animate-fade-in" style={{ position: 'absolute', top: '70px', right: '1rem', width: '300px', zIndex: 1000, padding: '1rem', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Uploaded Files</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Saved Offline</span>
              </div>
              
              {uploadedFilesCache.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>No files saved yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'scroll', paddingRight: '0.5rem' }}>
                  {uploadedFilesCache.map(file => (
                    <div key={file.id} className="file-item hover-bg" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)', padding: '0.75rem', borderRadius: '0.5rem', transition: 'background 0.2s' }}>
                      <span 
                         style={{ cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem' }}
                         title="Click to Read"
                         onClick={async () => {
                           const url = await loadStudyMaterialUrl(file.id);
                           setStudyFileUrl(url);
                           setIsMenuOpen(false);
                         }}
                      >
                        {file.name}
                      </span>
                      <button 
                        onClick={async (e) => {
                           e.stopPropagation(); // prevent opening
                           const updated = await deleteStudyMaterial(file.id);
                           setUploadedFilesCache(updated);
                           // If they deleted the currently viewing file, close the active viewer!
                           if (studyFileUrl && updated.findIndex(f => f.id === file.id) === -1) {
                             setStudyFileUrl(null);
                           }
                        }}
                        style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', marginLeft: '0.5rem', padding: '0.4rem', borderRadius: '4px', display: 'flex' }}
                        title="Delete File Permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </header>

      {currentView === 'main' && (
        <>
          <Reminders tasks={tasks} activeSession={activeSession} />
          <main className="app-content">
            <div className="left-column">
              <TaskForm onAddTask={handleAddTask} />
            </div>
            
            <div className="center-column">
              <LiveTimer 
                key={activeSession?.sessionId || 'none'}
                activeSession={activeSession} 
                onStopSession={handleStopSession}
                onCompleteTask={handleCompleteTask}
                onTick={handleTimerTick}
              />

              {studyFileUrl && !isViewerMinimized && (
                <div className={`glass-panel animate-fade-in ${isViewerMaximized ? 'viewer-maximized' : ''}`} style={
                  isViewerMaximized ? {
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10000, padding: 0, margin: 0, borderRadius: 0
                  } : { padding: 0, height: '70vh', overflow: 'hidden', position: 'relative' }
                }>
                  <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
                    <button 
                      onClick={() => setIsViewerMinimized(true)} 
                      style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', display: 'flex' }}
                      title="Minimize"
                    >
                      <Minimize2 size={16} />
                    </button>
                    <button 
                      onClick={() => setIsViewerMaximized(!isViewerMaximized)} 
                      style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', display: 'flex' }}
                      title={isViewerMaximized ? "Restore" : "Maximize"}
                    >
                      {isViewerMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button 
                      onClick={() => { setStudyFileUrl(null); setIsViewerMaximized(false); }} 
                      style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', display: 'flex' }}
                      title="Close File"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <iframe 
                    src={studyFileUrl} 
                    style={{ width: '100%', height: '100%', border: 'none' }} 
                    title="Native Study Material Viewer" 
                  />
                </div>
              )}
              {studyFileUrl && isViewerMinimized && (
                <div className="glass-panel animate-fade-in" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-cyan)', color: 'black' }}>
                  <span style={{ fontWeight: 'bold' }}>📄 Document Viewer Minimised</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setIsViewerMinimized(false)} style={{ padding: '0.25rem 0.75rem', background: 'white', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Restore</button>
                    <button onClick={() => setStudyFileUrl(null)} style={{ padding: '0.25rem 0.75rem', background: 'rgba(0,0,0,0.2)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                  </div>
                </div>
              )}

              <div className="glass-panel schedule-panel">
                <div className="schedule-header">
                  <h2>Adaptive Schedule</h2>
                </div>
                <Timetable 
                  schedule={schedule} 
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onStartSession={handleStartSession}
                  activeSessionTaskId={activeSession?.taskId}
                />
              </div>
            </div>

            <div className="right-insights-column">
              <InsightsPanel tasks={tasks} schedule={schedule} />
              <FreeSlotMap schedule={schedule} onClaimSlot={handleClaimSlot} />
            </div>
          </main>
        </>
      )}

      {currentView === 'progress' && (
        <Progress tasks={tasks} />
      )}
      
      {/* AI Study Assistant */}
      {isAIChatOpen && (
        <AIChat 
          tasks={tasks} 
          uploadedFiles={uploadedFilesCache} 
          studyFileUrl={studyFileUrl}
          onClose={() => setIsAIChatOpen(false)}
        />
      )}
      
      {/* AI Chat Toggle Button */}
      <button className="ai-fab" onClick={() => setIsAIChatOpen(!isAIChatOpen)} title="AI Study Helper" style={{ padding: 0, overflow: 'hidden' }}>
        <img src="/adaptai_logo.png" alt="AdaptAI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </button>
    </div>
  );
}

export default App;
