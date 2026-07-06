import { Injectable } from '@angular/core';
import { v7 as uuid } from 'uuid';
import * as objectPath from 'object-path';

import { AttachmentService } from '@mm-services/attachment.service';
import {
  AttachmentRoutingStrategy,
  USER_FILE_PREFIX,
  computeAttachmentReference,
  findUploadNodeByFilename,
} from '@mm-services/attachment-routing';
import * as FileManager from '../../js/enketo/file-manager.js';

type AttachmentNamesByDoc = Map<Record<string, any>, Set<string>>;
type FileNameMapByDoc = Map<Record<string, any>, Map<string, string>>;

/**
 * Shared attachment-routing pipeline for Enketo form submissions: route
 * FileManager uploads, route inline `[type=binary]` blobs, then finalize
 * (filename sanitization + orphan cleanup). The model-specific parts (owner
 * resolution, formId source, field-value location) come from the
 * `AttachmentRoutingStrategy` each pipeline supplies.
 */
@Injectable({
  providedIn: 'root'
})
export class AttachmentRoutingService {
  constructor(
    private readonly attachmentService: AttachmentService,
  ) {}

  /** Routes every upload and inline binary to its owner doc, then finalizes. */
  route(strategy: AttachmentRoutingStrategy): void {
    const newAttachmentNamesByDoc: AttachmentNamesByDoc = new Map();
    const fileNameMapByDoc: FileNameMapByDoc = new Map();

    const fileManagerNames = this.routeUploads(strategy, newAttachmentNamesByDoc, fileNameMapByDoc);
    this.routeInlineBinaries(strategy, fileManagerNames, newAttachmentNamesByDoc);
    this.finalize(strategy.docs, fileNameMapByDoc, newAttachmentNamesByDoc);
  }

  /** Attaches FileManager uploads, routed per owner doc. Returns the original
   * filenames so the binary pass can skip upload widgets that also carry
   * `type="binary"` markup. */
  private routeUploads(
    strategy: AttachmentRoutingStrategy,
    newAttachmentNamesByDoc: AttachmentNamesByDoc,
    fileNameMapByDoc: FileNameMapByDoc,
  ): Set<string> {
    const fileManagerNames = new Set<string>();
    const consumedNodes = new Set<Element>();
    FileManager
      .getCurrentFiles()
      .forEach(file => {
        const node = findUploadNodeByFilename(strategy.root, file.name, consumedNodes);
        if (node) {
          consumedNodes.add(node);
        }
        const ownerDoc = node ? strategy.resolveOwnerForNode(node) : strategy.mainDoc;
        const sanitizedFileName = this.sanitizeFileName(file.name);
        const attachmentName = `${USER_FILE_PREFIX}${sanitizedFileName}`;

        this.attachmentService.add(ownerDoc, attachmentName, file, file.type, false);
        this.trackNewAttachment(newAttachmentNamesByDoc, ownerDoc, attachmentName);
        this.trackFileName(fileNameMapByDoc, ownerDoc, file.name, sanitizedFileName);
        fileManagerNames.add(file.name);
      });
    return fileManagerNames;
  }

  private routeInlineBinaries(
    strategy: AttachmentRoutingStrategy,
    fileManagerNames: Set<string>,
    newAttachmentNamesByDoc: AttachmentNamesByDoc,
  ) {
    $(strategy.root)
      .find('[type=binary]')
      .each((_idx, element: Element) => {
        this.routeOneBinary(strategy, element, fileManagerNames, newAttachmentNamesByDoc);
      });
  }

  /** Attaches an inline binary blob to its owner doc and mirrors the bare
   * reference into the doc's field value, so the renderer resolves the image via
   * `USER_FILE_PREFIX + value`. An untouched field (empty on edit) is restored
   * from its `data-attachment-ref` sidecar instead. */
  private routeOneBinary(
    strategy: AttachmentRoutingStrategy,
    element: Element,
    fileManagerNames: Set<string>,
    newAttachmentNamesByDoc: AttachmentNamesByDoc,
  ) {
    const $element = $(element);
    // Reference stashed at load for an untouched field (see bindJsonToXml);
    // it survives Enketo's model merge as a data-* attribute.
    const sidecar = $element.attr('data-attachment-ref');
    $element.removeAttr('data-attachment-ref');

    const content = $element.text();
    if (!content) {
      this.restoreUntouchedBinary(strategy, element, sidecar);
      return;
    }

    // Skip a type="file" widget whose blob the upload pass already attached; any
    // other non-empty value is fresh base64 (binary values are never inspected -
    // on edit the node is empty and handled above).
    if (fileManagerNames.has(content)) {
      return;
    }

    const ownerDoc = strategy.resolveOwnerForNode(element);
    const container = strategy.containerFor(element, ownerDoc);
    if (!container) {
      return; // no field container -> can't name the attachment
    }
    const reference = computeAttachmentReference(element, container);
    const attachmentName = `${USER_FILE_PREFIX}${reference}`;

    this.attachmentService.add(ownerDoc, attachmentName, content, 'image/png', true);
    this.trackNewAttachment(newAttachmentNamesByDoc, ownerDoc, attachmentName);

    const fieldPath = strategy.fieldPathFor(element, ownerDoc);
    if (fieldPath) {
      objectPath.set(ownerDoc, fieldPath, reference);
    }
  }

  /**
   * Restores an untouched inline-binary field on edit from its sidecar reference.
   * Restoring the value is enough: finalize's referenced-attachment scan keeps
   * the attachment.
   */
  private restoreUntouchedBinary(strategy: AttachmentRoutingStrategy, element: Element, sidecar?: string) {
    if (!sidecar) {
      return;
    }
    const ownerDoc = strategy.resolveOwnerForNode(element);
    const fieldPath = strategy.fieldPathFor(element, ownerDoc);
    if (fieldPath) {
      objectPath.set(ownerDoc, fieldPath, sidecar);
    }
  }

  /** Per-doc field-value sanitization + orphan cleanup. */
  private finalize(
    docs: Record<string, any>[],
    fileNameMapByDoc: FileNameMapByDoc,
    newAttachmentNamesByDoc: AttachmentNamesByDoc,
  ) {
    for (const doc of docs) {
      const nameMap = fileNameMapByDoc.get(doc) ?? new Map<string, string>();
      this.sanitizeFieldValues(doc, nameMap);

      const newNames = newAttachmentNamesByDoc.get(doc) ?? new Set<string>();
      const referenced = this.findReferencedAttachments(doc);
      const valid = new Set([ ...newNames, ...referenced ]);
      this.removeOrphanedAttachments(doc, valid);
    }
  }

  private trackNewAttachment(map: AttachmentNamesByDoc, doc: Record<string, any>, name: string) {
    const set = map.get(doc) ?? new Set<string>();
    set.add(name);
    map.set(doc, set);
  }

  private trackFileName(map: FileNameMapByDoc, doc: Record<string, any>, original: string, sanitized: string) {
    const names = map.get(doc) ?? new Map<string, string>();
    names.set(original, sanitized);
    map.set(doc, names);
  }

  /**
   * Sanitizes a file name by removing special characters.
   * Only allows letters (a-z, A-Z), numbers (0-9), underscores (_), dashes (-), and dots (.).
   * All other characters are removed.
   *
   * If sanitizing removes all characters from the file stem (e.g. a file name written entirely
   * in a non-Latin script like Devanagari), a UUID is used as the stem to ensure a valid file name.
   *
   * @param fileName - The file name to sanitize
   * @returns The sanitized file name with special characters removed, or a UUID-based name if
   *          the stem becomes empty after sanitization
   */
  private sanitizeFileName(fileName: string): string {
    const disallowedChars = /[^a-zA-Z0-9_.-]/g;
    const lastDotIndex = fileName.lastIndexOf('.');
    const hasExtension = lastDotIndex > 0;

    if (!hasExtension) {
      return fileName.replace(disallowedChars, '') || uuid(); // NOSONAR
    }

    const stem = fileName.slice(0, lastDotIndex);
    const extension = fileName.slice(lastDotIndex);
    const sanitizedStem = stem.replace(disallowedChars, ''); // NOSONAR
    return (sanitizedStem || uuid()) + extension;
  }

  /**
   * Finds all paths in a document that match a given filter predicate.
   * Returns paths in dot notation (e.g., 'photo', 'metadata.images.0.photo').
   *
   * Always skips keys starting with underscore (CouchDB internal fields like _id, _rev, _attachments).
   *
   * @param doc - The document to search
   * @param filter - Predicate function that returns true for values we want to find
   * @returns Array of paths in dot notation
   */
  private findPaths(
    doc: Record<string, any>,
    filter: (value: any) => boolean
  ): string[] {
    const paths: string[] = [];

    const traverse = (current: any, currentPath: string[] = []) => {
      if (filter(current)) {
        paths.push(currentPath.join('.'));
      }

      if (Array.isArray(current)) {
        current.forEach((item, idx) => traverse(item, [...currentPath, idx.toString()]));
      } else if (current && typeof current === 'object') {
        Object.entries(current).forEach(([key, value]) => {
          if (!key.startsWith('_')) {
            traverse(value, [...currentPath, key]);
          }
        });
      }
    };

    Object.entries(doc).forEach(([key, value]) => {
      if (!key.startsWith('_')) {
        traverse(value, [key]);
      }
    });

    return paths;
  }

  /**
   * Recursively scans through a document and replaces field values that reference
   * uploaded file names with their sanitized equivalents. Modifies the document in place.
   *
   * @param doc - The document to scan and modify
   * @param fileNameMap - Map of original file names to sanitized file names
   */
  private sanitizeFieldValues(doc: Record<string, any>, fileNameMap: Map<string, string>): void {
    const pathsToUpdate = this.findPaths(
      doc,
      value => typeof value === 'string' && fileNameMap.has(value)
    );

    pathsToUpdate.forEach(path => {
      const currentValue = objectPath.get(doc, path);
      objectPath.set(doc, path, fileNameMap.get(currentValue));
    });
  }

  private findReferencedAttachments(doc: Record<string, any>): Set<string> {
    const referenced = new Set<string>();
    if (!doc._attachments) {
      return referenced;
    }

    const existingAttachmentNames = Object.keys(doc._attachments);

    const isReferencedAttachment = (value: any): boolean => {
      if (typeof value !== 'string' || !value) {
        return false;
      }
      const possibleAttachmentName = `${USER_FILE_PREFIX}${value}`;
      return existingAttachmentNames.includes(possibleAttachmentName);
    };

    const referencedPaths = this.findPaths(doc, isReferencedAttachment);

    referencedPaths.forEach(path => {
      const value = objectPath.get(doc, path);
      referenced.add(`${USER_FILE_PREFIX}${value}`);
    });

    return referenced;
  }

  private removeOrphanedAttachments(doc: Record<string, any>, validAttachmentNames: Set<string>) {
    if (!doc._attachments) {
      return;
    }

    Object.keys(doc._attachments)
      .filter(name => name.startsWith(USER_FILE_PREFIX) && !validAttachmentNames.has(name))
      .forEach(name => this.attachmentService.remove(doc, name));
  }
}
