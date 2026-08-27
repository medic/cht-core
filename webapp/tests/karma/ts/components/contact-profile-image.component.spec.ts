import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';

import { ContactProfileImageComponent } from '@mm-components/contact-profile-image/contact-profile-image.component';
import { Selectors } from '@mm-selectors/index';
import { DbService } from '@mm-services/db.service';
import { CustomResourceService } from '@mm-services/custom-resource.service';

describe('ContactProfileImageComponent', () => {
  let component: ContactProfileImageComponent;
  let fixture: ComponentFixture<ContactProfileImageComponent>;
  let store: MockStore;
  let getAttachment;
  let createObjectURL;
  let revokeObjectURL;
  let originalCreate;
  let originalRevoke;
  let customResourceService;

  const profileImageBlob = new Blob(['profile-image-bytes'], { type: 'image/jpeg' });

  beforeEach(() => {
    const mockedSelectors = [
      { selector: Selectors.getSelectedContact, value: null },
    ];
    getAttachment = sinon.stub().resolves(profileImageBlob);
    const dbService = {
      get: () => ({ getAttachment }),
    };
    customResourceService = {
      getImg: sinon.stub().returns('<svg/>'),
    };

    createObjectURL = sinon.stub().returns('blob:fake-url');
    revokeObjectURL = sinon.stub();
    originalCreate = window.URL.createObjectURL;
    originalRevoke = window.URL.revokeObjectURL;
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    return TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ContactProfileImageComponent,
      ],
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: DbService, useValue: dbService },
        { provide: CustomResourceService, useValue: customResourceService },
      ],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ContactProfileImageComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
  });

  afterEach(() => {
    window.URL.createObjectURL = originalCreate;
    window.URL.revokeObjectURL = originalRevoke;
    store.resetSelectors();
    sinon.restore();
  });

  const selectContact = (selectedContact) => {
    store.overrideSelector(Selectors.getSelectedContact, selectedContact);
    store.refreshState();
    flush();
    fixture.detectChanges();
  };

  it('loads blob when the selected contact has a profile image and attachment stub', fakeAsync(() => {
    selectContact({
      doc: {
        _id: 'c-1',
        profile_image: 'amina.jpg',
        _attachments: { 'user-file-amina.jpg': { content_type: 'image/jpeg', stub: true } },
      },
      type: { icon: 'medic-person' },
    });

    expect(getAttachment.calledOnceWithExactly('c-1', 'user-file-amina.jpg')).to.be.true;
    expect(createObjectURL.calledOnceWith(profileImageBlob)).to.be.true;
    expect(component.objectUrl).to.equal('blob:fake-url');
    expect(fixture.nativeElement.querySelector('img.contact-profile-image')).to.exist;
  }));

  it('renders the fallback icon and skips fetch when the doc has no profile image field', fakeAsync(() => {
    selectContact({ doc: { _id: 'c-1', _attachments: {} }, type: { icon: 'medic-person' } });

    expect(getAttachment.called).to.be.false;
    expect(component.objectUrl).to.be.undefined;
    expect(component.fallbackIcon).to.equal('medic-person');
    expect(fixture.nativeElement.querySelector('img.contact-profile-image')).to.be.null;
  }));

  it('skips fetch when profile image field set but no matching attachment stub', fakeAsync(() => {
    selectContact({ doc: { _id: 'c-1', profile_image: 'amina.jpg', _attachments: {} }, type: {} });

    expect(getAttachment.called).to.be.false;
    expect(component.objectUrl).to.be.undefined;
  }));

  it('skips fetch when no contact is selected', fakeAsync(() => {
    selectContact(null);

    expect(getAttachment.called).to.be.false;
    expect(component.doc).to.be.undefined;
    expect(component.fallbackIcon).to.be.undefined;
  }));

  it('logs getAttachment errors', fakeAsync(() => {
    const consoleError = sinon.stub(console, 'error');
    getAttachment.rejects({ status: 500 });

    selectContact({
      doc: {
        _id: 'c-1',
        profile_image: 'amina.jpg',
        _attachments: { 'user-file-amina.jpg': { stub: true } },
      },
      type: {},
    });

    expect(component.objectUrl).to.be.undefined;
    expect(component.loading).to.be.false;
    expect(consoleError.calledOnce).to.be.true;
    expect(consoleError.args[0][0]).to.equal('ContactProfileImageComponent :: Error loading profile image.');
    expect(consoleError.args[0][1]).to.deep.include({ status: 500 });
  }));

  it('defaults the profile image field to "profile_image"', fakeAsync(() => {
    selectContact({
      doc: {
        _id: 'c-1',
        profile_image: 'amina.jpg',
        _attachments: { 'user-file-amina.jpg': { stub: true } },
      },
      type: { icon: 'medic-person' },
    });

    expect(getAttachment.calledOnceWithExactly('c-1', 'user-file-amina.jpg')).to.be.true;
  }));

  it('honours the profile_image_field configured on the contact type', fakeAsync(() => {
    selectContact({
      doc: {
        _id: 'c-1',
        picture: 'amina.jpg',
        _attachments: { 'user-file-amina.jpg': { stub: true } },
      },
      type: { profile_image_field: 'picture' },
    });

    expect(getAttachment.calledOnceWithExactly('c-1', 'user-file-amina.jpg')).to.be.true;
  }));

  it('revokes prior object URL and re-fetches when the selected doc changes', fakeAsync(() => {
    selectContact({
      doc: {
        _id: 'c-1',
        profile_image: 'amina.jpg',
        _attachments: { 'user-file-amina.jpg': { stub: true } },
      },
      type: {},
    });
    expect(createObjectURL.callCount).to.equal(1);

    createObjectURL.returns('blob:fake-url-2');
    selectContact({
      doc: {
        _id: 'c-2',
        profile_image: 'bob.jpg',
        _attachments: { 'user-file-bob.jpg': { stub: true } },
      },
      type: {},
    });

    expect(revokeObjectURL.calledOnceWith('blob:fake-url')).to.be.true;
    expect(createObjectURL.callCount).to.equal(2);
    expect(getAttachment.calledWith('c-2', 'user-file-bob.jpg')).to.be.true;
  }));

  it('does not re-fetch when the selected contact emits with an unchanged doc', fakeAsync(() => {
    const doc = {
      _id: 'c-1',
      profile_image: 'amina.jpg',
      _attachments: { 'user-file-amina.jpg': { stub: true } },
    };
    selectContact({ doc, type: {} });
    expect(getAttachment.callCount).to.equal(1);

    selectContact({ doc, type: {}, children: [] });

    expect(getAttachment.callCount).to.equal(1);
    expect(revokeObjectURL.called).to.be.false;
  }));

  it('unsubscribes and revokes the object URL on destroy', fakeAsync(() => {
    selectContact({
      doc: {
        _id: 'c-1',
        profile_image: 'amina.jpg',
        _attachments: { 'user-file-amina.jpg': { stub: true } },
      },
      type: {},
    });
    const unsubscribe = sinon.spy(component.subscription, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribe.calledOnce).to.be.true;
    expect(revokeObjectURL.calledOnceWith('blob:fake-url')).to.be.true;
  }));
});
