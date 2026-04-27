import { useState } from 'react';
import { getSessions, saveSession, generateId, getPreSessionNote, savePreSessionNote } from './utils/storage';
import { runTiltCheck, analyzePatterns, calculateAccumulatedTilt } from './utils/tiltDetection';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import HomeScreen from './screens/HomeScreen';
import PreSessionScreen from './screens/PreSessionScreen';
import SessionScreen from './screens/SessionScreen';
import SessionHubScreen from './screens/SessionHubScreen';
import TiltCheckScreen from './screens/TiltCheckScreen';
import ResultScreen from './screens/ResultScreen';
import HistoryScreen from './screens/HistoryScreen';
import StatsScreen from './screens/StatsScreen';
import EndSessionScreen from './screens/EndSessionScreen';
import InsightsScreen from './screens/InsightsScreen';
import LearnScreen from './screens/LearnScreen';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [activeSession, setActiveSession] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [sessions, setSessions] = useState(() => getSessions());
  const [preSessionNote, setPreSessionNote] = useState(() => getPreSessionNote());

  const navigate = (to) => setScreen(to);

  const startSession = () => setScreen('session');
  const startCheckIn = () => setScreen('presession');

  const confirmStartSession = (preSessionState) => {
    const session = {
      id: generateId(),
      startTime: Date.now(),
      endTime: null,
      netBuyIns: 0,
      buyInsLost: 0,
      events: [],
      checks: [],
      preSessionState: preSessionState ?? null,
    };
    setActiveSession(session);
    saveSession(session);
    setScreen('session');
  };

  const logEvent = (type) => {
    setActiveSession(prev => {
      const updated = { ...prev, events: [...prev.events, { type, timestamp: Date.now() }] };
      saveSession(updated);
      return updated;
    });
  };

  const updateBuyIns = (delta) => {
    setActiveSession(prev => {
      const updated = {
        ...prev,
        netBuyIns: prev.netBuyIns + delta,
        buyInsLost: delta < 0 ? prev.buyInsLost + 1 : prev.buyInsLost,
      };
      saveSession(updated);
      return updated;
    });
  };

  const handleCheckComplete = (answers) => {
    const accumulatedTilt = calculateAccumulatedTilt(sessions);
    const result = runTiltCheck({ ...answers, session: activeSession, accumulatedTilt });
    const checkEntry = { timestamp: Date.now(), answers, result };
    setActiveSession(prev => {
      const updated = { ...prev, checks: [...prev.checks, checkEntry] };
      saveSession(updated);
      return updated;
    });
    setLastResult(result);
    setScreen('result');
  };

  const continueSession = () => setScreen('session');
  const requestEndSession = () => setScreen('endsession');

  const endSession = (sessionNote = '') => {
    const completed = { ...activeSession, endTime: Date.now(), sessionNote: sessionNote.trim() };
    saveSession(completed);
    setSessions(getSessions());
    setActiveSession(null);
    setLastResult(null);
    setScreen('insights');
  };

  const updateSessionNote = (sessionId, note) => {
    const target = sessions.find(s => s.id === sessionId);
    if (!target) return;
    const updated = { ...target, sessionNote: note.trim() };
    saveSession(updated);
    setSessions(getSessions());
  };

  const updatePreSessionNote = (note) => {
    setPreSessionNote(note);
    savePreSessionNote(note);
  };

  const patterns        = analyzePatterns(sessions);
  const accumulatedTilt = calculateAccumulatedTilt(sessions);

  const sharedProps = {
    sessions,
    activeSession,
    lastResult,
    navigate,
    startSession,
    startCheckIn,
    confirmStartSession,
    logEvent,
    updateBuyIns,
    handleCheckComplete,
    continueSession,
    requestEndSession,
    endSession,
    patterns,
    accumulatedTilt,
    preSessionNote,
    updatePreSessionNote,
  };

  return (
    <div className="app">
      <Sidebar
        screen={screen}
        navigate={navigate}
        hasActiveSession={!!activeSession}
        accumulatedTilt={accumulatedTilt}
        activeSession={activeSession}
      />

      <div className="main-content">
        {screen === 'home'       && <HomeScreen       {...sharedProps} />}
        {screen === 'presession' && (
          <PreSessionScreen
            onConfirm={confirmStartSession}
            onSkip={() => confirmStartSession(null)}
            preSessionNote={preSessionNote}
          />
        )}
        {screen === 'session'    && (
          activeSession
            ? <SessionScreen {...sharedProps} />
            : <SessionHubScreen
                sessions={sessions}
                preSessionNote={preSessionNote}
                updatePreSessionNote={updatePreSessionNote}
                startCheckIn={startCheckIn}
              />
        )}
        {screen === 'tiltcheck'  && <TiltCheckScreen  {...sharedProps} />}
        {screen === 'result'     && <ResultScreen     {...sharedProps} />}
        {screen === 'endsession' && (
          <EndSessionScreen
            onSaveAndEnd={(note) => endSession(note)}
            onSkip={() => endSession('')}
            onBack={() => setScreen(lastResult ? 'result' : 'session')}
          />
        )}
        {screen === 'insights'   && <InsightsScreen   {...sharedProps} updateSessionNote={updateSessionNote} />}
        {screen === 'learn'      && <LearnScreen      {...sharedProps} />}
        {screen === 'history'    && <HistoryScreen    {...sharedProps} />}
        {screen === 'stats'      && <StatsScreen      {...sharedProps} />}
      </div>

      <BottomNav screen={screen} navigate={navigate} hasActiveSession={!!activeSession} />
    </div>
  );
}
