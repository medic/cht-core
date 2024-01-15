import {Injectable} from '@angular/core';

import {ChangesService} from '@mm-services/changes.service';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private caches: {
    docs: any;
    pending: boolean;
    invalidate: any;
    callbacks: any[];
  }[] = [];

  constructor(private changesService:ChangesService) {
    this.changesService.subscribe({
      key: 'cache',
      callback: (change) => {
        this.caches.forEach((cache) => {
          if (cache.invalidate(change)) {
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
  register(options) {
    const cache = {
      docs: null,
      pending: false,
      invalidate: options.invalidate,
      callbacks: [] as any[]
    };

    this.caches.push(cache);

    return (callback) => {
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
          cache.docs = result;
        }
        cache.callbacks.forEach((callback) => {
          callback(err, result);
        });
        cache.callbacks = [];
      });
    };
  }

}
