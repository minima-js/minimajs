/**
 * Monkey-patch for avvio bug fix
 *
 * Fixes the "Cannot access 'relativeContext' before initialization" error
 * in avvio@9.1.0's ready() Promise implementation.
 *
 * Issue: When start() executes synchronously, it calls readyPromiseCB before
 * relativeContext is defined, causing a TDZ (Temporal Dead Zone) error.
 *
 * Fix: Move relativeContext definition and readyPromiseCB function before
 * pushing to queue and calling start().
 */

import avvio from "avvio";

// Store the original ready method
const originalReady = avvio.prototype.ready;

// Override with fixed implementation
avvio.prototype.ready = function (this: any, func?: any) {
  // If callback mode, use original implementation
  if (func) {
    return originalReady.call(this, func);
  }

  // Fixed Promise mode implementation
  return new Promise((resolve, reject) => {
    /**
     * Define relativeContext BEFORE pushing to queue
     * This fixes the TDZ error when start() executes synchronously
     */
    const relativeContext = this._current[0]?.server;

    function readyPromiseCB(err: any, _context: any, done: any) {
      if (err) {
        reject(err);
      } else {
        resolve(relativeContext);
      }
      process.nextTick(done);
    }

    // Now push to queue and start
    this._readyQ.push(readyPromiseCB);
    this.start();
  });
};
