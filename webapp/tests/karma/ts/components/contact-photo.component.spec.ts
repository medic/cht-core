import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';

import { ContactPhotoComponent } from '@mm-components/contact-photo/contact-photo.component';
import { DbService } from '@mm-services/db.service';
import { ResourceIconsService } from '@mm-services/resource-icons.service';

describe('ContactPhotoComponent', () => {
  let component: ContactPhotoComponent;
  let fixture: ComponentFixture<ContactPhotoComponent>;
  let getAttachment;
  let get;
  let createObjectURL;
  let revokeObjectURL;
  let originalCreate;
  let originalRevoke;
  let resourceIconsService;

  const photoBlob = new Blob(['photo-bytes'], { type: 'image/jpeg' });

  beforeEach(() => {
    getAttachment = sinon.stub().resolves(photoBlob);
    get = sinon.stub();
    const dbService = {
      get: () => ({ getAttachment, get }),
    };
    resourceIconsService = {
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
        ContactPhotoComponent,
      ],
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: ResourceIconsService, useValue: resourceIconsService },
      ],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ContactPhotoComponent);
        component = fixture.componentInstance;
      });
  });

  afterEach(() => {
    window.URL.createObjectURL = originalCreate;
    window.URL.revokeObjectURL = originalRevoke;
    sinon.restore();
  });

  const setDoc = async (doc) => {
    component.doc = doc;
    await component.ngOnChanges({
      doc: { currentValue: doc, previousValue: undefined, firstChange: true, isFirstChange: () => true },
    } as any);
    fixture.detectChanges();
  };

  it('loads blob when doc has matching photo and attachment stub', async () => {
    await setDoc({
      _id: 'c-1',
      photo: 'amina.jpg',
      _attachments: { 'user-file-amina.jpg': { content_type: 'image/jpeg', stub: true } },
    });

    expect(getAttachment.calledOnceWithExactly('c-1', 'user-file-amina.jpg')).to.be.true;
    expect(createObjectURL.calledOnceWith(photoBlob)).to.be.true;
    expect(component.objectUrl).to.exist;
  });

  it('renders no img and skips fetch when doc has no photo field', async () => {
    await setDoc({ _id: 'c-1', _attachments: {} });

    expect(getAttachment.called).to.be.false;
    expect(component.objectUrl).to.be.undefined;
  });

  it('skips fetch when photo field set but no matching attachment stub', async () => {
    await setDoc({ _id: 'c-1', photo: 'amina.jpg', _attachments: {} });

    expect(getAttachment.called).to.be.false;
    expect(component.objectUrl).to.be.undefined;
  });

  it('falls back silently when getAttachment rejects with 404', async () => {
    const warn = sinon.stub(console, 'warn');
    getAttachment.rejects({ status: 404 });

    await setDoc({
      _id: 'c-1',
      photo: 'amina.jpg',
      _attachments: { 'user-file-amina.jpg': { stub: true } },
    });

    expect(component.objectUrl).to.be.undefined;
    expect(warn.calledOnce).to.be.true;
  });

  it('rethrows getAttachment errors other than 404', async () => {
    getAttachment.rejects({ status: 500 });

    component.doc = {
      _id: 'c-1',
      photo: 'amina.jpg',
      _attachments: { 'user-file-amina.jpg': { stub: true } },
    };
    let err;
    try {
      await component.ngOnChanges({
        doc: { currentValue: component.doc, previousValue: undefined, firstChange: true, isFirstChange: () => true },
      } as any);
    } catch (e) {
      err = e;
    }
    expect(err).to.deep.include({ status: 500 });
  });

  it('defaults photoField to "photo" when input is unbound or undefined', async () => {
    await setDoc({
      _id: 'c-1',
      photo: 'amina.jpg',
      _attachments: { 'user-file-amina.jpg': { stub: true } },
    });

    expect(getAttachment.calledWith('c-1', 'user-file-amina.jpg')).to.be.true;

    getAttachment.resetHistory();
    component.photoField = undefined;
    await setDoc({
      _id: 'c-2',
      photo: 'bob.jpg',
      _attachments: { 'user-file-bob.jpg': { stub: true } },
    });
    expect(getAttachment.calledWith('c-2', 'user-file-bob.jpg')).to.be.true;
  });

  it('honours an explicit photoField override', async () => {
    component.photoField = 'picture';
    await setDoc({
      _id: 'c-1',
      picture: 'amina.jpg',
      _attachments: { 'user-file-amina.jpg': { stub: true } },
    });

    expect(getAttachment.calledOnceWith('c-1', 'user-file-amina.jpg')).to.be.true;
  });

  it('falls back to docId fetch when doc input is not provided', async () => {
    get.resolves({
      _id: 'c-1',
      photo: 'amina.jpg',
      _attachments: { 'user-file-amina.jpg': { stub: true } },
    });
    component.docId = 'c-1';
    await component.ngOnChanges({
      docId: { currentValue: 'c-1', previousValue: undefined, firstChange: true, isFirstChange: () => true },
    } as any);

    expect(get.calledOnceWith('c-1')).to.be.true;
    expect(getAttachment.calledOnceWith('c-1', 'user-file-amina.jpg')).to.be.true;
  });

  it('revokes prior object URL and re-fetches on doc input change', async () => {
    await setDoc({
      _id: 'c-1',
      photo: 'amina.jpg',
      _attachments: { 'user-file-amina.jpg': { stub: true } },
    });
    expect(createObjectURL.callCount).to.equal(1);

    createObjectURL.returns('blob:fake-url-2');
    await setDoc({
      _id: 'c-2',
      photo: 'bob.jpg',
      _attachments: { 'user-file-bob.jpg': { stub: true } },
    });

    expect(revokeObjectURL.calledOnceWith('blob:fake-url')).to.be.true;
    expect(createObjectURL.callCount).to.equal(2);
    expect(getAttachment.calledWith('c-2', 'user-file-bob.jpg')).to.be.true;
  });

  it('revokes the object URL on destroy', async () => {
    await setDoc({
      _id: 'c-1',
      photo: 'amina.jpg',
      _attachments: { 'user-file-amina.jpg': { stub: true } },
    });

    component.ngOnDestroy();

    expect(revokeObjectURL.calledOnceWith('blob:fake-url')).to.be.true;
  });
});
