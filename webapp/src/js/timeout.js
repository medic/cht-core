export default function $timeout(fn, delay, ...args) {
  let timeoutId;

  $timeout.cancel = $timeout.cancel || function (promise) {
    if (promise && promise.$$timeoutId in $timeout.promises) {
      $timeout.promises[promise.$$timeoutId][1]('canceled');
      delete $timeout.promises[promise.$$timeoutId];
      return clearTimeout(promise.$$timeoutId);
    }
    return false;
  };

  $timeout.promises = $timeout.promises || {};

  const promise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(function () {
      try {
        resolve(fn.apply(null, args));
      } catch (e) {
        reject(e);
      } finally {
        delete $timeout.promises[promise.$$timeoutId];
      }
    }, delay);

    $timeout.promises[timeoutId] = [resolve, reject];
  });

  promise.$$timeoutId = timeoutId;

  return promise;
}
