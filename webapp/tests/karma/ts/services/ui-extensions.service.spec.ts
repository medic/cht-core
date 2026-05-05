import sinon from 'sinon';
import { expect } from 'chai';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { UiExtensionsService } from '@mm-services/ui-extensions.service';
import { SessionService } from '@mm-services/session.service';

describe('UiExtensionsService', () => {
  let service: UiExtensionsService;
  let sessionService;
  let http;

  beforeEach(() => {
    sessionService = { hasRole: sinon.stub() };
    http = { get: sinon.stub().returns(of([])) };

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: HttpClient, useValue: http },
      ]
    });

    service = TestBed.inject(UiExtensionsService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('init()', () => {
    it('should load extension properties only on first call', async () => {
      const extensions = [
        { id: 'ext-1', type: 'tab' },
        { id: 'ext-2', type: 'tab' },
      ];
      http.get.returns(of(extensions));

      await service.getPropertiesByType('tab');

      expect(http.get.calledOnceWithExactly('/ui-extension', { responseType: 'json' })).to.be.true;

      await service.getPropertiesByType('tab');
      await service.getProperties('ext-1');

      // Not fetched again on later requests
      expect(http.get.callCount).to.equal(1);
    });

    it('should handle empty extensions list', async () => {
      http.get.returns(of([]));

      const result = await service.getPropertiesByType('tab');

      expect(http.get.callCount).to.equal(1);
      expect(result).to.deep.equal([]);
    });

    it('should handle error when loading extension properties', async () => {
      http.get.returns(throwError(() => new Error('Network error')));

      const result = await service.getPropertiesByType('tab');

      expect(result).to.deep.equal([]);
    });
  });

  describe('role filtering', () => {
    it('should keep extensions with no roles configured', async () => {
      const extensions = [
        { id: 'ext-1', type: 'tab' },
        { id: 'ext-2', type: 'tab', roles: [] },
      ];
      http.get.returns(of(extensions));

      const result = await service.getPropertiesByType('tab');

      expect(result).to.have.length(2);
    });

    it('should keep extensions where user has at least one matching role', async () => {
      const extensions = [
        { id: 'ext-1', type: 'tab', roles: ['chw', 'nurse'] },
      ];
      http.get.returns(of(extensions));
      sessionService.hasRole.withArgs('chw').returns(false);
      sessionService.hasRole.withArgs('nurse').returns(true);

      const result = await service.getPropertiesByType('tab');

      expect(result).to.have.length(1);
    });

    it('should remove extensions where user has no matching role', async () => {
      const extensions = [
        { id: 'ext-1', type: 'tab', roles: ['chw', 'nurse'] },
      ];
      http.get.returns(of(extensions));
      sessionService.hasRole.returns(false);

      const result = await service.getPropertiesByType('tab');

      expect(result).to.have.length(0);
    });

    it('should correctly mix allowed and filtered extensions', async () => {
      const extensions = [
        { id: 'ext-1', type: 'tab' },
        { id: 'ext-2', type: 'tab', roles: ['chw'] },
        { id: 'ext-3', type: 'tab', roles: ['admin'] },
      ];
      http.get.returns(of(extensions));
      sessionService.hasRole.withArgs('chw').returns(true);
      sessionService.hasRole.withArgs('admin').returns(false);

      const result = await service.getPropertiesByType('tab');

      expect(result).to.have.length(2);
      expect(result.map(e => e.id)).to.deep.equal(['ext-1', 'ext-2']);
    });
  });

  describe('getPropertiesByType()', () => {
    it('should return all extensions with the given type', async () => {
      const extensions = [
        { id: 'ext-1', type: 'tab' },
        { id: 'ext-2', type: 'tab' },
        { id: 'ext-3', type: 'banner' },
      ];
      http.get.returns(of(extensions));

      const tabs = await service.getPropertiesByType('tab');

      expect(tabs).to.have.length(2);
      expect(tabs.map(e => e.id)).to.deep.equal(['ext-1', 'ext-2']);
    });

    it('should return empty array when no extensions match type', async () => {
      const extensions = [{ id: 'ext-1', type: 'banner' }];
      http.get.returns(of(extensions));

      const result = await service.getPropertiesByType('tab');

      expect(result).to.deep.equal([]);
    });
  });

  describe('getProperties()', () => {
    it('should return properties for given id', async () => {
      const extensions = [
        { id: 'ext-1', type: 'tab', title: 'My Tab' },
        { id: 'ext-2', type: 'banner' },
      ];
      http.get.returns(of(extensions));

      const result = await service.getProperties('ext-1');

      expect(result).to.deep.equal({ id: 'ext-1', type: 'tab', title: 'My Tab' });
    });

    it('should throw for unknown id', async () => {
      http.get.returns(of([{ id: 'ext-1', type: 'tab' }]));

      await expect(service.getProperties('unknown-id')).to.be.rejectedWith(
        'UI Extension with id [unknown-id] not found.'
      );
    });
  });

  describe('getExtension()', () => {
    it('should load and return extension with Element and cache it', async () => {
      const extensions = [{ id: 'ext-1', type: 'tab' }];
      http.get.onCall(0).returns(of(extensions));
      http.get.onCall(1).returns(of(
        'module.exports = class HelloWorldComponent extends HTMLElement {}'
      ));

      const result = await service.getExtension('ext-1');

      expect(result).to.not.be.undefined;
      expect(result.properties).to.deep.equal({ id: 'ext-1', type: 'tab' });
      expect(result.Element.prototype).to.be.an.instanceof(HTMLElement);
      expect(http.get.callCount).to.equal(2);
      expect(http.get.args[1][0]).to.equal('/ui-extension/ext-1');
      expect(http.get.args[1][1]).to.deep.equal({ responseType: 'text' });

      await service.getExtension('ext-1');

      // cached extensions are not re-fetched.
      expect(http.get.callCount).to.equal(2);
    });

    it('should throw for unknown extension id', async () => {
      http.get.returns(of([]));

      await expect(service.getExtension('unknown-id')).to.be.rejectedWith(
        'UI Extension with id [unknown-id] not found.'
      );
    });

    it('should throw when extension script fails to load', async () => {
      const extensions = [{ id: 'ext-1', type: 'tab' }];
      http.get.onCall(0).returns(of(extensions));
      http.get.onCall(1).returns(throwError(() => new Error('Script load failed')));

      await expect(service.getExtension('ext-1')).to.be.rejectedWith('Script load failed');
    });

    it('should throw when script does not export an HTMLElement subclass', async () => {
      const extensions = [{ id: 'ext-1', type: 'tab' }];
      http.get.onCall(0).returns(of(extensions));
      http.get.onCall(1).returns(of(
        'module.exports = function myComponent() { return "hello"; }'
      ));

      await expect(service.getExtension('ext-1')).to.be.rejectedWith(
        'Could not load UI Extension element with id [ext-1].'
      );
    });
  });
});
