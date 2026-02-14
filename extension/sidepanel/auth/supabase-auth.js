// SupabaseAuth — lightweight Supabase auth client using REST API.
// No external library needed. Runs entirely in the Chrome extension.

var SupabaseAuth = (function () {

  // ============================================================
  // CONFIGURE THESE — replace with your Supabase project values
  // ============================================================
  var SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
  var SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
  // ============================================================

  var TOKEN_KEY = 'sb_auth_token';
  var currentUser = null;
  var currentSession = null;

  // ---- helpers ----
  function apiUrl(path) {
    return SUPABASE_URL + path;
  }

  function headers(accessToken) {
    var h = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    };
    if (accessToken) {
      h['Authorization'] = 'Bearer ' + accessToken;
    }
    return h;
  }

  // ---- Persist session in chrome.storage ----
  function saveSession(session) {
    currentSession = session;
    currentUser = session ? session.user : null;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ sb_session: session });
    }
  }

  function clearSession() {
    currentSession = null;
    currentUser = null;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(['sb_session']);
    }
  }

  // ---- Load session from storage ----
  function loadSession(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['sb_session'], function (data) {
        if (data.sb_session && data.sb_session.access_token) {
          currentSession = data.sb_session;
          currentUser = data.sb_session.user;
          // Verify the token is still valid
          verifyToken(data.sb_session.access_token, function (valid) {
            if (valid) {
              callback(currentUser);
            } else {
              // Try refresh
              if (data.sb_session.refresh_token) {
                refreshSession(data.sb_session.refresh_token, function (success) {
                  callback(success ? currentUser : null);
                });
              } else {
                clearSession();
                callback(null);
              }
            }
          });
        } else {
          callback(null);
        }
      });
    } else {
      callback(null);
    }
  }

  // ---- Verify token by calling /auth/v1/user ----
  function verifyToken(accessToken, callback) {
    fetch(apiUrl('/auth/v1/user'), {
      method: 'GET',
      headers: headers(accessToken),
    })
      .then(function (res) {
        if (res.ok) return res.json();
        throw new Error('Invalid token');
      })
      .then(function (user) {
        currentUser = user;
        callback(true);
      })
      .catch(function () {
        callback(false);
      });
  }

  // ---- Refresh session ----
  function refreshSession(refreshToken, callback) {
    fetch(apiUrl('/auth/v1/token?grant_type=refresh_token'), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Refresh failed');
        return res.json();
      })
      .then(function (data) {
        saveSession(data);
        callback(true);
      })
      .catch(function () {
        clearSession();
        callback(false);
      });
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  // ---- Sign up with email + password ----
  function signUp(email, password, callback) {
    fetch(apiUrl('/auth/v1/signup'), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email: email, password: password }),
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          callback(null, result.data.msg || result.data.error_description || result.data.message || 'Sign up failed');
          return;
        }
        // Supabase may return a session directly or require email confirmation
        if (result.data.access_token) {
          saveSession(result.data);
          callback(result.data.user, null);
        } else if (result.data.id) {
          // Email confirmation required
          callback(null, 'confirm_email');
        } else {
          callback(null, 'Unexpected response');
        }
      })
      .catch(function (err) {
        callback(null, err.message || 'Network error');
      });
  }

  // ---- Sign in with email + password ----
  function signIn(email, password, callback) {
    fetch(apiUrl('/auth/v1/token?grant_type=password'), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email: email, password: password }),
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          callback(null, result.data.msg || result.data.error_description || result.data.message || 'Sign in failed');
          return;
        }
        saveSession(result.data);
        callback(result.data.user, null);
      })
      .catch(function (err) {
        callback(null, err.message || 'Network error');
      });
  }

  // ---- Sign in with Google (via chrome.identity) ----
  function signInWithGoogle(callback) {
    if (typeof chrome === 'undefined' || !chrome.identity) {
      callback(null, 'Google sign-in requires Chrome extension context');
      return;
    }

    // Build the Supabase OAuth URL
    var redirectUrl = chrome.identity.getRedirectURL();
    var authUrl = SUPABASE_URL + '/auth/v1/authorize?' +
      'provider=google' +
      '&redirect_to=' + encodeURIComponent(redirectUrl) +
      '&scopes=email%20profile';

    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      function (responseUrl) {
        if (chrome.runtime.lastError) {
          callback(null, chrome.runtime.lastError.message || 'Google sign-in cancelled');
          return;
        }
        if (!responseUrl) {
          callback(null, 'No response from Google sign-in');
          return;
        }

        // Extract tokens from the URL hash fragment
        var hashStr = responseUrl.split('#')[1];
        if (!hashStr) {
          callback(null, 'No auth tokens in response');
          return;
        }

        var params = {};
        hashStr.split('&').forEach(function (pair) {
          var parts = pair.split('=');
          params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
        });

        if (params.access_token) {
          // Get user info and build session
          fetch(apiUrl('/auth/v1/user'), {
            method: 'GET',
            headers: headers(params.access_token),
          })
            .then(function (res) { return res.json(); })
            .then(function (user) {
              var session = {
                access_token: params.access_token,
                refresh_token: params.refresh_token || '',
                token_type: params.token_type || 'bearer',
                expires_in: parseInt(params.expires_in) || 3600,
                user: user,
              };
              saveSession(session);
              callback(user, null);
            })
            .catch(function (err) {
              callback(null, 'Failed to get user info: ' + err.message);
            });
        } else {
          callback(null, params.error_description || 'Authentication failed');
        }
      }
    );
  }

  // ---- Sign out ----
  function signOut(callback) {
    if (currentSession && currentSession.access_token) {
      fetch(apiUrl('/auth/v1/logout'), {
        method: 'POST',
        headers: headers(currentSession.access_token),
      }).catch(function () {}); // Best effort
    }
    clearSession();
    if (callback) callback();
  }

  // ---- Check if user's email is whitelisted ----
  function checkWhitelist(email, callback) {
    if (!email) { callback(false); return; }

    var url = apiUrl('/rest/v1/whitelisted_emails?email=eq.' + encodeURIComponent(email.toLowerCase()) + '&select=email,team_name,active&limit=1');

    fetch(url, {
      method: 'GET',
      headers: headers(SUPABASE_ANON_KEY),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Whitelist check failed');
        return res.json();
      })
      .then(function (rows) {
        if (rows && rows.length > 0 && rows[0].active !== false) {
          callback(true, rows[0]);
        } else {
          callback(false, null);
        }
      })
      .catch(function () {
        callback(false, null);
      });
  }

  // ---- Check if configured ----
  function isConfigured() {
    return SUPABASE_URL.indexOf('YOUR_PROJECT') === -1 && SUPABASE_ANON_KEY.indexOf('YOUR_ANON') === -1;
  }

  return {
    signUp: signUp,
    signIn: signIn,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    checkWhitelist: checkWhitelist,
    loadSession: loadSession,
    isConfigured: isConfigured,
    getUser: function () { return currentUser; },
    getSession: function () { return currentSession; },
    getSupabaseUrl: function () { return SUPABASE_URL; },
  };
})();
