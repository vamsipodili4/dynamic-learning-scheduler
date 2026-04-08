import React from 'react';
import { BookOpen, Zap, Compass } from 'lucide-react';
import './LandingPage.css';

const LandingPage = ({ onEnterApp }) => {
  return (
    <div className="landing-container animate-fade-in">
      <div className="landing-content">
        <div className="landing-icon-group">
          <BookOpen className="hero-icon" size={64} />
          <Zap className="hero-icon-accent" size={48} />
        </div>
        
        <h1 className="hero-title">Dynamic Learning Scheduler</h1>
        <p className="hero-subtitle">
          An adaptive, intelligent study assistant that automatically manages your workflow, tracks your performance, and calculates your free time.
        </p>

        <button className="btn btn-hero" onClick={onEnterApp}>
          Let's Study <Compass size={20} style={{ marginLeft: '10px' }} />
        </button>
      </div>

      <div className="blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
    </div>
  );
};

export default LandingPage;
