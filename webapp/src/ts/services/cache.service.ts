import {Injectable} from '@angular/core';

import {ChangesService} from '@mm-services/changes.service';

type CacheCallback<T = unknown> = (err: unknown, result?: T) => void;

export interface CacheChange {
  id: string;
  doc?: { _id?: string; [key: string]: unknown };
  [key: string]: unknown;
}

interface CacheRegisterOptions<T = unknown> {
  get: (done: CacheCallback<T>) => void;
  invalidate?: (change: CacheChange) => boolean;
}

interface CacheEntry<T = unknown> {
  docs: T | null;
  pending: boolean;
  invalidate?: (change: CacheChange) => boolean;
  callbacks: CacheCallback<T>[];
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private readonly caches: CacheEntry[] = [];

  constructor(private changesService:ChangesService) {
    this.changesService.subscribe({
      key: 'cache',
      callback: (change) => {
        this.caches.forEach((cache) => {
          // Optional chaining is required: `invalidate` is documented as optional (see register
          // docstring), but the original AngularJS call site was unguarded. Without `?.` the
          // runtime would crash on any consumer that omits invalidate.
          if (cache.invalidate?.(change)) {
            cache.docs = null;
            cache.pending = false;
          }
        });
      }
    });
  }

  /**
   * Caches results and invalidates on document change to reduce
   * the number of requests made to the database.
   *
   * @param options (Object)
   *   - get (function): The function to call to populate the cache.
   *   - invalidate (function) (optional): A predicate which will be
   *     invoked when a database change is detected. Given the
   *     modified doc return true if the cache should be invalidated.
   *     If no invalidate function is provided the cache will never
   *     invalidate.
   */
  register<T = unknown>(options: CacheRegisterOptions<T>) {
    const cache: CacheEntry<T> = {
      docs: null,
      pending: false,
      invalidate: options.invalidate,
      callbacks: []
    };

    this.caches.push(cache as CacheEntry);

    return (callback: CacheCallback<T>) => {
      if (cache.docs) {
        return callback(null, cache.docs);
      }
      cache.callbacks.push(callback);
      if (cache.pending) {
        return;
      }
      cache.pending = true;
      options.get((err, result) => {
        cache.pending = false;
        if (!err) {
          cache.docs = result ?? null;
        }
        cache.callbacks.forEach((cb) => {
          cb(err, result);
        });
        cache.callbacks = [];
      });
    };
  }

}
