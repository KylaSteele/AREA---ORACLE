/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const AtomicClock = {
  skewMs: 0,          // offset: atomicTime - deviceTime (ms)
  synced: false,
  source: 'device',   // updated to 'atomic' on successful sync

  // Call once on startup. Uses multiple sources for redundancy
  async sync(onUpdate?: (status: string, skew: number) => void) {
    const sources = [
      'https://timeapi.io/api/time/current/zone?timeZone=UTC',
      'https://worldtimeapi.org/api/timezone/Etc/UTC',
      'https://nowapi.com/api/v1/now' // Fallback
    ];

    for (const API of sources) {
      try {
        const t0 = Date.now();
        const signal = (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) 
          ? (AbortSignal as any).timeout(8000) 
          : null;
        const res = await fetch(API, { cache: 'no-store', signal });
        const t1 = Date.now();
        const data = await res.json();

        let atomicMs: number;
        if (API.includes('timeapi.io')) {
          // timeapi.io returns dateTime without 'Z', so we must append it to ensure UTC parsing
          atomicMs = new Date(data.dateTime + 'Z').getTime();
        } else if (API.includes('worldtimeapi')) {
          // worldtimeapi returns datetime with offset (e.g. +00:00)
          atomicMs = new Date(data.datetime).getTime();
        } else {
          atomicMs = data.timestamp * 1000;
        }

        if (isNaN(atomicMs)) throw new Error('Invalid date');
        
        const midpointDevice = (t0 + t1) / 2;
        AtomicClock.skewMs = atomicMs - midpointDevice;
        AtomicClock.synced  = true;
        AtomicClock.source  = new URL(API).hostname;

        if (onUpdate) onUpdate(AtomicClock.source, AtomicClock.skewMs);
        console.log(`Atomic sync OK [${AtomicClock.source}]. Skew: ${AtomicClock.skewMs.toFixed(1)}ms`);
        
        // Re-sync every 5 minutes
        setTimeout(() => AtomicClock.sync(onUpdate), 5 * 60 * 1000);
        return; // Success, exit loop
      } catch(e: any) {
        console.warn(`Sync failed for ${API}:`, e.message);
      }
    }

    // All failed, retry in 30s
    setTimeout(() => AtomicClock.sync(onUpdate), 30_000);
  },

  // Use this everywhere instead of Date.now() or new Date()
  now() {
    return Date.now() + AtomicClock.skewMs;
  },

  // Returns ISO string with atomic-corrected time
  isoNow() {
    return new Date(AtomicClock.now()).toISOString();
  },

  // Human-readable time string for UI display
  timeString() {
    return new Date(AtomicClock.now()).toTimeString().slice(0, 8);
  }
};
