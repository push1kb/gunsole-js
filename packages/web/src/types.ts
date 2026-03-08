/**
 * Options for attachWebLifecycle
 */
export interface WebLifecycleOptions {
  /** Use sendBeacon on pagehide to flush remaining logs (default: true) */
  sendBeacon?: boolean;
  /** Flush logs when browser comes back online (default: true) */
  networkAware?: boolean;
  /** Flush logs on visibility changes (default: true) */
  visibilityAware?: boolean;
  /** Enable debug mode via URL param or localStorage (default: true) */
  urlDebug?: boolean;
}

/**
 * Function that removes all attached listeners
 */
export type DetachFunction = () => void;
