import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { AttachmentImageComponent } from '@mm-components/attachment-image/attachment-image.component';
import { DbService } from '@mm-services/db.service';

describe('AttachmentImageComponent', () => {
  let component: AttachmentImageComponent;
  let fixture: ComponentFixture<AttachmentImageComponent>;
  let getAttachment;
  let createObjectURL;
  let revokeObjectURL;
  let originalCreate;
  let originalRevoke;

  const blob = new Blob(['image-bytes'], { type: 'image/jpeg' });

  before(() => {
    originalCreate = window.URL.createObjectURL;
    originalRevoke = window.URL.revokeObjectURL;
  });

  beforeEach(async () => {
    getAttachment = sinon.stub().resolves(blob);
    const dbService = {
      get: () => ({ getAttachment }),
    };

    createObjectURL = sinon.stub().returns('blob:fake-url');
    revokeObjectURL = sinon.stub();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    await TestBed.configureTestingModule({
      imports: [AttachmentImageComponent],
      providers: [{ provide: DbService, useValue: dbService }],
    }).compileComponents();
    fixture = TestBed.createComponent(AttachmentImageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sinon.restore());

  after(() => {
    window.URL.createObjectURL = originalCreate;
    window.URL.revokeObjectURL = originalRevoke;
  });

  const setAttachment = (attachment) => {
    component.attachment = attachment;
    flush();
    fixture.detectChanges();
  };

  it('fetches the attachment and renders its object url', fakeAsync(() => {
    setAttachment({ docId: 'doc-1', name: 'user-file-amina.jpg' });

    expect(getAttachment.calledOnceWithExactly('doc-1', 'user-file-amina.jpg')).to.be.true;
    expect(createObjectURL.calledOnceWithExactly(blob)).to.be.true;

    const img = fixture.nativeElement.querySelector('img');
    expect(img).to.exist;
    expect(img.getAttribute('src')).to.equal('blob:fake-url');
  }));

  it('applies the alt input to the img', fakeAsync(() => {
    component.alt = 'Amina';
    setAttachment({ docId: 'doc-1', name: 'user-file-amina.jpg' });

    expect(fixture.nativeElement.querySelector('img').getAttribute('alt')).to.equal('Amina');
  }));

  it('renders the loader while fetching and nothing when no attachment is set', fakeAsync(() => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).to.be.null;
    expect(fixture.nativeElement.querySelector('.loader')).to.be.null;
    expect(getAttachment.called).to.be.false;

    component.attachment = { docId: 'doc-1', name: 'user-file-amina.jpg' };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.loader')).to.exist;

    flush();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.loader')).to.be.null;
    expect(fixture.nativeElement.querySelector('img')).to.exist;
  }));

  it('revokes the previous object url when the attachment changes', fakeAsync(() => {
    setAttachment({ docId: 'doc-1', name: 'user-file-amina.jpg' });
    expect(revokeObjectURL.called).to.be.false;

    createObjectURL.returns('blob:fake-url-2');
    setAttachment({ docId: 'doc-2', name: 'user-file-bob.jpg' });

    expect(revokeObjectURL.calledOnceWithExactly('blob:fake-url')).to.be.true;
    expect(getAttachment.calledTwice).to.be.true;
    expect(getAttachment.args[1]).to.deep.equal(['doc-2', 'user-file-bob.jpg']);
  }));

  it('revokes the object url when the attachment is cleared', fakeAsync(() => {
    setAttachment({ docId: 'doc-1', name: 'user-file-amina.jpg' });

    setAttachment(undefined);

    expect(revokeObjectURL.calledOnceWithExactly('blob:fake-url')).to.be.true;
    expect(component.objectUrl).to.be.undefined;
    expect(fixture.nativeElement.querySelector('img')).to.be.null;
  }));

  it('revokes the object url on destroy', fakeAsync(() => {
    setAttachment({ docId: 'doc-1', name: 'user-file-amina.jpg' });

    component.ngOnDestroy();

    expect(revokeObjectURL.calledOnceWithExactly('blob:fake-url')).to.be.true;
  }));

  it('logs getAttachment errors and stops loading', fakeAsync(() => {
    const consoleError = sinon.stub(console, 'error');
    getAttachment.rejects({ status: 500 });

    setAttachment({ docId: 'doc-1', name: 'user-file-amina.jpg' });

    expect(component.objectUrl).to.be.undefined;
    expect(component.loading).to.be.false;
    expect(consoleError.calledOnce).to.be.true;
    expect(consoleError.args[0][0]).to.equal('AttachmentImageComponent :: Error loading attachment.');
    expect(consoleError.args[0][1]).to.deep.include({ status: 500 });
  }));
});
