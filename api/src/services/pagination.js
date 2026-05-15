const { InvalidArgumentError } = require('@medic/cht-datasource');

// Default page size when a caller doesn't pass `limit`.
const DEFAULT_LIMIT = 100;

// Transient: mirrors `assertCursor`/`assertLimit` from `shared-libs/cht-datasource/src/libs/parameter-validators.ts`.
// Those helpers are `@internal` and not part of the cht-datasource public API today, so we vendor the
// logic here. Replace these with the cht-datasource exports once they are made public.

const UNSPECIFIED_VALUES = new Set([undefined, null, '']); // 0 (number) should not be treated as unspecified
const isUnspecified = (value) => UNSPECIFIED_VALUES.has(value);

/**
 * Parse a query-param-style integer.
 * @private
 * @param {object} options
 * @param {*} options.value the raw param value
 * @param {number} options.defaultValue returned when the value is unspecified
 * @param {number} options.minimum smallest valid value (after parsing)
 * @param {string} options.errorMessage thrown as `InvalidArgumentError(errorMessage)` on invalid input
 */
const parseIntegerParam = ({ value, defaultValue, minimum, errorMessage }) => {
  if (isUnspecified(value)) {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new InvalidArgumentError(errorMessage);
  }
  return parsed;
};

/**
 * Validate a cursor query param and return the matching skip offset.
 * @param {string|number|null|undefined} cursor opaque cursor token (currently a stringified non-negative integer)
 * @returns {number} skip offset (0 for the first page)
 * @throws {InvalidArgumentError} if the cursor doesn't decode to a non-negative integer
 */
const parseCursor = (cursor) => parseIntegerParam({
  value: cursor,
  defaultValue: 0,
  minimum: 0,
  errorMessage: `The cursor must be a non-negative integer or null for first page: [${JSON.stringify(cursor)}].`,
});

/**
 * Validate a limit query param.
 * @param {number|string|null|undefined} limit page size; absent → defaultLimit
 * @param {number} [defaultLimit=DEFAULT_LIMIT]
 * @returns {number}
 * @throws {InvalidArgumentError} if the limit is provided and isn't a positive integer (or its string form)
 */
const parseLimit = (limit, defaultLimit = DEFAULT_LIMIT) => parseIntegerParam({
  value: limit,
  defaultValue: defaultLimit,
  minimum: 1,
  errorMessage: `The limit must be a positive integer: [${JSON.stringify(limit)}].`,
});

/**
 * Compute the next-page cursor: returns the stringified next-skip offset when `hasMore` is truthy,
 * else null. The caller decides whether more data is available — common patterns are comparing
 * `(skip + pageSize) < totalCount` when the total is known, or using the page-size heuristic
 * `pageSize === limit` when it isn't (mirrors `fetchAndFilter` in cht-datasource).
 */
const buildNextCursor = (skip, pageSize, hasMore) => hasMore ? String(skip + pageSize) : null;

module.exports = {
  DEFAULT_LIMIT,
  parseCursor,
  parseLimit,
  buildNextCursor,
};
