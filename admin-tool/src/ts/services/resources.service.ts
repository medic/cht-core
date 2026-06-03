import { Injectable } from '@angular/core';
import { DbService } from '@admin-tool-services/db.service';
import { ResourceAttachment, ResourcesDoc } from '@admin-tool-modules/resources-interfaces';

/**
 * Service responsible for loading and resolving icon resources from CouchDB.
 * Icons are stored as attachments in the 'resources' document.
 * The resources map links icon names to their attachment filenames.
 */
@Injectable({
  providedIn: 'root'
})
export class ResourcesService {

  constructor(private db: DbService) {}

  /**
   * Fetches the resources document from CouchDB including all attachment data.
   * attachments: true is required to retrieve the base64 content of each icon.
   *
   * @returns {Promise<ResourcesDoc>}
   */
  async getResources(): Promise<ResourcesDoc> {
    return this.db.get().get('resources', { attachments: true });
  }

  /**
   * Resolves an icon name to its renderable content using the resources document.
   * SVG icons are returned as decoded inline HTML strings.
   * PNG and other formats are returned as base64 data URIs.
   * Returns empty content if the icon name is missing, the attachment does not exist,
   * or the attachment has no data.
   *
   * @param {string} iconName - the icon name as stored in the form document (e.g. 'icon-death-general')
   * @param {ResourcesDoc} doc - the resources document fetched with attachments: true
   * @returns {{ isSvg: boolean; content: string }}
   */
  getIconContent(iconName: string, doc: ResourcesDoc): { isSvg: boolean; content: string } {
    if (!iconName || !doc.resources || !doc._attachments) {
      return { isSvg: false, content: '' };
    }

    const attachmentName = doc.resources[iconName];
    if (!attachmentName) {
      return { isSvg: false, content: '' };
    }

    const attachment: ResourceAttachment = doc._attachments[attachmentName];
    if (!attachment?.data) {
      return { isSvg: false, content: '' };
    }

    if (attachment.content_type === 'image/svg+xml') {
      return { isSvg: true, content: atob(attachment.data) };
    }

    return { isSvg: false, content: `data:${attachment.content_type};base64,${attachment.data}` };
  }
}
