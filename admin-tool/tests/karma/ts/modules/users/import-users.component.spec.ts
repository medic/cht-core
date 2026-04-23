import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { TranslateModule } from '@ngx-translate/core';
import { ImportUsersComponent } from '@admin-tool-modules/users/ts/components/import-users/import-users.component';
import { CreateUserService } from '@admin-tool-services/create-user.service';
import { UsersService } from '@admin-tool-services/users.service';

interface CreateUserServiceMock {
  createMultipleUsers: SinonStub;
}

interface UsersServiceMock {
  notifyUsersUpdated: SinonStub;
}

describe('ImportUsersComponent', () => {
  let component: ImportUsersComponent;
  let fixture: ComponentFixture<ImportUsersComponent>;
  let createUserService: CreateUserServiceMock;
  let usersService: UsersServiceMock;

  const mockFile = (content: string, name = 'users.csv'): File => {
    return new File([content], name, { type: 'text/csv' });
  };

  const mockFileEvent = (file: File): Event => {
    const input = { files: [file] } as unknown as HTMLInputElement;
    return { target: input } as unknown as Event;
  };

  const stabilize = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
  };

  beforeEach(async () => {
    createUserService = { createMultipleUsers: sinon.stub() };
    usersService = { notifyUsersUpdated: sinon.stub() };

    await TestBed.configureTestingModule({
      imports: [ImportUsersComponent, TranslateModule.forRoot()],
      providers: [
        { provide: CreateUserService, useValue: createUserService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportUsersComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sinon.restore());

  describe('Zero', () => {
    it('should initialise on upload screen', () => {
      expect(component.screen).to.equal('upload');
    });

    it('should initialise with no filename', () => {
      expect(component.filename).to.equal('');
    });

    it('should initialise with no error', () => {
      expect(component.error).to.be.null;
    });

    it('should initialise with no summary', () => {
      expect(component.summary).to.be.null;
    });

    it('should initialise with visible false', () => {
      expect(component.visible).to.equal(false);
    });
  });

  describe('One', () => {
    it('should move to confirm screen when a file is selected', () => {
      const file = mockFile('username,password\nnight_wing,Str0ng!Pass99');
      component.onFileSelected(mockFileEvent(file));
      expect(component.screen).to.equal('confirm');
    });

    it('should set filename when a file is selected', () => {
      const file = mockFile('username,password\nnight_wing,Str0ng!Pass99', 'heroes.csv');
      component.onFileSelected(mockFileEvent(file));
      expect(component.filename).to.equal('heroes.csv');
    });

    it('should not change screen when no file is selected', () => {
      const event = { target: { files: [] } } as unknown as Event;
      component.onFileSelected(event);
      expect(component.screen).to.equal('upload');
    });
  });

  describe('Many', () => {
    it('should count successful imports correctly', async () => {
      createUserService.createMultipleUsers.resolves([
        { 'user-settings': { id: 'org.couchdb.user:night_wing' } },
        { 'user-settings': { id: 'org.couchdb.user:star_fire' } },
        { error: 'Username already taken' },
      ]);

      component.onFileSelected(mockFileEvent(mockFile('csv content')));
      await component.processUpload();

      expect(component.summary?.successful).to.equal(2);
      expect(component.summary?.failed).to.equal(1);
      expect(component.summary?.total).to.equal(3);
    });

    it('should count all failures when all rows error', async () => {
      createUserService.createMultipleUsers.resolves([
        { error: 'Invalid username' },
        { error: 'Invalid username' },
      ]);

      component.onFileSelected(mockFileEvent(mockFile('csv content')));
      await component.processUpload();

      expect(component.summary?.successful).to.equal(0);
      expect(component.summary?.failed).to.equal(2);
    });
  });

  describe('Boundaries', () => {
    it('should not call createMultipleUsers when no file is uploaded', async () => {
      await component.processUpload();
      expect(createUserService.createMultipleUsers.callCount).to.equal(0);
    });

    it('should handle empty API response array', async () => {
      createUserService.createMultipleUsers.resolves([]);
      component.onFileSelected(mockFileEvent(mockFile('csv content')));
      await component.processUpload();
      expect(component.summary?.total).to.equal(0);
      expect(component.summary?.successful).to.equal(0);
    });

    it('should handle non-array API response', async () => {
      createUserService.createMultipleUsers.resolves(null);
      component.onFileSelected(mockFileEvent(mockFile('csv content')));
      await component.processUpload();
      expect(component.summary?.total).to.equal(0);
    });

    it('should reset filename when backToUpload is called', () => {
      component.filename = 'heroes.csv';
      component.screen = 'confirm';
      component.backToUpload();
      expect(component.screen).to.equal('upload');
      expect(component.filename).to.equal('');
    });
  });

  describe('Interface', () => {
    it('should emit closed when cancel is called', () => {
      const closedSpy = sinon.spy();
      component.closed.subscribe(closedSpy);
      component.cancel();
      expect(closedSpy.callCount).to.equal(1);
    });

    it('should reset to upload screen when cancel is called', () => {
      component.screen = 'confirm';
      component.cancel();
      expect(component.screen).to.equal('upload');
    });

    it('should emit closed when finish is called', () => {
      const closedSpy = sinon.spy();
      component.closed.subscribe(closedSpy);
      component.finish();
      expect(closedSpy.callCount).to.equal(1);
    });

    it('should reset when finish is called', () => {
      component.screen = 'summary';
      component.filename = 'heroes.csv';
      component.finish();
      expect(component.screen).to.equal('upload');
      expect(component.filename).to.equal('');
    });

    it('should move to processing screen when processUpload is called', async () => {
      createUserService.createMultipleUsers.resolves([]);
      component.onFileSelected(mockFileEvent(mockFile('csv')));
      const promise = component.processUpload();
      expect(component.screen).to.equal('processing');
      await promise;
    });

    it('should move to summary screen after successful upload', async () => {
      createUserService.createMultipleUsers.resolves([
        { 'user-settings': { id: 'org.couchdb.user:night_wing' } },
      ]);
      component.onFileSelected(mockFileEvent(mockFile('csv')));
      await component.processUpload();
      expect(component.screen).to.equal('summary');
    });

    it('should notify usersService after successful upload', async () => {
      createUserService.createMultipleUsers.resolves([]);
      component.onFileSelected(mockFileEvent(mockFile('csv')));
      await component.processUpload();
      expect(usersService.notifyUsersUpdated.callCount).to.equal(1);
    });

    it('should call createMultipleUsers with the file text content', async () => {
      const csvContent = 'username,password\nnight_wing,Str0ng!Pass99';
      createUserService.createMultipleUsers.resolves([]);
      component.onFileSelected(mockFileEvent(mockFile(csvContent)));
      await component.processUpload();
      expect(createUserService.createMultipleUsers.calledWith(csvContent)).to.be.true;
    });
  });

  describe('Exceptions', () => {
    it('should show error and return to upload screen when API fails', async () => {
      createUserService.createMultipleUsers.rejects({ error: { message: 'Server error' } });
      component.onFileSelected(mockFileEvent(mockFile('csv')));
      await component.processUpload();
      expect(component.screen).to.equal('upload');
      expect(component.error).to.equal('Server error');
    });

    it('should show fallback error when API returns no message', async () => {
      createUserService.createMultipleUsers.rejects({});
      component.onFileSelected(mockFileEvent(mockFile('csv')));
      await component.processUpload();
      expect(component.error).to.equal('users.import.error');
    });

    it('should not notify usersService when upload fails', async () => {
      createUserService.createMultipleUsers.rejects({});
      component.onFileSelected(mockFileEvent(mockFile('csv')));
      await component.processUpload();
      expect(usersService.notifyUsersUpdated.callCount).to.equal(0);
    });
  });

  describe('Scenarios', () => {
    it('should complete full happy path: select file → confirm → process → summary', async () => {
      createUserService.createMultipleUsers.resolves([
        { 'user-settings': { id: 'org.couchdb.user:night_wing' } },
        { 'user-settings': { id: 'org.couchdb.user:star_fire' } },
      ]);

      // Step 1: select file
      component.onFileSelected(mockFileEvent(mockFile('csv', 'heroes.csv')));
      expect(component.screen).to.equal('confirm');
      expect(component.filename).to.equal('heroes.csv');

      // Step 2: confirm and process
      await component.processUpload();
      expect(component.screen).to.equal('summary');
      expect(component.summary?.successful).to.equal(2);
      expect(component.summary?.failed).to.equal(0);
    });

    it('should show modal when visible is true', async () => {
      component.visible = true;
      await stabilize();
      const modal = fixture.nativeElement.querySelector('.modal.in');
      expect(modal).to.exist;
    });

    it('should show upload screen by default', async () => {
      component.visible = true;
      await stabilize();
      const input = fixture.nativeElement.querySelector('input[type="file"]');
      expect(input).to.exist;
    });
  });
});
