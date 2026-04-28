import { useEffect, useState } from 'react';
import { runTiltCheck, analyzePatterns, calculateAccumulatedTilt } from './utils/tiltDetection';
import { getCurrentSession, getCurrentUser, onAuthStateChange, signOut } from './services/authService';
import { createSession, deleteSessionById, fetchMySessions, updateSession } from './services/sessionsService';
import { getMySettings, upsertMySettings } from './services/settingsService';
import { getMonetizationState, updateMonetizationState } from './services/monetizationService';
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
import AuthScreen from './screens/AuthScreen';
import ProfileScreen from './screens/ProfileScreen';
import PaywallScreen from './screens/PaywallScreen';
import TiltProfileScreen from './screens/TiltProfileScreen';
import TiltProfileReportScreen from './screens/TiltProfileReportScreen';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('home');
  const [activeSession, setActiveSession] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [preSessionNote, setPreSessionNote] = useState('');
  const [theme, setTheme] = useState('dark');
  const [authPrompt, setAuthPrompt] = useState('');
  const [appNotice, setAppNotice] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [hasPremium, setHasPremium] = useState(false);
  const [tiltProfileInput, setTiltProfileInput] = useState(null);
  const [tiltProfileReport, setTiltProfileReport] = useState(null);
  const [paywallContext, setPaywallContext] = useState('premium');
  const [paywallReturnScreen, setPaywallReturnScreen] = useState('home');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const session = await getCurrentSession();
      const currentUser = session?.user ?? (await getCurrentUser());
      if (!mounted) return;
      setUser(currentUser || null);
      setAuthReady(true);
    })().catch(() => {
      if (!mounted) return;
      setUser(null);
      setAuthReady(true);
    });

    const sub = onAuthStateChange((session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const isMobileViewport = () => window.matchMedia('(max-width: 1023px)').matches;
    const isEditable = (el) => {
      if (!el) return false;
      if (el instanceof HTMLTextAreaElement) return true;
      if (el instanceof HTMLInputElement) {
        const type = (el.type || 'text').toLowerCase();
        return !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'file', 'color'].includes(type);
      }
      if (el instanceof HTMLSelectElement) return true;
      if (el instanceof HTMLElement && el.isContentEditable) return true;
      return false;
    };

    let rafId = 0;
    let settleTimer = 0;
    const appEl = document.querySelector('.app');

    const updateKeyboardState = () => {
      if (!isMobileViewport()) {
        setKeyboardOpen(false);
        appEl?.classList.remove('keyboard-open');
        return;
      }
      const vv = window.visualViewport;
      const viewportHeight = vv?.height || window.innerHeight;
      const baseHeight = window.innerHeight;
      const open = baseHeight - viewportHeight > 140;
      setKeyboardOpen(open);
      if (open) appEl?.classList.add('keyboard-open');
      else appEl?.classList.remove('keyboard-open');
    };

    const nudgeFocusedInput = () => {
      if (!isMobileViewport()) return;
      const active = document.activeElement;
      if (!isEditable(active)) return;
      if (!(active instanceof HTMLElement)) return;
      active.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    };

    const scheduleNudge = () => {
      window.clearTimeout(settleTimer);
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        nudgeFocusedInput();
        settleTimer = window.setTimeout(nudgeFocusedInput, 180);
      });
    };

    const onFocusIn = () => {
      updateKeyboardState();
      scheduleNudge();
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        updateKeyboardState();
      }, 120);
    };

    const onViewportChange = () => {
      updateKeyboardState();
      scheduleNudge();
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('scroll', onViewportChange);
    updateKeyboardState();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.clearTimeout(settleTimer);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('scroll', onViewportChange);
      appEl?.classList.remove('keyboard-open');
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setSessions([]);
      setPreSessionNote('');
      setTheme('dark');
      setActiveSession(null);
      setLastResult(null);
      setHasPremium(false);
      setTiltProfileInput(null);
      setTiltProfileReport(null);
      if (screen === 'profile') setScreen('home');
      return;
    }
    fetchMySessions()
      .then((fetched) => {
        setSessions(fetched);
        const current = fetched.find((s) => s.status === 'current' || !s.endTime) || null;
        setActiveSession(current);
        if (current) {
          setScreen('session');
        }
      })
      .catch(() => {
        setSessions([]);
        setActiveSession(null);
      });
    getMySettings()
      .then((settings) => {
        setPreSessionNote(settings?.pre_session_note || '');
        setTheme(settings?.theme === 'light' ? 'light' : 'dark');
      })
      .catch(() => {
        setPreSessionNote('');
        setTheme('dark');
      });
    const monetization = getMonetizationState(user.id);
    setHasPremium(Boolean(monetization.premium));
    setTiltProfileInput(monetization.tiltProfileInput || null);
    setTiltProfileReport(monetization.tiltProfileReport || null);
    setLastResult(null);
    if (screen === 'auth') setScreen('home');
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (tiltProfileInput) return;
    if (activeSession) return;
    if (screen === 'home' || screen === 'auth') {
      setScreen('tiltprofile');
    }
  }, [user?.id, tiltProfileInput, activeSession, screen]);

  useEffect(() => {
    if (!user?.id) return;
    if (screen !== 'tiltprofile') return;
    if (tiltProfileInput && tiltProfileReport) {
      setScreen('tiltprofile-report');
    }
  }, [user?.id, screen, tiltProfileInput, tiltProfileReport]);

  const requireAuth = (message = 'Please log in or create an account to continue.') => {
    if (user?.id) return true;
    setAuthPrompt(message);
    setScreen('auth');
    return false;
  };

  const notify = (message) => {
    setAppNotice(message);
  };

  const navigate = (to) => {
    if (to === 'profile' && !user?.id) {
      setAuthPrompt('Create an account to access your profile and settings.');
      setScreen('auth');
      return;
    }
    if (to === 'tiltprofile') {
      if (!user?.id) {
        setAuthPrompt('Create an account to build your tilt profile.');
        setScreen('auth');
        return;
      }
      if (tiltProfileInput && tiltProfileReport) {
        setScreen('tiltprofile-report');
        return;
      }
      setScreen('tiltprofile');
      return;
    }
    setScreen(to);
  };

  const openPaywall = (context = 'premium', returnScreen = screen) => {
    setPaywallContext(context);
    setPaywallReturnScreen(returnScreen);
    setScreen('paywall');
  };

  const activatePremium = () => {
    if (!user?.id) {
      setAuthPrompt('Create an account to activate premium.');
      setScreen('auth');
      return;
    }
    const next = updateMonetizationState(user.id, { premium: true });
    setHasPremium(Boolean(next.premium));
    setScreen(paywallReturnScreen || 'home');
    notify('Premium unlocked. You now have full access.');
  };

  const startSession = () => {
    if (!requireAuth('Create an account to start sessions and save your progress.')) return;
    setScreen('session');
  };
  const startCheckIn = () => {
    if (!requireAuth('Create an account to start sessions and save your progress.')) return;
    setScreen('presession');
  };

  const confirmStartSession = (preSessionState) => {
    if (!requireAuth('Create an account to start a session.')) return;
    const draft = {
      startTime: Date.now(),
      endTime: null,
      status: 'current',
      netBuyIns: 0,
      buyInsLost: 0,
      events: [],
      checks: [],
      preSessionState: preSessionState ?? null,
    };
    createSession(draft)
      .then((created) => {
        setActiveSession(created);
        setSessions(prev => [created, ...prev]);
        setScreen('session');
      })
      .catch(() => {
        notify('Could not start session. Check connection and try again.');
      });
  };

  const logEvent = async (type, note = '') => {
    if (!requireAuth('Create an account to save session events.')) return;
    if (!activeSession) return;
    const updated = {
      ...activeSession,
      events: [...activeSession.events, { type, timestamp: Date.now(), note: String(note || '').trim().slice(0, 200) }],
    };
    try {
      const saved = await updateSession(updated);
      setActiveSession(saved);
      setSessions((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    } catch (_err) {
      notify('Could not save event. Please retry.');
    }
  };

  const editEvent = async (eventIndex, patch) => {
    if (!requireAuth('Create an account to edit session events.')) return;
    if (!activeSession) return;
    const nextEvents = activeSession.events.map((ev, idx) => (
      idx === eventIndex
        ? {
            ...ev,
            ...(patch?.type ? { type: patch.type } : {}),
            ...(typeof patch?.note === 'string' ? { note: patch.note.trim().slice(0, 200) } : {}),
          }
        : ev
    ));
    const updated = { ...activeSession, events: nextEvents };
    try {
      const saved = await updateSession(updated);
      setActiveSession(saved);
      setSessions((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    } catch (_err) {
      notify('Could not update event. Please retry.');
    }
  };

  const deleteEvent = async (eventIndex) => {
    if (!requireAuth('Create an account to edit session events.')) return;
    if (!activeSession) return;
    const nextEvents = activeSession.events.filter((_, idx) => idx !== eventIndex);
    const updated = { ...activeSession, events: nextEvents };
    try {
      const saved = await updateSession(updated);
      setActiveSession(saved);
      setSessions((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    } catch (_err) {
      notify('Could not delete event. Please retry.');
    }
  };

  const updateBuyIns = (delta) => {
    if (!requireAuth('Create an account to save session changes.')) return;
    setActiveSession(prev => {
      if (!prev) return prev;
      const nextNet = prev.netBuyIns + delta;
      const updated = {
        ...prev,
        netBuyIns: nextNet,
        buyInsLost: Math.max(0, -nextNet),
      };
      updateSession(updated).catch(() => notify('Could not save buy-in change. Please retry.'));
      return updated;
    });
  };

  const handleCheckComplete = (answers) => {
    if (!hasPremium) {
      openPaywall('tilt_check', 'session');
      return;
    }
    if (!requireAuth('Create an account to save check-ins.')) return;
    const accumulatedTilt = calculateAccumulatedTilt(sessions);
    const result = runTiltCheck({ ...answers, session: activeSession, accumulatedTilt, tiltProfile: tiltProfileReport });
    const checkEntry = { timestamp: Date.now(), answers, result };
    setActiveSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, checks: [...prev.checks, checkEntry] };
      updateSession(updated).catch(() => notify('Check-in result could not be saved.'));
      return updated;
    });
    setLastResult(result);
    setScreen('result');
  };

  const continueSession = () => setScreen('session');
  const requestEndSession = () => setScreen('endsession');
  const requestTiltCheck = () => {
    if (!hasPremium) {
      openPaywall('tilt_check', 'session');
      return;
    }
    setScreen('tiltcheck');
  };

  const endSession = (sessionNote = '') => {
    if (!requireAuth('Create an account to save session notes and history.')) return;
    const completed = { ...activeSession, endTime: Date.now(), status: 'old', sessionNote: sessionNote.trim() };
    updateSession(completed)
      .then((saved) => {
        setSessions(prev => prev.map(s => (s.id === saved.id ? saved : s)));
      })
      .catch(() => notify('Session ended locally, but cloud save failed. Retry from Insights.'));
    setActiveSession(null);
    setLastResult(null);
    setScreen('insights');
  };

  const updateSessionNote = (sessionId, note) => {
    if (!requireAuth('Create an account to save session notes.')) return;
    const target = sessions.find(s => s.id === sessionId);
    if (!target) return;
    const updated = { ...target, sessionNote: note.trim() };
    setSessions(prev => prev.map(s => (s.id === sessionId ? updated : s)));
    updateSession(updated).catch(async () => {
      notify('Could not save note. Restoring latest cloud data.');
      const fresh = await fetchMySessions().catch(() => []);
      setSessions(fresh);
    });
  };

  const deleteSession = async (sessionId) => {
    if (!requireAuth('Create an account to manage session history.')) return;
    const previousSessions = sessions;
    const wasActive = activeSession?.id === sessionId;

    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (wasActive) setActiveSession(null);

    try {
      await deleteSessionById(sessionId);
    } catch (_err) {
      setSessions(previousSessions);
      if (wasActive) {
        const restored = previousSessions.find((s) => s.id === sessionId) || null;
        setActiveSession(restored);
      }
      notify('Could not delete session. Please retry.');
    }
  };

  const updatePreSessionNote = (note) => {
    if (!requireAuth('Create an account to save your pre-session note.')) return;
    setPreSessionNote(note);
    upsertMySettings({ pre_session_note: note }).catch(() => notify('Could not save pre-session note. Please retry.'));
  };

  const updateTheme = (nextTheme) => {
    if (!requireAuth('Create an account to save theme settings.')) return;
    const normalized = nextTheme === 'light' ? 'light' : 'dark';
    const previous = theme;
    setTheme(normalized);
    upsertMySettings({ theme: normalized }).catch(() => {
      setTheme(previous);
      notify('Could not save theme preference. Reverted to previous setting.');
    });
  };

  const saveTiltProfile = (input, report) => {
    if (!requireAuth('Create an account to save your tilt profile.')) return;
    const next = updateMonetizationState(user.id, {
      tiltProfileInput: input,
      tiltProfileReport: report,
    });
    setTiltProfileInput(next.tiltProfileInput || null);
    setTiltProfileReport(next.tiltProfileReport || null);
  };

  const handleSignOut = async () => {
    await signOut();
    setScreen('home');
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
    editEvent,
    deleteEvent,
    updateBuyIns,
    handleCheckComplete,
    requestTiltCheck,
    continueSession,
    requestEndSession,
    endSession,
    patterns,
    accumulatedTilt,
    preSessionNote,
    updatePreSessionNote,
    theme,
    updateTheme,
    user,
    hasPremium,
    tiltProfileInput,
    tiltProfileReport,
    openPaywall,
    saveTiltProfile,
    onSignOut: handleSignOut,
  };

  if (!authReady) {
    return <div className="screen"><div className="header"><span className="header-title">Loading...</span></div></div>;
  }

  return (
    <div className={`app ${keyboardOpen ? 'keyboard-open' : ''}`}>
      <Sidebar
        screen={screen}
        navigate={navigate}
        hasActiveSession={!!activeSession}
        accumulatedTilt={accumulatedTilt}
        activeSession={activeSession}
        onSignOut={handleSignOut}
      />

      <div className="main-content">
        {appNotice && (
          <div className="content-wrap">
            <div className="app-notice-row">
              <div className="auth-error">{appNotice}</div>
              <button className="btn btn-ghost btn-inline" onClick={() => setAppNotice('')}>Dismiss</button>
            </div>
          </div>
        )}
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
        {screen === 'tiltprofile' && (
          <TiltProfileScreen
            onBack={() => setScreen('home')}
            savedInput={tiltProfileInput}
            onSaveProfile={saveTiltProfile}
            onComplete={() => setScreen('tiltprofile-report')}
            requiredSetup={!!user?.id && !tiltProfileInput}
          />
        )}
        {screen === 'tiltprofile-edit' && (
          <TiltProfileScreen
            onBack={() => setScreen('tiltprofile-report')}
            savedInput={tiltProfileInput}
            onSaveProfile={saveTiltProfile}
            onComplete={() => setScreen('tiltprofile-report')}
            requiredSetup={false}
            resetOnRedo
          />
        )}
        {screen === 'tiltprofile-report' && (
          <TiltProfileReportScreen
            tiltProfileReport={tiltProfileReport}
            hasPremium={hasPremium}
            onBack={() => setScreen('insights')}
            onUnlock={() => openPaywall('tilt_profile_report', 'tiltprofile-report')}
            onRedo={() => setScreen('tiltprofile-edit')}
          />
        )}
        {screen === 'paywall' && (
          <PaywallScreen
            source={paywallContext}
            onUpgrade={activatePremium}
            onBack={() => setScreen(paywallReturnScreen || 'home')}
            canSkip={paywallContext !== 'tilt_profile_report'}
          />
        )}
        {screen === 'tiltcheck'  && (hasPremium ? <TiltCheckScreen {...sharedProps} /> : <PaywallScreen source="tilt_check" onUpgrade={activatePremium} onBack={() => setScreen('session')} canSkip />)}
        {screen === 'result'     && (hasPremium ? <ResultScreen {...sharedProps} /> : <PaywallScreen source="tilt_check" onUpgrade={activatePremium} onBack={() => setScreen('session')} canSkip />)}
        {screen === 'endsession' && (
          <EndSessionScreen
            onSaveAndEnd={(note) => endSession(note)}
            onSkip={() => endSession('')}
            onBack={() => setScreen(lastResult ? 'result' : 'session')}
          />
        )}
        {screen === 'insights'   && (
          <InsightsScreen
            {...sharedProps}
            updateSessionNote={updateSessionNote}
            deleteSession={deleteSession}
          />
        )}
        {screen === 'learn'      && <LearnScreen      {...sharedProps} />}
        {screen === 'profile'    && user?.id && <ProfileScreen {...sharedProps} />}
        {screen === 'auth'       && (
          <AuthScreen
            title="Log In or Sign Up"
            subtitle={authPrompt || 'Create your free account to use session tools and build your personal tilt profile.'}
            onBack={() => setScreen('home')}
          />
        )}
        {screen === 'history'    && <HistoryScreen    {...sharedProps} />}
        {screen === 'stats'      && <StatsScreen      {...sharedProps} />}
      </div>

      <BottomNav screen={screen} navigate={navigate} hasActiveSession={!!activeSession} />
    </div>
  );
}
