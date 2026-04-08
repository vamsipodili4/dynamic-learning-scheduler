import React, { useState, useEffect } from 'react';
import { Lock, Unlock, HelpCircle, ArrowRight, Lightbulb } from 'lucide-react';
import './WordPuzzleGame.css';

const PUZZLES = {
  easy: [
    { word: "ATOM", hint: "Basic unit of matter", fact: "Did you know? An atom is 99.999% empty space!" },
    { word: "CELL", hint: "Basic unit of life", fact: "Did you know? There are about 30 trillion cells in the human body." },
    { word: "DATA", hint: "Facts collected for reference", fact: "Did you know? Over 2.5 quintillion bytes of data are created every single day!" }
  ],
  moderate: [
    { word: "GRAVITY", hint: "Force that attracts a body toward the center", fact: "Did you know? Jupiter's gravity is 2.4 times stronger than Earth's!" },
    { word: "PYTHON", hint: "A popular programming language", fact: "Did you know? Python was named after the British comedy group Monty Python, not the snake!" },
    { word: "KINETIC", hint: "Energy of motion", fact: "Did you know? The word kinetic comes from the Greek word 'kinesis', meaning motion." }
  ],
  hard: [
    { word: "PHOTOSYNTHESIS", hint: "Process by which plants make food", fact: "Did you know? Photosynthesis is responsible for almost all the oxygen in our atmosphere!" },
    { word: "THERMODYNAMICS", hint: "Relations between heat and other forms of energy", fact: "Did you know? The first law of thermodynamics states energy cannot be created or destroyed." },
    { word: "CRYPTOGRAPHY", hint: "The art of writing or solving codes", fact: "Did you know? The Enigma machine was one of the most complex cryptographic devices used in WWII." }
  ]
};

const LEVELS = {
  easy: { cost: 0, label: "Easy" },
  moderate: { cost: 300, label: "Moderate" },
  hard: { cost: 800, label: "Hard" }
};

const WordPuzzleGame = ({ availableXP, onSpendXP }) => {
  const [unlockedLevels, setUnlockedLevels] = useState(['easy']);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [userGuess, setUserGuess] = useState([]);
  const [puzzleState, setPuzzleState] = useState(null); // { original, hiddenIndices }
  const [gameState, setGameState] = useState('menu'); // menu, playing, won
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // load unlocks from local storage
    const savedUnlocks = localStorage.getItem('unlockedPuzzleLevels');
    if (savedUnlocks) {
      setUnlockedLevels(JSON.parse(savedUnlocks));
    }
  }, []);

  const saveUnlocks = (newUnlocks) => {
    setUnlockedLevels(newUnlocks);
    localStorage.setItem('unlockedPuzzleLevels', JSON.stringify(newUnlocks));
  };

  const handleUnlockLevel = (levelKey) => {
    if (unlockedLevels.includes(levelKey)) return;
    const cost = LEVELS[levelKey].cost;
    if (availableXP >= cost) {
      onSpendXP(cost);
      saveUnlocks([...unlockedLevels, levelKey]);
      setErrorMsg('');
    } else {
      setErrorMsg(`Not enough XP to unlock ${LEVELS[levelKey].label}. You need ${cost} XP.`);
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  const startPuzzle = (levelKey) => {
    const puzzleList = PUZZLES[levelKey];
    // Pick random puzzle from level
    const randIdx = Math.floor(Math.random() * puzzleList.length);
    const puzzle = puzzleList[randIdx];
    
    // Hide roughly 40% of the letters
    const numToHide = Math.max(1, Math.floor(puzzle.word.length * 0.4));
    
    let hidden = new Set();
    while(hidden.size < numToHide) {
      hidden.add(Math.floor(Math.random() * puzzle.word.length));
    }

    setPuzzleState({
      original: puzzle.word,
      hiddenIndices: hidden,
      hint: puzzle.hint,
      fact: puzzle.fact
    });
    
    const initialGuess = Array(puzzle.word.length).fill('');
    for (let i=0; i<puzzle.word.length; i++) {
       if (!hidden.has(i)) initialGuess[i] = puzzle.word[i];
    }
    
    setUserGuess(initialGuess);
    setCurrentLevel(levelKey);
    setGameState('playing');
    setCurrentPuzzleIndex(randIdx);
  };

  const handleInput = (index, value) => {
    if (!puzzleState.hiddenIndices.has(index)) return;
    const newGuess = [...userGuess];
    newGuess[index] = value.toUpperCase().slice(-1);
    setUserGuess(newGuess);

    // Check win condition
    if (newGuess.join('') === puzzleState.original) {
      setTimeout(() => setGameState('won'), 300);
    }
  };

  if (gameState === 'menu') {
    return (
      <div className="puzzle-container">
        <h3 className="puzzle-title">🧠 Mind Games Station</h3>
        <p className="puzzle-subtitle">Play educational minigames to test your wit. Unlock higher difficulties with XP!</p>
        
        {errorMsg && <div className="puzzle-error">{errorMsg}</div>}
        
        <div className="level-cards">
          {Object.keys(LEVELS).map(lk => {
            const isUnlocked = unlockedLevels.includes(lk);
            return (
              <div key={lk} className={`level-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                <div className="lc-header">
                  {isUnlocked ? <Unlock size={20} className="text-low" /> : <Lock size={20} className="text-muted" />}
                  <h4>{LEVELS[lk].label}</h4>
                </div>
                {!isUnlocked ? (
                  <button className="btn btn-secondary unlock-btn" onClick={() => handleUnlockLevel(lk)}>
                    Unlock (-{LEVELS[lk].cost} XP)
                  </button>
                ) : (
                  <button className="btn btn-primary start-btn" onClick={() => startPuzzle(lk)}>
                    Play Level
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && puzzleState) {
    return (
      <div className="puzzle-container playing-mode">
        <div className="puzzle-header">
          <h3>Word Puzzle: {LEVELS[currentLevel].label}</h3>
          <button className="btn btn-secondary text-sm" onClick={() => setGameState('menu')}>Back to Menu</button>
        </div>
        
        <div className="puzzle-hint-box">
          <HelpCircle size={18} className="text-cyan" />
          <span><strong>Hint:</strong> {puzzleState.hint}</span>
        </div>

        <div className="word-slots">
          {userGuess.map((char, idx) => (
            <input
              key={idx}
              type="text"
              value={char}
              className={`char-slot ${!puzzleState.hiddenIndices.has(idx) ? 'fixed-char' : 'guess-char'}`}
              readOnly={!puzzleState.hiddenIndices.has(idx)}
              onChange={(e) => handleInput(idx, e.target.value)}
              maxLength={1}
            />
          ))}
        </div>
      </div>
    );
  }

  if (gameState === 'won' && puzzleState) {
    return (
      <div className="puzzle-container won-mode">
        <h2 className="text-low" style={{ marginBottom: "0.5rem" }}>Brilliant! 🎉</h2>
        <p style={{ fontSize: "1.2rem", letterSpacing: "2px" }}><strong>{puzzleState.original}</strong></p>
        
        <div className="fact-box">
          <Lightbulb size={24} className="text-cyan" style={{ shrink: 0, marginTop: "4px" }} />
          <div>{puzzleState.fact}</div>
        </div>

        <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => setGameState('menu')}>
          Play Another <ArrowRight size={18}/>
        </button>
      </div>
    );
  }

  return null;
};

export default WordPuzzleGame;
