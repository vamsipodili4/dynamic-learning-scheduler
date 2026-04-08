import React from 'react';
import { BookOpen, Zap, Compass } from 'lucide-react';
import './LandingPage.css';

const LandingPage = ({ onEnterApp }) => {
  return (
    <div className="landing-container animate-fade-in">
      <div className="landing-content">
        <div className="landing-icon-group" style={{ position: 'relative', display: 'inline-block', width: '80px', height: '80px', marginBottom: '2rem' }}>
          <BookOpen className="hero-icon" size={80} />
          <Zap className="hero-icon-accent" size={40} style={{ position: 'absolute', bottom: '-4px', right: '-12px' }} />
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
