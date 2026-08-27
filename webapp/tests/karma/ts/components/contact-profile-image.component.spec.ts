import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';

import { ContactProfileImageComponent } from '@mm-components/contact-profile-image/contact-profile-image.component';
import { AttachmentImageComponent } from '@mm-components/attachment-image/attachment-image.component';
import { Selectors } from '@mm-selectors/index';
import { DbService } from '@mm-services/db.service';
import { CustomResourceService } from '@mm-services/custom-resource.service';

describe('ContactProfileImageComponent', () => {
  let component: ContactProfileImageComponent;
  let fixture: ComponentFixture<ContactProfileImageComponent>;
  let store: MockStore;
  let getAttachment;
  let customResourceService;

  beforeEach(() => {
    const mockedSelectors = [
      { selector: Selectors.getSelectedContact, value: null },
    ];
    getAttachment = sinon.stub().resolves(new Blob(['image-bytes'], { type: 'image/jpeg' }));
    customResourceService = {
      getImg: sinon.stub().returns('<span class="resource-icon"></span>'),
    };

    return TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ContactProfileImageComponent,
      ],
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: DbService, useValue: { get: () => ({ getAttachment }) } },
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
    store.resetSelectors();
    sinon.restore();
  });

  const selectContact = (selectedContact) => {
    store.overrideSelector(Selectors.getSelectedContact, selectedContact);
    store.refreshState();
    flush();
    fixture.detectChanges();
  };

  const getAttachmentImage = () => fixture.debugElement
    .query(el => el.componentInstance instanceof AttachmentImageComponent)
    ?.componentInstance;

  it('renders an attachment image when the selected contact has a profile image', fakeAsync(() => {
    selectContact({
      doc: {
        _id: 'c-1',
        name: 'Amina',
        profile_image: 'amina.jpg',
        _attachments: { 'user-file-amina.jpg': { content_type: 'image/jpeg', stub: true } },
      },
      type: { icon: 'medic-person' },
    });

    expect(component.attachment).to.deep.equal({ docId: 'c-1', name: 'user-file-amina.jpg' });
    expect(getAttachment.calledOnceWithExactly('c-1', 'user-file-amina.jpg')).to.be.true;
    expect(fixture.nativeElement.querySelector('.resource-icon')).to.be.null;
  }));

  it('passes the contact name to the attachment image as alt text', fakeAsync(() => {
    selectContact({
      doc: {
        _id: 'c-1',
        name: 'Amina',
        profile_image: 'amina.jpg',
        _attachments: { 'user-file-amina.jpg': { stub: true } },
      },
      type: {},
    });

    expect(getAttachmentImage().alt).to.equal('Amina');
  }));

  it('renders the type icon when the doc has no profile image field', fakeAsync(() => {
    selectContact({ doc: { _id: 'c-1', _attachments: {} }, type: { icon: 'medic-person' } });

    expect(component.attachment).to.be.undefined;
    expect(getAttachment.called).to.be.false;
    expect(component.fallbackIcon).to.equal('medic-person');
    expect(customResourceService.getImg.calledWith('medic-person')).to.be.true;
    expect(getAttachmentImage()).to.be.undefined;
  }));

  it('renders the type icon when the profile image has no matching attachment stub', fakeAsync(() => {
    selectContact({
      doc: { _id: 'c-1', profile_image: 'amina.jpg', _attachments: {} },
      type: { icon: 'medic-person' },
    });

    expect(component.attachment).to.be.undefined;
    expect(getAttachment.called).to.be.false;
  }));

  it('renders nothing when no contact is selected', fakeAsync(() => {
    selectContact(null);

    expect(component.attachment).to.be.undefined;
    expect(component.fallbackIcon).to.be.undefined;
    expect(getAttachment.called).to.be.false;
    expect(getAttachmentImage()).to.be.undefined;
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

    expect(component.attachment).to.deep.equal({ docId: 'c-1', name: 'user-file-amina.jpg' });
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

    expect(component.attachment).to.deep.equal({ docId: 'c-1', name: 'user-file-amina.jpg' });
  }));

  it('re-resolves the attachment when the selected doc changes', fakeAsync(() => {
    selectContact({
      doc: {
        _id: 'c-1',
        profile_image: 'amina.jpg',
        _attachments: { 'user-file-amina.jpg': { stub: true } },
      },
      type: {},
    });

    selectContact({
      doc: {
        _id: 'c-2',
        profile_image: 'bob.jpg',
        _attachments: { 'user-file-bob.jpg': { stub: true } },
      },
      type: {},
    });

    expect(component.attachment).to.deep.equal({ docId: 'c-2', name: 'user-file-bob.jpg' });
    expect(getAttachment.calledTwice).to.be.true;
    expect(getAttachment.args[1]).to.deep.equal(['c-2', 'user-file-bob.jpg']);
  }));

  it('does not re-resolve when the selected contact emits with an unchanged doc', fakeAsync(() => {
    const doc = {
      _id: 'c-1',
      profile_image: 'amina.jpg',
      _attachments: { 'user-file-amina.jpg': { stub: true } },
    };
    selectContact({ doc, type: {} });
    expect(getAttachment.callCount).to.equal(1);

    selectContact({ doc, type: {}, children: [] });

    expect(getAttachment.callCount).to.equal(1);
  }));

  it('unsubscribes on destroy', fakeAsync(() => {
    const unsubscribe = sinon.spy(component.subscription, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribe.calledOnce).to.be.true;
  }));
});
