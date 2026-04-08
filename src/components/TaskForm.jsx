import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { SUBJECT_TOPICS } from '../utils/resources';
import { getSuggestionForSubject } from '../utils/scheduler';
import './TaskForm.css';

const TaskForm = ({ onAddTask }) => {
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    priority: 'medium',
    estHours: 1,
    estMinutes: 0,
    deadline: ''
  });

  const [topicOptions, setTopicOptions] = useState([]);

  useEffect(() => {
    if (formData.subject && SUBJECT_TOPICS[formData.subject]) {
      setTopicOptions(SUBJECT_TOPICS[formData.subject]);
    } else {
      setTopicOptions([]);
    }
  }, [formData.subject]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.topic || !formData.deadline) return;

    // Convert explicit h/m to decimal
    const totalDecimalHours = Number(formData.estHours) + (Number(formData.estMinutes) / 60);

    onAddTask({
      ...formData,
      deadline: `${formData.deadline}T23:59:59`,
      estimatedHours: totalDecimalHours,
      originalEstimatedHours: totalDecimalHours // track original for stats
    });

    setFormData({
      subject: '',
      topic: '',
      priority: 'medium',
      estHours: 1,
      estMinutes: 0,
      deadline: ''
    });
  };

  return (
    <div className="glass-panel task-form-container animate-fade-in">
      <h2>Add New Task</h2>
      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group">
          <label htmlFor="subject">Subject</label>
          <input 
            type="text" 
            id="subject" 
            name="subject" 
            placeholder="e.g. Physics" 
            list="subject-suggestions"
            value={formData.subject}
            onChange={handleChange}
            required
            autoComplete="off"
          />
          <datalist id="subject-suggestions">
            {Object.keys(SUBJECT_TOPICS).map(sub => (
              <option key={sub} value={sub} />
            ))}
          </datalist>
        </div>

        <div className="form-group">
          <label htmlFor="topic">Topic</label>
          <input 
            type="text" 
            id="topic" 
            name="topic" 
            list="topic-suggestions"
            placeholder="e.g. Thermodynamics" 
            value={formData.topic}
            onChange={handleChange}
            required
            autoComplete="off"
          />
          <datalist id="topic-suggestions">
            {topicOptions.map(top => (
              <option key={top} value={top} />
            ))}
          </datalist>
        </div>

        <div className="form-row">
          <div className="form-group flex-1">
            <label htmlFor="priority">Priority</label>
            <select 
              id="priority" 
              name="priority" 
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="form-group flex-1">
            <label htmlFor="estHours">Time: Hours</label>
            <input 
              type="number" 
              id="estHours" 
              name="estHours" 
              min="0"
              max="24"
              value={formData.estHours}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group flex-1">
            <label htmlFor="estMinutes">Time: Mins</label>
            <input 
              type="number" 
              id="estMinutes" 
              name="estMinutes" 
              list="minute-options"
              min="0"
              max="59"
              value={formData.estMinutes}
              onChange={handleChange}
              placeholder="e.g., 15"
            />
            <datalist id="minute-options">
              <option value="0" />
              <option value="10" />
              <option value="15" />
              <option value="20" />
              <option value="25" />
              <option value="30" />
              <option value="45" />
            </datalist>
          </div>
        </div>

        {(() => {
           const totalDecimalHours = Number(formData.estHours) + (Number(formData.estMinutes) / 60);
           const suggestion = getSuggestionForSubject(formData.subject, totalDecimalHours);
           if (suggestion) {
             return (
               <div className={`smart-tip-box tip-${suggestion.type} animate-fade-in`}>
                 {suggestion.text}
               </div>
             );
           }
           return null;
        })()}

        <div className="form-group">
          <label htmlFor="deadline">Deadline / Exam Date</label>
          <input 
            type="date" 
            id="deadline" 
            name="deadline" 
            value={formData.deadline}
            onChange={handleChange}
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <button type="submit" className="btn btn-primary submit-btn">
          <Plus size={20} /> Add Task
        </button>
      </form>
    </div>
  );
};

export default TaskForm;
