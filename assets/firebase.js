// ===================== Creator Reps: Firebase auth + cloud sync driver =====================
// Loaded on every page as <script type="module">. This file plugs the REAL Google
// sign-in and Firestore read/write logic into window.SFAuth, an interface that
// assets/progress.js already defines with safe no-op stubs before this module
// gets a chance to run. If anything here fails (offline, gstatic blocked, ad
// blocker, popup blocked), the page falls back to the existing localStorage-only
// experience -- nothing white-screens, nothing throws to the console as an error.

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCbqjbkkpz42UX--rAniVH2yTydZCILc4g',
  authDomain: 'creators-reps.firebaseapp.com',
  projectId: 'creators-reps',
  storageBucket: 'creators-reps.firebasestorage.app',
  messagingSenderId: '58885499606',
  appId: '1:58885499606:web:a43e127c1f447308ab3777',
};

const ADMIN_EMAIL = 'eric@skyryd.com';
const SDK_VERSION = '12.15.0';

(async function initFirebase() {
  // progress.js (a regular, non-module script) always loads and runs before this
  // module (module scripts execute after the document is parsed, same timing as
  // "defer"), so window.SFAuth should already exist. This safety net only fires
  // if a page somehow loads firebase.js without progress.js first.
  if (!window.SFAuth) {
    window.SFAuth = {
      _setUser() {},
      onChange(cb) { cb(null); },
      getUser() { return null; },
      signIn() {},
      signOut() {},
      isAdmin() { return false; },
      pullProgress() { return Promise.resolve(null); },
      pushProgress() {},
    };
  }

  let app, auth, db, authMod, firestoreMod;

  try {
    const [appMod, authModule, firestoreModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`),
    ]);
    authMod = authModule;
    firestoreMod = firestoreModule;
    app = appMod.initializeApp(FIREBASE_CONFIG);
    auth = authMod.getAuth(app);
    db = firestoreMod.getFirestore(app);
  } catch (err) {
    console.warn('[Creator Reps] Firebase unavailable, staying in local-only mode.', err && err.message);
    // Resolve the auth state so any page waiting on it (admin.html, or a
    // gated lesson/dashboard page) doesn't hang on a loading state forever.
    // The { blocked: true } flag matters: it tells a gated content page this
    // is "we couldn't check" (show the retry panel), not "you're signed out"
    // (which would show the sign-in panel and misrepresent the failure as a
    // login problem instead of a network one).
    window.SFAuth._setUser(null, { blocked: true });
    return;
  }

  const provider = new authMod.GoogleAuthProvider();

  function userToPlain(u) {
    if (!u) return null;
    return { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL };
  }

  async function pullProgress(uid) {
    try {
      const ref = firestoreMod.doc(db, 'users', uid);
      const snap = await firestoreMod.getDoc(ref);
      if (!snap.exists()) return null;
      const data = snap.data();
      return (data && data.progress) || null;
    } catch (err) {
      console.warn('[Creator Reps] Could not read cloud progress; using local copy.', err && err.message);
      return null;
    }
  }

  let writeTimer = null;

  function pushProgress(uid, profile, progressState, opts) {
    opts = opts || {};
    const doWrite = async () => {
      try {
        const ref = firestoreMod.doc(db, 'users', uid);
        const payload = {
          displayName: profile.displayName || '',
          email: profile.email || '',
          photoURL: profile.photoURL || '',
          progress: progressState,
        };
        if (opts.touchActive) payload.lastActiveAt = firestoreMod.serverTimestamp();
        const snap = await firestoreMod.getDoc(ref);
        if (!snap.exists()) {
          payload.createdAt = firestoreMod.serverTimestamp();
          await firestoreMod.setDoc(ref, payload);
        } else {
          await firestoreMod.setDoc(ref, payload, { merge: true });
        }
      } catch (err) {
        console.warn('[Creator Reps] Cloud write failed; local progress is still saved.', err && err.message);
      }
    };
    if (writeTimer) clearTimeout(writeTimer);
    if (opts.immediate) { doWrite(); return; }
    writeTimer = setTimeout(doWrite, 2000); // respects free-tier write quotas
  }

  window.SFAuth.signIn = async function () {
    try {
      await authMod.signInWithPopup(auth, provider);
    } catch (err) {
      const code = err && err.code;
      const popupIssue = code === 'auth/popup-blocked'
        || code === 'auth/cancelled-popup-request'
        || code === 'auth/operation-not-supported-in-this-environment';
      if (popupIssue) {
        try {
          await authMod.signInWithRedirect(auth, provider);
        } catch (err2) {
          console.warn('[Creator Reps] Sign-in redirect fallback failed.', err2 && err2.message);
        }
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        console.warn('[Creator Reps] Sign-in failed.', err && err.message);
      }
    }
  };

  window.SFAuth.signOut = function () {
    authMod.signOut(auth).catch((err) => console.warn('[Creator Reps] Sign-out failed.', err && err.message));
  };

  window.SFAuth.pullProgress = function () {
    const u = auth.currentUser;
    if (!u) return Promise.resolve(null);
    return pullProgress(u.uid);
  };

  window.SFAuth.pushProgress = function (state, opts) {
    const u = auth.currentUser;
    if (!u) return;
    pushProgress(u.uid, userToPlain(u), state, opts);
  };

  window.SFAuth.isAdmin = function () {
    const u = auth.currentUser;
    return !!(u && u.email && u.email.toLowerCase() === ADMIN_EMAIL);
  };

  // Admin-only: used by admin.html. Firestore rules are the real gate here --
  // this call simply fails for anyone whose token isn't the admin email.
  window.SFAuth.fetchAllUsers = async function () {
    const { collection, getDocs } = firestoreMod;
    const snap = await getDocs(collection(db, 'users'));
    const out = [];
    snap.forEach((d) => out.push(Object.assign({ uid: d.id }, d.data())));
    return out;
  };

  try {
    await authMod.getRedirectResult(auth); // completes mobile-Safari redirect sign-in, if one was in flight
  } catch (err) {
    console.warn('[Creator Reps] Redirect sign-in result check failed.', err && err.message);
  }

  authMod.onAuthStateChanged(auth, (u) => {
    window.SFAuth._setUser(userToPlain(u));
  });
})();
