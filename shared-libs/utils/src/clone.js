// A refactored version of angular.copy function that deep clones with acceptable performance

const getPrototypeOf = Object.getPrototypeOf;

const isObject = value => value !== null && typeof value === 'object';

const isFunction = value => typeof value === 'function';

const isArray = value => Array.isArray(value) || value instanceof Array;

const isBlankObject = value => value !== null && typeof value === 'object' && !getPrototypeOf(value);

const isWindow = value => value && value.window === value;

const isScope = value => value && value.$evalAsync && value.$watch;

const clone = source => {
  const stackSource = [],
        stackDest = [];
  let clone;

  const copyType = source => {
    switch (toString.call(source)) {
      case '[object Int8Array]':
      case '[object Int16Array]':
      case '[object Int32Array]':
      case '[object Float32Array]':
      case '[object Float64Array]':
      case '[object Uint8Array]':
      case '[object Uint8ClampedArray]':
      case '[object Uint16Array]':
      case '[object Uint32Array]':
        return new source.constructor(copyElement(source.buffer), source.byteOffset, source.length);

      case '[object ArrayBuffer]':
        return source.slice(0);

      case '[object Boolean]':
      case '[object Number]':
      case '[object String]':
      case '[object Date]':
        return new source.constructor(source.valueOf());

      case '[object RegExp]':
        var re = new RegExp(source.source, source.toString().match(/[^/]*$/)[0]);
        re.lastIndex = source.lastIndex;
        return re;

      case '[object Blob]':
        return new source.constructor([source], {type: source.type});
    }

    if (isFunction(source.cloneNode)) {
      return source.cloneNode(true);
    }
  };

  const copyRecurse = (source, clone) => {
    if (isArray(source)) {
      for (let i = 0, ii = source.length; i < ii; i++) {
        clone.push(copyElement(source[i]));
      }
    } else if (isBlankObject(source)) {
      // createMap() fast path --- Safe to avoid hasOwnProperty check because prototype chain is empty
      for (let key in source) { // eslint-disable-line guard-for-in
        clone[key] = copyElement(source[key]);
      }
    } else if (source && typeof source.hasOwnProperty === 'function') {
      // Slow path, which must rely on hasOwnProperty
      for (let key in source) {
        if (source.hasOwnProperty(key)) {
          clone[key] = copyElement(source[key]);
        }
      }
    } else {
      // Slowest path --- hasOwnProperty can't be called as a method
      for (let key in source) {
        if (hasOwnProperty.call(source, key)) {
          clone[key] = copyElement(source[key]);
        }
      }
    }
    return clone;
  };

  const copyElement = (source) => {
    // Simple values
    if (!isObject(source)) {
      return source;
    }

    // Already copied values
    const index = stackSource.indexOf(source);
    if (index !== -1) {
      return stackDest[index];
    }

    if (isWindow(source) || isScope(source)) {
      throw Error('Can\'t copy! Making copies of Window or Scope instances is not supported.');
    }

    let needsRecurse = false;
    clone = copyType(source);

    if (clone === undefined) {
      clone = isArray(source) ? [] : Object.create(getPrototypeOf(source));
      needsRecurse = true;
    }

    stackSource.push(source);
    stackDest.push(clone);

    return needsRecurse ? copyRecurse(source, clone) : clone;
  };

  return copyElement(source);
};

module.exports = clone;
