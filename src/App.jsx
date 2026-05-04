import { useEffect, useState, useRef } from 'react';
import { runTiltCheck, analyzePatterns, calculateAccumulatedTilt } from './utils/tiltDetection';
import { getCurrentSession, getCurrentUser, onAuthStateChange, signOut } from './services/authService';
import { createSession, deleteSessionById, fetchMySessions, updateSession } from './services/sessionsService';
import { getMySettings, upsertMySettings } from './services/settingsService';
import { getMonetizationState, updateMonetizationState } from './services/monetizationService';
import {
  getSubscriptionManagementUrl,
  hasPremiumEntitlement,
  initRevenueCat,
  logoutRevenueCat,
  purchasePremium,
  refreshPremiumStatus,
  restorePremium,
} from './services/revenueCatService';
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

const SCREEN_STORAGE_KEY = 'anchored_screen';
/** If set, user had a current session last visit — used when screen key is missing/'home'. */
const LIVE_SESSION_HINT_KEY = 'anchored_live_session';
/** Screens safe to restore on reload (not mid-flow modals). */
const RESTORABLE_SCREENS = new Set([
  'home',
  'session',
  'presession',
  'insights',
  'learn',
  'profile',
  'history',
  'stats',
  'tiltprofile',
  'tiltprofile-edit',
  'tiltprofile-report',
]);
const SCREENS_NO_PERSIST = new Set(['auth', 'paywall', 'tiltcheck', 'result', 'endsession']);

function readStoredScreen() {
  try {
    const s = sessionStorage.getItem(SCREEN_STORAGE_KEY);
    if (s && RESTORABLE_SCREENS.has(s)) return s;
  } catch (_) {}
  return 'home';
}

function readStoredScreenWithLiveHint() {
  let s = readStoredScreen();
  if (s !== 'home') return s;
  try {
    if (sessionStorage.getItem(LIVE_SESSION_HINT_KEY) === '1') return 'session';
  } catch (_) {}
  return 'home';
}

/** When a live DB session exists, stay on these tabs across refresh; otherwise open live session UI. */
const SCREEN_TAB_KEEP = new Set([
  'insights',
  'learn',
  'profile',
  'history',
  'stats',
  'tiltprofile',
  'tiltprofile-edit',
  'tiltprofile-report',
]);

function computeScreenAfterHydrate(currentActive, storedPreferred) {
  if (currentActive) {
    if (SCREEN_TAB_KEEP.has(storedPreferred)) return storedPreferred;
    return 'session';
  }
  return storedPreferred;
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('home');
  const [activeSession, setActiveSession] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [preSessionNote, setPreSessionNote] = useState('');
  const [theme, setTheme] = useState(() => {
    try { const t = localStorage.getItem('anchored_theme'); if (t === 'light' || t === 'dark') return t; } catch (_) {}
    return 'dark';
  });
  const [authPrompt, setAuthPrompt] = useState('');
  const [appNotice, setAppNotice] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [hasPremium, setHasPremium] = useState(false);
  const [tiltProfileInput, setTiltProfileInput] = useState(null);
  const [tiltProfileReport, setTiltProfileReport] = useState(null);
  const [paywallContext, setPaywallContext] = useState('premium');
  const [paywallReturnScreen, setPaywallReturnScreen] = useState('home');
  const [selectedPackageId, setSelectedPackageId] = useState('monthly');
  const [billingBusy, setBillingBusy] = useState(false);
  /** After fetchMySessions settles; avoids redirecting to tilt profile before we know activeSession. */
  const [sessionsBootstrapped, setSessionsBootstrapped] = useState(false);
  /** Skip duplicate workspace fetch when this matches `user.id` (already hydrated). */
  const lastHydratedUserIdRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

    const subscribeAuth = () => {
      if (!mounted) return;
      // Subscribe only after getSession/getUser — avoids INITIAL_SESSION null clearing user.
      authSubscription = onAuthStateChange((nextSession) => {
        setUser(nextSession?.user ?? null);
      });
    };

    (async () => {
      try {
        const session = await getCurrentSession();
        const currentUser = session?.user ?? (await getCurrentUser());
        if (!mounted) return;
        setUser(currentUser || null);
        if (!currentUser?.id) {
          try {
            sessionStorage.removeItem(SCREEN_STORAGE_KEY);
            sessionStorage.removeItem(LIVE_SESSION_HINT_KEY);
          } catch (_) {}
          setScreen('home');
        }
        // Logged-in: screen + sessions come from workspace hydrate (never paint shell until ready).
        setAuthReady(true);
        subscribeAuth();
      } catch {
        if (!mounted) return;
        setUser(null);
        try {
          sessionStorage.removeItem(SCREEN_STORAGE_KEY);
          sessionStorage.removeItem(LIVE_SESSION_HINT_KEY);
        } catch (_) {}
        setScreen('home');
        setAuthReady(true);
        subscribeAuth();
      }
    })();

    return () => {
      mounted = false;
      authSubscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('anchored_theme', theme); } catch (_) {}
  }, [theme]);

  useEffect(() => {
    if (!authReady) return;
    if (SCREENS_NO_PERSIST.has(screen)) return;
    if (!user?.id) return;
    if (!sessionsBootstrapped) return;
    try {
      sessionStorage.setItem(SCREEN_STORAGE_KEY, screen);
    } catch (_) {}
  }, [authReady, screen, user?.id, sessionsBootstrapped]);

  useEffect(() => {
    if (!user?.id || !sessionsBootstrapped) return;
    try {
      if (activeSession) sessionStorage.setItem(LIVE_SESSION_HINT_KEY, '1');
      else sessionStorage.removeItem(LIVE_SESSION_HINT_KEY);
    } catch (_) {}
  }, [user?.id, activeSession, sessionsBootstrapped]);

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
    if (!authReady) return;

    if (!user?.id) {
      lastHydratedUserIdRef.current = null;
      logoutRevenueCat().catch(() => {});
      setSessions([]);
      setPreSessionNote('');
      setTheme('dark');
      setActiveSession(null);
      setLastResult(null);
      setHasPremium(false);
      setTiltProfileInput(null);
      setTiltProfileReport(null);
      setSessionsBootstrapped(false);
      try {
        sessionStorage.removeItem(SCREEN_STORAGE_KEY);
        sessionStorage.removeItem(LIVE_SESSION_HINT_KEY);
      } catch (_) {}
      setScreen('home');
      return;
    }

    if (lastHydratedUserIdRef.current === user.id) return;

    let cancelled = false;
    setSessionsBootstrapped(false);

    (async () => {
      try {
        const [fetched, settings] = await Promise.all([
          fetchMySessions(),
          getMySettings().catch(() => null),
        ]);
        if (cancelled) return;

        const current = fetched.find((s) => s.status === 'current' || !s.endTime) || null;
        const monetization = getMonetizationState(user.id);
        const storedPreferred = readStoredScreenWithLiveHint();
        let nextScreen = computeScreenAfterHydrate(current, storedPreferred);
        if (nextScreen === 'auth') nextScreen = 'home';

        setSessions(fetched);
        setActiveSession(current);
        setTiltProfileInput(monetization.tiltProfileInput || null);
        setTiltProfileReport(monetization.tiltProfileReport || null);
        setLastResult(null);
        setScreen(nextScreen);
        setSessionsBootstrapped(true);
        lastHydratedUserIdRef.current = user.id;

        if (settings) {
          setPreSessionNote(settings.pre_session_note || '');
          setTheme(settings.theme === 'light' ? 'light' : 'dark');
        }

        initRevenueCat(user.id)
          .then((enabled) => {
            if (!enabled) {
              setHasPremium(Boolean(monetization.premium));
              return;
            }
            return hasPremiumEntitlement().then((premium) => {
              setHasPremium(premium);
              updateMonetizationState(user.id, { premium });
            });
          })
          .catch(() => {
            setHasPremium(Boolean(monetization.premium));
          });
      } catch {
        if (cancelled) return;
        setSessions([]);
        setActiveSession(null);
        setSessionsBootstrapped(true);
        lastHydratedUserIdRef.current = user.id;
        setScreen('home');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (!sessionsBootstrapped) return;
    if (tiltProfileInput) return;
    if (activeSession) return;
    if (screen === 'home' || screen === 'auth') {
      setScreen('tiltprofile');
    }
  }, [user?.id, sessionsBootstrapped, tiltProfileInput, activeSession, screen]);

  useEffect(() => {
    if (!user?.id) return;
    if (screen !== 'tiltprofile') return;
    if (tiltProfileInput && tiltProfileReport) {
      setScreen('tiltprofile-report');
    }
  }, [user?.id, screen, tiltProfileInput, tiltProfileReport]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      refreshSubscriptionStatus();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id]);

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

  const activatePremium = async (packageId = selectedPackageId) => {
    if (!user?.id) {
      setAuthPrompt('Create an account to activate premium.');
      setScreen('auth');
      return;
    }
    try {
      setBillingBusy(true);
      const purchased = await purchasePremium(packageId);
      const next = updateMonetizationState(user.id, { premium: purchased });
      setHasPremium(Boolean(next.premium));
      if (!purchased) {
        notify('Purchase completed but premium was not detected yet. Try Restore.');
        return;
      }
      setScreen(paywallReturnScreen || 'home');
      notify('Premium unlocked. You now have full access.');
    } catch (err) {
      const raw = String(err?.message || '').toLowerCase();
      if (raw.includes('cancel')) {
        notify('Purchase cancelled.');
        return;
      }
      notify(err?.message || 'Could not complete purchase. Please try again.');
    } finally {
      setBillingBusy(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setBillingBusy(true);
      const restored = await restorePremium();
      const next = updateMonetizationState(user.id, { premium: restored });
      setHasPremium(Boolean(next.premium));
      if (restored) {
        notify('Purchases restored. Premium is active.');
        setScreen(paywallReturnScreen || 'home');
      } else {
        notify('No active premium subscription found to restore.');
      }
    } catch (err) {
      notify(err?.message || 'Could not restore purchases. Please try again.');
    } finally {
      setBillingBusy(false);
    }
  };

  const refreshSubscriptionStatus = async () => {
    if (!user?.id) return;
    try {
      setBillingBusy(true);
      const enabled = await initRevenueCat(user.id);
      if (!enabled) {
        notify('Subscription sync is available on native iOS/Android builds.');
        return;
      }
      const premium = await refreshPremiumStatus();
      updateMonetizationState(user.id, { premium });
      setHasPremium(Boolean(premium));
      notify(premium ? 'Premium is active.' : 'No active premium entitlement found.');
    } catch (err) {
      notify(err?.message || 'Could not refresh subscription status.');
    } finally {
      setBillingBusy(false);
    }
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
    await logoutRevenueCat().catch(() => {});
    await signOut();
    lastHydratedUserIdRef.current = null;
    try {
      sessionStorage.removeItem(SCREEN_STORAGE_KEY);
      sessionStorage.removeItem(LIVE_SESSION_HINT_KEY);
    } catch (_) {}
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
    refreshSubscriptionStatus,
    billingBusy,
  };

  const appShellReady = authReady && (!user?.id || sessionsBootstrapped);
  if (!appShellReady) {
    return (
      <div className="screen">
        <div className="header">
          <span className="header-title">Loading...</span>
        </div>
      </div>
    );
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
            selectedPackageId={selectedPackageId}
            onSelectPackage={setSelectedPackageId}
            onRestore={handleRestorePurchases}
            billingBusy={billingBusy}
            onBack={() => setScreen(paywallReturnScreen || 'home')}
            canSkip={paywallContext !== 'tilt_profile_report'}
          />
        )}
        {screen === 'tiltcheck'  && (hasPremium ? <TiltCheckScreen {...sharedProps} /> : <PaywallScreen source="tilt_check" onUpgrade={activatePremium} selectedPackageId={selectedPackageId} onSelectPackage={setSelectedPackageId} onRestore={handleRestorePurchases} billingBusy={billingBusy} onBack={() => setScreen('session')} canSkip />)}
        {screen === 'result'     && (hasPremium ? <ResultScreen {...sharedProps} /> : <PaywallScreen source="tilt_check" onUpgrade={activatePremium} selectedPackageId={selectedPackageId} onSelectPackage={setSelectedPackageId} onRestore={handleRestorePurchases} billingBusy={billingBusy} onBack={() => setScreen('session')} canSkip />)}
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
        {screen === 'profile'    && user?.id && <ProfileScreen {...sharedProps} manageSubscriptionUrl={getSubscriptionManagementUrl()} />}
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

      {import.meta.env.DEV && (
        <button
          className="dev-premium-toggle"
          onClick={() => setHasPremium((p) => !p)}
          title="Dev only: toggle premium"
        >
          {hasPremium ? '★ Premium ON' : '☆ Premium OFF'}
        </button>
      )}
    </div>
  );
}
