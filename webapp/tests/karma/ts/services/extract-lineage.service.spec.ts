import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { AuthService } from '@mm-services/auth.service';

describe('ExtractLineageService', () => {
  let service: ExtractLineageService;
  let userSettingsService;
  let userContactService;
  let authService;

  beforeEach(() => {
    userSettingsService = { get: sinon.stub() };
    userContactService = { get: sinon.stub() };
    authService = { online: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: UserContactService, useValue: userContactService },
        { provide: UserSettingsService, useValue: userSettingsService },
        { provide: AuthService, useValue: authService },
      ]
    });
    service = TestBed.inject(ExtractLineageService);
  });

  afterEach(() => sinon.restore());

  it('should be created', () => {
    expect(service).to.exist;
  });

  describe('extract()', () => {
    it('returns nothing when given nothing', () => {
      expect(service.extract(null)).to.equal(null);
    });

    it('extracts orphan', () => {
      const contact = { _id: 'a', name: 'jim' };
      const expected = { _id: 'a' };

      expect(service.extract(contact)).to.deep.equal(expected);
    });

    it('extracts lineage', () => {
      const contact = {
        _id: 'a',
        name: 'jim',
        parent: {
          _id: 'b',
          age: 55,
          parent: {
            _id: 'c',
            sex: true,
            parent: {
              _id: 'd'
            }
          }
        }
      };
      const expected = {
        _id: 'a',
        parent: {
          _id: 'b',
          parent: {
            _id: 'c',
            parent: {
              _id: 'd'
            }
          }
        }
      };

      expect(service.extract(contact)).to.deep.equal(expected);
      // ensure the original contact is unchanged
      expect(contact.parent.age).to.equal(55);
    });
  });

  describe('getUserLineageToRemove()', () => {
    it('should return null when user is type online', async () => {
      authService.online.returns(true);

      const result = await service.getUserLineageToRemove();

      expect(result).to.be.null;
    });

    it('should return null when user has more than one assigned facility', async () => {
      authService.online.returns(false);
      userSettingsService.get.resolves({ facility_id: [ 'id-1', 'id-2' ] });

      const result = await service.getUserLineageToRemove();

      expect(result).to.be.null;
    });

    it('should return null when parent is not defined', async () => {
      authService.online.returns(false);
      userSettingsService.get.resolves({ facility_id: [ 'id-1', 'id-2' ] });
      userContactService.get.resolves({ parent: undefined });

      const result = await service.getUserLineageToRemove();

      expect(result).to.be.null;
    });

    it('should return facility name when user is type offline and has only one assigned facility', async () => {
      authService.online.returns(false);
      userSettingsService.get.resolves({ facility_id: 'id-1' });
      userContactService.get.resolves({ parent: { name: 'Kisumu Area' } });

      const resultWithString = await service.getUserLineageToRemove();

      expect(resultWithString).to.equal('Kisumu Area');

      userSettingsService.get.resolves({ facility_id: [ 'id-5' ] });
      userContactService.get.resolves({ parent: { name: 'Kakamega Area' } });

      const resultWithArray = await service.getUserLineageToRemove();

      expect(resultWithArray).to.equal('Kakamega Area');
    });
  });

  describe('removeUserFacility()', () => {
    it('should return undefined when lineage is empty or undefined', () => {
      const resultWithUndefined = service.removeUserFacility(undefined as any, 'Kakamega Area');

      expect(resultWithUndefined).to.be.undefined;

      const resultWithEmpty = service.removeUserFacility([], 'Kakamega Area');

      expect(resultWithEmpty).to.be.undefined;
    });

    it('should filter empty strings when no need to remove facility associated to user', () => {
      const resultWithEmpty = service.removeUserFacility([ '', 'place-1', '', 'place-2', '' ], 'Kakamega Area');

      expect(resultWithEmpty).to.have.members([ 'place-1', 'place-2' ]);
    });

    it('should filter empty strings and remove facility associated to user', () => {
      const resultWithEmpty = service.removeUserFacility(
        [ '', 'place-1', '', 'place-2', '', 'Kakamega Area' ],
        'Kakamega Area'
      );

      expect(resultWithEmpty).to.have.members([ 'place-1', 'place-2' ]);
    });
  });
});
