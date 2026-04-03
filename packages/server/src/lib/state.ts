/**
 * Server readiness flag.
 * Set to true after DB init + SessionManager.start() complete.
 * Used by GET /api/readiness to return 503 until fully initialised.
 */
let _serverReady = false

export function setReady(): void {
  _serverReady = true
}

export function isReady(): boolean {
  return _serverReady
}
