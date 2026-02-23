// SupabaseAuth — lightweight Supabase auth client using REST API.
// Handles auth, subscription/trial checking, and Stripe checkout redirect.
// No external library needed. Runs entirely in the Chrome extension.

var SupabaseAuth = (function () {

  // ============================================================
  // CONFIGURE THESE — replace with your Supabase project values
  // ============================================================
  var SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
  var SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

  // Stripe Payment Links — create these at dashboard.stripe.com
  // Products > Create Product > Add Price > Create Payment Link
  var STRIPE_MONTHLY_LINK = 'https://buy.stripe.com/YOUR_MONTHLY_LINK';
  var STRIPE_ANNUAL_LINK = 'https://buy.stripe.com/YOUR_ANNUAL_LINK';
  // ============================================================

  var TOKEN_KEY = 'sb_auth_token';
  var currentUser = null;
  var currentSession = null;
  var currentSubscription = null;

  // ---- Pricing config (displayed in upgrade UI) ----
  var PRICING = {
    trial_days: 7,
    monthly_price: 79,
    annual_price: 588,
    annual_monthly: 49,
  };

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
    currentSubscription = null;
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
        if (result.data.access_token) {
          saveSession(result.data);
          callback(result.data.user, null);
        } else if (result.data.id) {
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

  // ---- Check if user's email is whitelisted (manual override) ----
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

  // ============================================================
  // SUBSCRIPTION / TRIAL CHECKING
  // ============================================================

  // Check subscription status for the current user
  function checkSubscription(callback) {
    if (!currentSession || !currentSession.access_token) {
      callback({ status: 'none', allowed: false });
      return;
    }

    var url = apiUrl('/rest/v1/subscriptions?user_id=eq.' + currentUser.id + '&select=*&limit=1');

    fetch(url, {
      method: 'GET',
      headers: headers(currentSession.access_token),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Subscription check failed');
        return res.json();
      })
      .then(function (rows) {
        if (!rows || rows.length === 0) {
          // No subscription record — brand new user, create trial client-side
          currentSubscription = {
            plan: 'trial',
            status: 'active',
            trial_start: new Date().toISOString(),
            trial_end: new Date(Date.now() + PRICING.trial_days * 86400000).toISOString(),
          };
          callback(evaluateAccess(currentSubscription));
          return;
        }

        currentSubscription = rows[0];
        callback(evaluateAccess(currentSubscription));
      })
      .catch(function () {
        // If subscription table doesn't exist yet, fall back to whitelist
        currentSubscription = null;
        callback({ status: 'error', allowed: false, fallbackToWhitelist: true });
      });
  }

  // Evaluate whether user has access based on subscription
  function evaluateAccess(sub) {
    var now = new Date();

    // Active paid subscription
    if (sub.plan !== 'trial' && sub.status === 'active') {
      // Check if current period hasn't expired
      if (sub.current_period_end) {
        var periodEnd = new Date(sub.current_period_end);
        if (now < periodEnd) {
          return {
            status: 'active',
            plan: sub.plan,
            allowed: true,
            periodEnd: periodEnd,
          };
        }
        // Period expired — check with server on next load
        return { status: 'expired', plan: sub.plan, allowed: false };
      }
      return { status: 'active', plan: sub.plan, allowed: true };
    }

    // Trial
    if (sub.plan === 'trial') {
      var trialEnd = new Date(sub.trial_end);
      var daysLeft = Math.ceil((trialEnd - now) / 86400000);

      if (now < trialEnd) {
        return {
          status: 'trial',
          allowed: true,
          daysLeft: Math.max(0, daysLeft),
          trialEnd: trialEnd,
        };
      }
      // Trial expired
      return { status: 'trial_expired', allowed: false, daysLeft: 0 };
    }

    // Canceled or past_due
    if (sub.status === 'canceled' || sub.status === 'past_due' || sub.status === 'expired') {
      return { status: sub.status, plan: sub.plan, allowed: false };
    }

    return { status: 'unknown', allowed: false };
  }

  // ============================================================
  // STRIPE CHECKOUT
  // ============================================================

  // Open Stripe Payment Link with user's email pre-filled
  function openCheckout(plan) {
    var email = currentUser ? (currentUser.email || '') : '';
    var link = plan === 'annual' ? STRIPE_ANNUAL_LINK : STRIPE_MONTHLY_LINK;
    // Append email as prefilled parameter
    var separator = link.indexOf('?') === -1 ? '?' : '&';
    var checkoutUrl = link + separator + 'prefilled_email=' + encodeURIComponent(email);

    // Open in new tab
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: checkoutUrl });
    } else {
      window.open(checkoutUrl, '_blank');
    }
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
    checkSubscription: checkSubscription,
    openCheckout: openCheckout,
    loadSession: loadSession,
    isConfigured: isConfigured,
    getUser: function () { return currentUser; },
    getSession: function () { return currentSession; },
    getSubscription: function () { return currentSubscription; },
    getSupabaseUrl: function () { return SUPABASE_URL; },
    PRICING: PRICING,
  };
})();
