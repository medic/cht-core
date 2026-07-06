/**
 * Pure routing primitives shared by the report (`EnketoService`) and contact
 * (`ContactSaveService`) attachment pipelines. The model-specific parts (owner
 * resolution, field write-back, container source) stay in each service.
 */

/**
 * Prefix for every CouchDB attachment created from a form media field, so a
 * field's value resolves uniformly as `USER_FILE_PREFIX + value`.
 */
export const USER_FILE_PREFIX = 'user-file-';

/** A path accepted by object-path: a dot-delimited string or a segment array. */
export type FieldPath = string | (string | number)[];

/** Per-pipeline parts the shared `AttachmentRoutingService` delegates to. */
export interface AttachmentRoutingStrategy {
  /** Parsed form-instance root the loops walk. */
  readonly root: Element;

  /** Every target doc finalize iterates (main doc + sub-docs); docs[0] is main. */
  readonly docs: Record<string, any>[];

  /** Fallback owner for an unmatched upload / a root-level node. */
  readonly mainDoc: Record<string, any>;

  /** Owner doc for an XML node (a `[type=file]` or `[type=binary]` element). */
  resolveOwnerForNode(element: Element): Record<string, any>;

  /** The owner doc's field-container element, used to root the relative reference. */
  containerFor(element: Element, ownerDoc: Record<string, any>): Element | null;

  /** objectPath location of the field value within `ownerDoc`, or null to skip. */
  fieldPathFor(element: Element, ownerDoc: Record<string, any>): FieldPath | null;
}

/**
 * The media node within `root` whose text is `filename`, or null; the caller owns
 * the no-match fallback. Filenames are session-unique, so the first match wins.
 *
 * Matches both `[type=file]` and `[type=binary]`. A draw/signature/annotate widget
 * tracked by FileManager can still read `type="binary"` (Enketo only rewrites to
 * `file` on a value change), so routing its upload to the right owner can't depend
 * on that. Genuine inline binaries hold base64, never a filename, so they never
 * match here.
 */
export const findUploadNodeByFilename = (root: Element, filename: string): Element | null => {
  return $(root).find('[type=file],[type=binary]').toArray()
    .find(element => $(element).text() === filename) ?? null;
};

/** 0-based count of an element's preceding same-node-name element siblings. */
const sameNameSiblingIndex = (element: Element): number => {
  let index = 0;
  for (let sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
    if (sibling.nodeName === element.nodeName) {
      index++;
    }
  }
  return index;
};

/** True when `element` has any same-node-name sibling (preceding or following). */
const hasSameNameSibling = (element: Element): boolean => {
  const parent = element.parentNode;
  return !!parent && Array.from(parent.childNodes)
    .some(n => n !== element && n.nodeName === element.nodeName);
};

/**
 * Bare attachment reference for an inline-binary node: the element's xpath
 * relative to `container` (the owner doc's field container), no form-id prefix.
 * Direct child -> `photo`; nested -> `group/photo`; repeat instance ->
 * `my_repeat[2]/photo` (1-based bracket, only for same-name siblings).
 */
export const computeAttachmentReference = (element: Element, container: Element): string => {
  const segments: string[] = [];
  let node: Element | null = element;
  while (node && node !== container) {
    const bracket = hasSameNameSibling(node) ? `[${sameNameSiblingIndex(node) + 1}]` : '';
    segments.unshift(node.nodeName + bracket);
    node = node.parentNode as Element | null;
  }
  return segments.join('/');
};

/**
 * Dot-path of an element's position relative to `container`, e.g. `group.photo`.
 * Used where fields sit at the top level with no repeat arrays: contact docs and
 * report sub-docs.
 */
export const computeFieldPath = (element: Element, container: Element): string => {
  const segments: string[] = [];
  let node: Node | null = element;
  while (node && node !== container) {
    segments.unshift((node as Element).tagName);
    node = node.parentNode;
  }
  return segments.join('.');
};

/**
 * objectPath segments for a field within a report main doc's `fields`,
 * reconstructing the array indices `reportRecordToJs` materializes for
 * repeat-nested fields (returned relative to `fields`). For each segment whose
 * accumulated `/root/...` path is a `<repeat nodeset>` value, emits the node name
 * plus its 0-based same-name-sibling index (object-path treats a numeric segment
 * as an array index); other segments emit the node name only.
 */
export const indexedFieldPath = (element: Element, root: Element, repeatPaths: string[]): (string | number)[] => {
  const chain: Element[] = [];
  let node: Element | null = element;
  while (node && node !== root) {
    chain.unshift(node);
    node = node.parentNode as Element | null;
  }

  const segments: (string | number)[] = [];
  let accumulatedPath = '/' + root.nodeName;
  for (const current of chain) {
    accumulatedPath += '/' + current.nodeName;
    segments.push(current.nodeName);
    if (repeatPaths.includes(accumulatedPath)) {
      segments.push(sameNameSiblingIndex(current));
    }
  }
  return segments;
};
