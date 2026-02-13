export const MSG = {
  // Service worker → Offscreen
  START_CAPTURE: 'start-capture',
  STOP_CAPTURE: 'stop-capture',

  // Offscreen → Service worker
  CAPTURE_STARTED: 'capture-started',
  CAPTURE_STOPPED: 'capture-stopped',
  CAPTURE_ERROR: 'capture-error',

  // Side panel → Service worker
  START_CALL: 'start-call',
  STOP_CALL: 'stop-call',
  GET_STATUS: 'get-status',

  // Service worker → Side panel
  CALL_STATUS: 'call-status',
  SESSION_ID: 'session-id',
};
