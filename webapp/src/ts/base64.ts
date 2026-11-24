/**
 * Binary to base64, for the places the webapp has to hand bytes to something that only takes text:
 * a signed envelope header, a PouchDB attachment, a value crossing the Android bridge.
 *
 * `btoa` needs a string of code points below 256, which is what a Uint8Array maps to one for one.
 */
export const toBase64 = (bytes: Uint8Array): string => {
  return window.btoa(Array.from(bytes, byte => String.fromCodePoint(byte)).join(''));
};

/** The url-safe variant, for values that travel in a url or a JWK. */
export const toBase64Url = (bytes: Uint8Array): string => {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const fromBase64Url = (value: string): Uint8Array => {
  const binary = window.atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, character => character.codePointAt(0)!);
};
