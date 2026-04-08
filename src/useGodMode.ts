/** Pure helper — exported for unit testing */
export function isGodModeEnabled(search: string): boolean {
  return new URLSearchParams(search).get('god') === 'true'
}

/** React hook — reads the real URL */
export function useGodMode(): boolean {
  return isGodModeEnabled(window.location.search)
}
