export const hasProperty = <T extends string> (obj: unknown, prop: T): obj is Record<T, unknown> => {
  return typeof obj === 'object' && obj !== null && prop in obj;
};

export const getProperty = <T extends string> (obj: unknown, prop: T): unknown => {
  if (hasProperty(obj, prop)) {
    return obj[prop];
  }
  return undefined;
};
