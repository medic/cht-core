import { Xpath } from '@mm-providers/xpath-element-path.provider';

/**
 * Pure routing primitives shared by the report (`EnketoService`) and contact
 * (`ContactSaveService`) attachment pipelines. The model-specific parts (owner
 * resolution, field write-back, formId source) stay in each service.
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

  /** formId used to root a binary reference owned by `ownerDoc`. */
  formIdFor(ownerDoc: Record<string, any>): string | undefined;

  /** objectPath location of the field value within `ownerDoc`, or null to skip. */
  fieldPathFor(element: Element, ownerDoc: Record<string, any>): FieldPath | null;
}

/**
 * Bare attachment reference for an inline-binary node: the element's xpath with
 * the instance-root segment swapped for `formId` and the leading slash dropped,
 * e.g. `/my-form/group/photo` -> `my-form/group/photo`. The field value then
 * resolves uniformly as `USER_FILE_PREFIX + value`.
 */
export const computeAttachmentReference = (element: Element, formId: string | undefined): string => {
  const xpath = Xpath.getElementXPath(element);
  return (xpath.startsWith('/' + formId) ? xpath : xpath.replace(/^\/[^/]+/, '/' + formId)).slice(1);
};

/**
 * The `[type=file]` widget node within `root` whose text is `filename`, or null.
 * Filenames are session-unique, so the first match is the only match; the caller
 * owns the no-match fallback.
 */
export const findUploadNodeByFilename = (root: Element, filename: string): Element | null => {
  return $(root).find('[type=file]').toArray().find(element => $(element).text() === filename) ?? null;
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
