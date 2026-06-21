import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import * as FileManager from '../../../../src/js/enketo/file-manager.js';
import { AttachmentService } from '@mm-services/attachment.service';
import { AttachmentRoutingService } from '@mm-services/attachment-routing.service';
import { AttachmentRoutingStrategy, computeFieldPath } from '@mm-services/attachment-routing';

describe('AttachmentRoutingService', () => {
  let service;
  let add;
  let remove;
  let getCurrentFiles;

  const parse = (xml: string): Element => new DOMParser().parseFromString(xml, 'text/xml').documentElement;

  // Single-doc strategy: every node routes to `doc`, field paths relative to root.
  const singleDocStrategy = (root: Element, doc: Record<string, any>): AttachmentRoutingStrategy => ({
    root,
    docs: [ doc ],
    mainDoc: doc,
    resolveOwnerForNode: () => doc,
    formIdFor: () => 'my-form',
    fieldPathFor: (element: Element) => computeFieldPath(element, root),
  });

  beforeEach(() => {
    add = sinon.stub();
    remove = sinon.stub();
    getCurrentFiles = sinon.stub(FileManager, 'getCurrentFiles').returns([]);
    TestBed.configureTestingModule({
      // EnketoTranslationService is left real (providedIn root) for isAttachmentRef.
      providers: [
        { provide: AttachmentService, useValue: { add, remove } },
      ],
    });
    service = TestBed.inject(AttachmentRoutingService);
  });

  afterEach(() => sinon.restore());

  it('routes uploads to the owner doc with a sanitized name and a synced field value', () => {
    const root = parse('<my-form><my_file type="file">a b!.png</my_file></my-form>');
    const file = { name: 'a b!.png', type: 'image/png' };
    getCurrentFiles.returns([ file ]);
    const doc: Record<string, any> = { my_file: 'a b!.png' };

    service.route(singleDocStrategy(root, doc));

    expect(add.calledOnce).to.be.true;
    expect(add.args[0][1]).to.equal('user-file-ab.png');
    expect(add.args[0][2]).to.equal(file);
    // finalize's sanitizeFieldValues syncs the field value to the sanitized name
    expect(doc.my_file).to.equal('ab.png');
  });

  it('attaches an inline binary and objectPath-sets the bare reference', () => {
    const root = parse('<my-form><photo type="binary">base64data</photo></my-form>');
    const doc: Record<string, any> = {};

    service.route(singleDocStrategy(root, doc));

    expect(add.calledOnce).to.be.true;
    expect(add.args[0][1]).to.equal('user-file-my-form/photo');
    expect(add.args[0][2]).to.equal('base64data');
    expect(doc).to.deep.equal({ photo: 'my-form/photo' });
  });

  it('skips empty, already-referenced, and upload-widget binaries', () => {
    const root = parse(
      '<my-form><empty type="binary"></empty><ref type="binary">my-form/ref</ref></my-form>'
    );
    const doc: Record<string, any> = {};

    service.route(singleDocStrategy(root, doc));

    expect(add.called).to.be.false;
  });

  it('restores an untouched binary from its data-attachment-ref sidecar', () => {
    const root = parse('<my-form><photo type="binary" data-attachment-ref="my-form/photo"></photo></my-form>');
    const doc: Record<string, any> = {};

    service.route(singleDocStrategy(root, doc));

    expect(add.called).to.be.false;
    expect(doc).to.deep.equal({ photo: 'my-form/photo' });
  });

  it('removes orphaned user-file attachments, sparing referenced/new/non-user-file names', () => {
    const root = parse('<my-form><name>x</name></my-form>');
    const doc: Record<string, any> = {
      name: 'x',
      _attachments: {
        'user-file-orphan': { stub: true },
        'user-file/slash': { stub: true },
        other: { stub: true },
      },
    };

    service.route(singleDocStrategy(root, doc));

    expect(remove.args.map(args => args[1])).to.deep.equal([ 'user-file-orphan' ]);
  });
});
