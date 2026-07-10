import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import * as FileManager from '../../../../src/js/enketo/file-manager.js';
import { AttachmentService } from '@mm-services/attachment.service';
import { AttachmentRoutingService } from '@mm-services/attachment-routing.service';
import { AttachmentRoutingStrategy, computeFieldPath } from '@mm-providers/attachment-routing.provider';

describe('AttachmentRoutingService', () => {
  let service;
  let add;
  let remove;
  let getCurrentFiles;

  const parse = (xml: string): Element => new DOMParser().parseFromString(xml, 'text/xml').documentElement;

  // Single-doc strategy: every node routes to `doc`, container and field paths
  // are both relative to root.
  const singleDocStrategy = (root: Element, doc: Record<string, any>): AttachmentRoutingStrategy => ({
    root,
    docs: [ doc ],
    mainDoc: doc,
    resolveOwnerForNode: () => doc,
    containerFor: () => root,
    fieldPathFor: (element: Element) => computeFieldPath(element, root),
  });

  // Each section's nodes route to its doc; everything else to `mainDoc`. Mirrors
  // the main+sub routing the report/contact strategies build.
  const sectionStrategy = (
    root: Element,
    mainDoc: Record<string, any>,
    sections: { el: Element; doc: Record<string, any> }[],
  ): AttachmentRoutingStrategy => {
    const sectionFor = (element: Element) => sections.find(s => s.el.contains(element));
    const containerFor = (element: Element) => sectionFor(element)?.el ?? root;
    return {
      root,
      docs: [ mainDoc, ...sections.map(s => s.doc) ],
      mainDoc,
      resolveOwnerForNode: (element: Element) => sectionFor(element)?.doc ?? mainDoc,
      containerFor,
      fieldPathFor: (element: Element) => computeFieldPath(element, containerFor(element)),
    };
  };

  beforeEach(() => {
    add = sinon.stub();
    remove = sinon.stub();
    getCurrentFiles = sinon.stub(FileManager, 'getCurrentFiles').returns([]);
    TestBed.configureTestingModule({
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

  it('attaches an inline binary and objectPath-sets the bare relative reference', () => {
    const root = parse('<my-form><photo type="binary">base64data</photo></my-form>');
    const doc: Record<string, any> = {};

    service.route(singleDocStrategy(root, doc));

    expect(add.calledOnce).to.be.true;
    expect(add.args[0][1]).to.equal('user-file-photo');
    expect(add.args[0][2]).to.equal('base64data');
    expect(doc).to.deep.equal({ photo: 'photo' });
  });

  it('skips an empty binary (no content to attach)', () => {
    const root = parse('<my-form><empty type="binary"></empty></my-form>');
    const doc: Record<string, any> = {};

    service.route(singleDocStrategy(root, doc));

    expect(add.called).to.be.false;
  });

  it('skips a binary whose blob the upload pass already attached', () => {
    const root = parse('<my-form><widget type="binary">up.png</widget></my-form>');
    getCurrentFiles.returns([ { name: 'up.png', type: 'image/png' } ]);
    const doc: Record<string, any> = {};

    service.route(singleDocStrategy(root, doc));

    // only the upload widget's blob is attached; the binary pass does not re-attach it
    expect(add.args.map(args => args[1])).to.deep.equal([ 'user-file-up.png' ]);
  });

  // A draw/signature widget in a sub-doc, tracked by FileManager but still
  // type="binary". Its upload must route to the sub-doc it lives in, not fall back
  // to the main doc, or the blob and the field value split across docs.
  it('routes a type=binary widget upload to its sub-doc, not the main doc', () => {
    const root = parse(
      '<my-form><name>p</name>' +
        '<child db-doc="true"><signature type="binary">Sig 12_30_45.png</signature></child>' +
      '</my-form>'
    );
    const file = { name: 'Sig 12_30_45.png', type: 'image/png' };
    getCurrentFiles.returns([ file ]);
    const mainDoc: Record<string, any> = { name: 'p' };
    const subEl = root.getElementsByTagName('child')[0];
    const subDoc: Record<string, any> = { signature: 'Sig 12_30_45.png' };

    service.route(sectionStrategy(root, mainDoc, [ { el: subEl, doc: subDoc } ]));

    // the blob and the field-value rewrite both land on the sub-doc
    expect(add.calledOnce).to.be.true;
    expect(add.args[0][0]).to.equal(subDoc);
    expect(add.args[0][1]).to.equal('user-file-Sig12_30_45.png');
    expect(subDoc.signature).to.equal('Sig12_30_45.png');
    // main doc keeps its own value and gets no attachment
    expect(mainDoc).to.deep.equal({ name: 'p' });
  });

  // Two files uploaded in the same second share a name (the postfix is only
  // second-resolution). Each must claim its own node so the blobs land on distinct
  // sub-docs; without node consumption both resolve to the first node and the
  // second sub-doc's field points at a missing attachment.
  it('maps same-named files in different sub-docs to distinct docs', () => {
    const root = parse(
      '<my-form>' +
        '<a db-doc="true"><photo type="binary">dup-12_30_45.png</photo></a>' +
        '<b db-doc="true"><photo type="binary">dup-12_30_45.png</photo></b>' +
      '</my-form>'
    );
    getCurrentFiles.returns([
      { name: 'dup-12_30_45.png', type: 'image/png' },
      { name: 'dup-12_30_45.png', type: 'image/png' },
    ]);
    const mainDoc: Record<string, any> = {};
    const aEl = root.getElementsByTagName('a')[0];
    const bEl = root.getElementsByTagName('b')[0];
    const aDoc: Record<string, any> = { photo: 'dup-12_30_45.png' };
    const bDoc: Record<string, any> = { photo: 'dup-12_30_45.png' };

    service.route(sectionStrategy(root, mainDoc, [ { el: aEl, doc: aDoc }, { el: bEl, doc: bDoc } ]));

    // one blob on each sub-doc, none on the main doc
    const targets = add.args.map(args => args[0]);
    expect(targets).to.have.members([ aDoc, bDoc ]);
    expect(add.args.every(args => args[1] === 'user-file-dup-12_30_45.png')).to.be.true;
    expect(aDoc.photo).to.equal('dup-12_30_45.png');
    expect(bDoc.photo).to.equal('dup-12_30_45.png');
  });

  it('restores an untouched binary from its data-attachment-ref sidecar', () => {
    const root = parse('<my-form><photo type="binary" data-attachment-ref="photo"></photo></my-form>');
    const doc: Record<string, any> = {};

    service.route(singleDocStrategy(root, doc));

    expect(add.called).to.be.false;
    expect(doc).to.deep.equal({ photo: 'photo' });
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

  // finalize runs orphan cleanup on every prepared doc, not just the main one.
  // Replacing a sub-doc upload must drop the sub-doc's stale user-file-<old> while
  // the main doc's referenced attachment is left untouched.
  it('removes a stale attachment from a sub-doc, sparing the main doc', () => {
    const root = parse(
      '<my-form><name>parent</name>' +
        '<child db-doc="true"><photo type="file">new_upload.png</photo></child>' +
      '</my-form>'
    );
    getCurrentFiles.returns([ { name: 'new_upload.png', type: 'image/png' } ]);
    const mainDoc: Record<string, any> = {
      name: 'parent',
      photo: 'keep.png',
      _attachments: { 'user-file-keep.png': { stub: true } },
    };
    const childEl = root.getElementsByTagName('child')[0];
    const subDoc: Record<string, any> = {
      photo: 'new_upload.png',
      _attachments: { 'user-file-old.png': { stub: true } },
    };

    service.route(sectionStrategy(root, mainDoc, [ { el: childEl, doc: subDoc } ]));

    // new blob lands on the sub-doc
    expect(add.args.find(args => args[1] === 'user-file-new_upload.png')?.[0]).to.equal(subDoc);
    // only the sub-doc's stale attachment is removed; the main doc is untouched
    expect(remove.calledOnce).to.be.true;
    expect(remove.args[0][0]).to.equal(subDoc);
    expect(remove.args[0][1]).to.equal('user-file-old.png');
  });
});
