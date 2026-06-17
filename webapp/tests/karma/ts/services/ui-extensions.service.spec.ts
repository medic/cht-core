import sinon from 'sinon';
import { expect } from 'chai';
import { TestBed } from '@angular/core/testing';

import { UiExtensionsService } from '@mm-services/ui-extensions.service';
import { SessionService } from '@mm-services/session.service';
import { DbService } from '@mm-services/db.service';
import { DOC_TYPES, PREFIXES } from '@medic/constants';

describe('UiExtensionsService', () => {
  let service: UiExtensionsService;
  let sessionService;
  let dbService;
  let allDocs;
  let getAttachment;

  const toDoc = ({ id, ...rest }) => ({
    _id: `${PREFIXES.UI_EXTENSION}${id}`,
    type: DOC_TYPES.UI_EXTENSION,
    ...rest,
  });

  const toProps = ({ id, ...rest }) => ({
    _id: `${PREFIXES.UI_EXTENSION}${id}`,
    type: DOC_TYPES.UI_EXTENSION,
    ...rest,
    id,
  });

  const mockExtensions = (extensions: any[], extraRows: any[] = []) => {
    const rows = extensions.map(ext => ({ doc: toDoc(ext) })).concat(extraRows);
    allDocs.resolves({ rows });
  };

  beforeEach(() => {
    sessionService = { hasRole: sinon.stub() };
    allDocs = sinon.stub().resolves({ rows: [] });
    getAttachment = sinon.stub();
    dbService = { get: sinon.stub().returns({ allDocs, getAttachment }) };

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: DbService, useValue: dbService },
      ]
    });

    service = TestBed.inject(UiExtensionsService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('init()', () => {
    it('should load extension properties only on first call', async () => {
      mockExtensions([
        { id: 'ext-1', extension_type: 'tab' },
        { id: 'ext-2', extension_type: 'tab' },
      ]);

      await service.getPropertiesByType('tab');

      expect(allDocs.calledOnceWithExactly({
        startkey: PREFIXES.UI_EXTENSION,
        endkey: `${PREFIXES.UI_EXTENSION}\ufff0`,
        include_docs: true,
      })).to.be.true;

      await service.getPropertiesByType('tab');
      await service.getProperties('ext-1');

      // Not fetched again on later requests
      expect(allDocs.callCount).to.equal(1);
    });

    it('should handle empty extensions list', async () => {
      allDocs.resolves({ rows: [] });

      const result = await service.getPropertiesByType('tab');

      expect(allDocs.callCount).to.equal(1);
      expect(result).to.deep.equal([]);
    });

    it('should ignore docs in the range that are not ui-extension docs', async () => {
      mockExtensions(
        [{ id: 'ext-1', extension_type: 'tab' }],
        [{ doc: { _id: 'ui-extension:not-an-extension', type: 'something-else', extension_type: 'tab' } }],
      );

      const result = await service.getPropertiesByType('tab');

      expect(result.map(e => e.id)).to.deep.equal(['ext-1']);
    });

    it('should handle error when loading extension properties', async () => {
      allDocs.rejects(new Error('Database error'));

      const result = await service.getPropertiesByType('tab');

      expect(result).to.deep.equal([]);
    });
  });

  describe('role filtering', () => {
    it('should keep extensions with no roles configured', async () => {
      mockExtensions([
        { id: 'ext-1', extension_type: 'tab' },
        { id: 'ext-2', extension_type: 'tab', roles: [] },
        { id: 'ext-3', extension_type: 'tab', roles: null },
      ]);

      const result = await service.getPropertiesByType('tab');

      expect(result).to.have.length(3);
    });

    it('should keep extensions where user has at least one matching role', async () => {
      mockExtensions([
        { id: 'ext-1', extension_type: 'tab', roles: ['chw', 'nurse'] },
      ]);
      sessionService.hasRole.withArgs('chw').returns(false);
      sessionService.hasRole.withArgs('nurse').returns(true);

      const result = await service.getPropertiesByType('tab');

      expect(result).to.have.length(1);
    });

    it('should remove extensions where user has no matching role or roles is malformed', async () => {
      mockExtensions([
        { id: 'ext-1', extension_type: 'tab', roles: ['chw', 'nurse'] },
        { id: 'ext-2', extension_type: 'tab', roles: 'chw' },
      ]);
      sessionService.hasRole.returns(false);

      const result = await service.getPropertiesByType('tab');

      expect(result).to.have.length(0);
    });

    it('should correctly mix allowed and filtered extensions', async () => {
      mockExtensions([
        { id: 'ext-1', extension_type: 'tab' },
        { id: 'ext-2', extension_type: 'tab', roles: ['chw'] },
        { id: 'ext-3', extension_type: 'tab', roles: ['admin'] },
      ]);
      sessionService.hasRole.withArgs('chw').returns(true);
      sessionService.hasRole.withArgs('admin').returns(false);

      const result = await service.getPropertiesByType('tab');

      expect(result).to.have.length(2);
      expect(result.map(e => e.id)).to.deep.equal(['ext-1', 'ext-2']);
    });
  });

  describe('getPropertiesByType()', () => {
    it('should return all extensions with the given type', async () => {
      mockExtensions([
        { id: 'ext-1', extension_type: 'tab' },
        { id: 'ext-2', extension_type: 'tab' },
        { id: 'ext-3', extension_type: 'banner' },
      ]);

      const tabs = await service.getPropertiesByType('tab');

      expect(tabs).to.have.length(2);
      expect(tabs.map(e => e.id)).to.deep.equal(['ext-1', 'ext-2']);
    });

    it('should return empty array when no extensions match type', async () => {
      mockExtensions([{ id: 'ext-1', extension_type: 'banner' }]);

      const result = await service.getPropertiesByType('tab');

      expect(result).to.deep.equal([]);
    });

    it('should sort weighted extensions before unweighted ones', async () => {
      mockExtensions([
        { id: 'ext-a', extension_type: 'tab' },
        { id: 'ext-b', extension_type: 'tab', weight: 5 },
      ]);

      const result = await service.getPropertiesByType('tab');

      expect(result.map(e => e.id)).to.deep.equal(['ext-b', 'ext-a']);
    });

    it('should sort weighted extensions ascending by weight', async () => {
      mockExtensions([
        { id: 'ext-a', extension_type: 'tab', weight: 10 },
        { id: 'ext-b', extension_type: 'tab', weight: 1 },
        { id: 'ext-c', extension_type: 'tab', weight: 5 },
      ]);

      const result = await service.getPropertiesByType('tab');

      expect(result.map(e => e.id)).to.deep.equal(['ext-b', 'ext-c', 'ext-a']);
    });

    it('should sort unweighted extensions alphabetically by id', async () => {
      mockExtensions([
        { id: 'ext-c', extension_type: 'tab' },
        { id: 'ext-a', extension_type: 'tab' },
        { id: 'ext-b', extension_type: 'tab' },
      ]);

      const result = await service.getPropertiesByType('tab');

      expect(result.map(e => e.id)).to.deep.equal(['ext-a', 'ext-b', 'ext-c']);
    });

    it('should sort weighted before unweighted, each group sorted internally', async () => {
      mockExtensions([
        { id: 'ext-c', extension_type: 'tab' },
        { id: 'ext-d', extension_type: 'tab', weight: 10 },
        { id: 'ext-a', extension_type: 'tab' },
        { id: 'ext-e', extension_type: 'tab', weight: 1 },
      ]);

      const result = await service.getPropertiesByType('tab');

      expect(result.map(e => e.id)).to.deep.equal(['ext-e', 'ext-d', 'ext-a', 'ext-c']);
    });
  });

  describe('getProperties()', () => {
    it('should return properties for given id', async () => {
      mockExtensions([
        { id: 'ext-1', extension_type: 'tab', title: 'My Tab' },
        { id: 'ext-2', extension_type: 'banner' },
      ]);

      const result = await service.getProperties('ext-1');

      expect(result).to.deep.equal(toProps({ id: 'ext-1', extension_type: 'tab', title: 'My Tab' }));
    });

    it('should throw for unknown id', async () => {
      mockExtensions([{ id: 'ext-1', extension_type: 'tab' }]);

      await expect(service.getProperties('unknown-id')).to.be.rejectedWith(
        'UI Extension with id [unknown-id] not found.'
      );
    });
  });

  describe('getExtension()', () => {
    it('should load and return extension with Element and cache it', async () => {
      mockExtensions([{ id: 'ext-1', extension_type: 'tab' }]);
      getAttachment.resolves(new Blob(['module.exports = class HelloWorldComponent extends HTMLElement {}']));

      const result = await service.getExtension('ext-1');

      expect(result).to.not.be.undefined;
      expect(result.properties).to.deep.equal(toProps({ id: 'ext-1', extension_type: 'tab' }));
      expect(result.Element.prototype).to.be.an.instanceof(HTMLElement);
      expect(getAttachment.callCount).to.equal(1);
      expect(getAttachment.args[0]).to.deep.equal([`${PREFIXES.UI_EXTENSION}ext-1`, 'extension.js']);

      await service.getExtension('ext-1');

      // cached extensions are not re-fetched.
      expect(getAttachment.callCount).to.equal(1);
    });

    it('should throw for unknown extension id', async () => {
      allDocs.resolves({ rows: [] });

      await expect(service.getExtension('unknown-id')).to.be.rejectedWith(
        'UI Extension with id [unknown-id] not found.'
      );
    });

    it('should throw when extension script fails to load', async () => {
      mockExtensions([{ id: 'ext-1', extension_type: 'tab' }]);
      getAttachment.rejects(new Error('Script load failed'));

      await expect(service.getExtension('ext-1')).to.be.rejectedWith('Script load failed');
    });

    it('should throw when script does not export an HTMLElement subclass', async () => {
      mockExtensions([{ id: 'ext-1', extension_type: 'tab' }]);
      getAttachment.resolves(new Blob(['module.exports = function myComponent() { return "hello"; }']));

      await expect(service.getExtension('ext-1')).to.be.rejectedWith(
        'Could not load UI Extension element with id [ext-1].'
      );
    });
  });
});
