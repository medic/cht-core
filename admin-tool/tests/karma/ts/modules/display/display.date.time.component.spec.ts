import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { DisplayDateTimeComponent } from '@admin-tool-modules/display/display-date-time/display-date-time.component';
import { SettingsService } from '@admin-tool-services/settings.service';
import moment from 'moment';

describe('DisplayDateTimeComponent', () => {
  let component: DisplayDateTimeComponent;
  let fixture: ComponentFixture<DisplayDateTimeComponent>;
  let settingsService;

  beforeEach(waitForAsync(() => {
    settingsService = {
      getDateTimeSettings: sinon.stub().resolves({
        dateFormat: 'DD/MM/YYYY',
        dateTimeFormat: 'MM/DD/YYYY HH:mm:ss',
      }),
      updateDateTimeSettings: sinon.stub().resolves(),
    };

    return TestBed.configureTestingModule({
      imports: [DisplayDateTimeComponent],
      providers: [{ provide: SettingsService, useValue: settingsService }],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DisplayDateTimeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => sinon.restore());

  it('should create', () => {
    expect(component).to.exist;
  });

  describe('initial state', () => {
    it('should have 3 standard date formats', () => {
      expect(component.standardDateFormats).to.have.length(3);
    });

    it('should have 3 standard datetime formats', () => {
      expect(component.standardDatetimeFormats).to.have.length(3);
    });

    it('should start with empty responseStatus', () => {
      expect(component.responseStatus).to.deep.equal({});
    });
  });

  describe('isValidMomentDateFormat', () => {
    const validFormats = [
      'DD/MM/YYYY',
      'DD-MMM-YYYY',
      'MM/DD/YYYY',
      'DD-MMM-YYYY HH:mm:ss',
      'DD/MM/YYYY HH:mm:ss',
      'MM/DD/YYYY HH:mm:ss',
      'Do MMM YYYY',
      'YYYY-MM-DD',
      'MMMM D, YYYY',
      'DD/MM/YYYY HH:mm:ss A',
    ];

    const invalidFormats = ['AAAA-BB-CC', '', '    '];

    validFormats.forEach((format) => {
      it(`should return true for valid format: ${format}`, () => {
        expect(component['isValidMomentDateFormat'](format)).to.be.true;
      });
    });

    invalidFormats.forEach((format) => {
      it(`should return false for invalid format: ${format}`, () => {
        expect(component['isValidMomentDateFormat'](format)).to.be.false;
      });
    });
  });

  describe('resolveDateFormat', () => {
    it('should return the format if valid and already in list', () => {
      const result = component['resolveDateFormat']('DD/MM/YYYY', component.standardDateFormats);
      expect(result).to.equal('DD/MM/YYYY');
    });

    it('should not add format to list if already in list', () => {
      const initialLength = component.standardDateFormats.length;
      component['resolveDateFormat']('DD/MM/YYYY', component.standardDateFormats);
      expect(component.standardDateFormats.length).to.equal(initialLength);
    });

    it('should return the format if valid and not in list', () => {
      const result = component['resolveDateFormat']('YYYY-MM-DD', component.standardDateFormats);
      expect(result).to.equal('YYYY-MM-DD');
    });

    it('should add format to list if valid and not in list', () => {
      const initialLength = component.standardDateFormats.length;
      component['resolveDateFormat']('YYYY-MM-DD', component.standardDateFormats);
      expect(component.standardDateFormats.length).to.equal(initialLength + 1);
    });

    it('should return first format if format is invalid', () => {
      const result = component['resolveDateFormat']('AAAA-BB-CC', component.standardDateFormats);
      expect(result).to.equal(component.standardDateFormats[0]);
    });

    it('should return first format if format is empty', () => {
      const result = component['resolveDateFormat']('', component.standardDateFormats);
      expect(result).to.equal(component.standardDateFormats[0]);
    });

    it('should work with standardDatetimeFormats too', () => {
      const result = component['resolveDateFormat']('DD/MM/YYYY HH:mm:ss', component.standardDatetimeFormats);
      expect(result).to.equal('DD/MM/YYYY HH:mm:ss');
    });
  });

  describe('ngOnInit', () => {
    it('should call getDateTimeSettings on init', () => {
      expect(settingsService.getDateTimeSettings.calledOnce).to.be.true;
    });

    it('should set dateFormatSelection from settings', async () => {
      await fixture.whenStable();
      expect(component.dateFormatSelection).to.equal('DD/MM/YYYY');
    });

    it('should set dateTimeFormatSelection from settings', async () => {
      await fixture.whenStable();
      expect(component.dateTimeFormatSelection).to.equal('MM/DD/YYYY HH:mm:ss');
    });

    it('should add custom valid format to standardDateFormats', async () => {
      settingsService.getDateTimeSettings.resolves({
        dateFormat: 'YYYY-MM-DD',
        dateTimeFormat: 'MM/DD/YYYY HH:mm:ss',
      });
      await component.ngOnInit();
      expect(component.standardDateFormats).to.include('YYYY-MM-DD');
    });
    it('should add custom valid format to standardDatetimeFormats', async () => {
      settingsService.getDateTimeSettings.resolves({
        dateFormat: 'DD/MM/YYYY',
        dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
      });
      await component.ngOnInit();
      expect(component.standardDatetimeFormats).to.include('YYYY-MM-DD HH:mm:ss');
    });

    it('should use first format as default when dateFormat is invalid', async () => {
      settingsService.getDateTimeSettings.resolves({
        dateFormat: 'AAAA-BB-CC',
        dateTimeFormat: 'MM/DD/YYYY HH:mm:ss',
      });
      await component.ngOnInit();
      expect(component.dateFormatSelection).to.equal(component.standardDateFormats[0]);
    });

    it('should use first format as default when dateTimeFormat is invalid', async () => {
      settingsService.getDateTimeSettings.resolves({
        dateFormat: 'DD/MM/YYYY',
        dateTimeFormat: 'AAAA-BB-CC',
      });
      await component.ngOnInit();
      expect(component.dateTimeFormatSelection).to.equal(component.standardDatetimeFormats[0]);
    });

    it('should set dateFormatExample using moment', async () => {
      await fixture.whenStable();
      expect(component.dateFormatExample).to.exist;
    });

    it('should set dateTimeFormatExample using moment', async () => {
      await fixture.whenStable();
      expect(component.dateTimeFormatExample).to.exist;
    });

    it('should handle error if getDateTimeSettings fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      settingsService.getDateTimeSettings.rejects(new Error('error'));
      await component.ngOnInit();
      expect(consoleStub.calledOnce).to.be.true;
    });
  });

  describe('onDataFormSelected', () => {
    it('should update dataFormatSelection', () => {
      component.onDateFormatSelected('MM/DD/YYYY');
      expect(component.dateFormatSelection).to.equal('MM/DD/YYYY');
    });

    it('should update dateFormatExample', () => {
      component.onDateFormatSelected('MM/DD/YYYY');
      expect(component.dateFormatExample).to.exist;
    });

    it('should update dataFormatExample with new format', () => {
      component.onDateFormatSelected('MM/DD/YYYY');
      expect(component.dateFormatExample).to.equal(moment().format('MM/DD/YYYY'));
    });
  });

  describe('onDateTimeFormatSelected', () => {
    it('should update dateTimeFormatSelection', () => {
      component.onDateTimeFormatSelected('MM/DD/YYYY HH:mm:ss');
      expect(component.dateTimeFormatSelection).to.equal('MM/DD/YYYY HH:mm:ss');
    });

    it('should update dateTimeFormatExample', () => {
      component.onDateTimeFormatSelected('MM/DD/YYYY HH:mm:ss');
      expect(component.dateTimeFormatExample).to.exist;
    });

    it('should update dateTimeFormatExample with new format', () => {
      component.onDateTimeFormatSelected('MM/DD/YYYY HH:mm:ss');
      expect(component.dateTimeFormatExample).to.equal(moment().format('MM/DD/YYYY HH:mm:ss'));
    });
  });

  describe('setSettingsDate', () => {
    it('should set loading true at start', () => {
      component.setSettingsDate();
      expect(component.responseStatus.state).to.equal('loading');
    });

    it('should call updateDateTimeSettings with correct values', async () => {
      component.dateFormatSelection = 'DD/MM/YYYY';
      component.dateTimeFormatSelection = 'MM/DD/YYYY HH:mm:ss';
      await component.setSettingsDate();
      expect(settingsService.updateDateTimeSettings.calledOnce).to.be.true;
      expect(
        settingsService.updateDateTimeSettings.calledWith({
          dateFormat: 'DD/MM/YYYY',
          dateTimeFormat: 'MM/DD/YYYY HH:mm:ss',
        }),
      ).to.be.true;
    });

    it('should set success true on success', async () => {
      await component.setSettingsDate();
      expect(component.responseStatus.state).to.equal('success');
    });

    it('should set success message after update', async () => {
      await component.setSettingsDate();
      expect(component.responseStatus.msg).to.equal('Saved');
    });
    it('should set error true when update fails', async () => {
      settingsService.updateDateTimeSettings.rejects(new Error('error'));
      await component.setSettingsDate();
      expect(component.responseStatus.state).to.equal('error');
    });

    it('should set error message when update fails', async () => {
      settingsService.updateDateTimeSettings.rejects(new Error('error'));
      await component.setSettingsDate();
      expect(component.responseStatus.msg).to.equal('Error updating settings');
    });

    it('should call console.error when update fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      settingsService.updateDateTimeSettings.rejects(new Error('error'));
      await component.setSettingsDate();
      expect(consoleStub.calledOnce).to.be.true;
    });
  });

  describe('DOM', () => {
    it('should render the submit button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('button[type="submit"]')).to.exist;
    });

    it('should disable submit button when loading', () => {
      component.responseStatus = { state: 'loading' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).to.be.true;
    });

    it('should enable submit button when not loading', () => {
      component.responseStatus = {};
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).to.be.false;
    });

    it('should show loader when loading', () => {
      component.responseStatus = { state: 'loading' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader')).to.exist;
    });

    it('should not show loader when not loading', () => {
      component.responseStatus = {};
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader')).to.not.exist;
    });

    it('should show error message when error', () => {
      component.responseStatus = { state: 'error', msg: 'Error updating settings' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.error')).to.exist;
    });

    it('should show correct error message', () => {
      component.responseStatus = { state: 'error', msg: 'Error updating settings' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.error')!.textContent).to.include('Error updating settings');
    });

    it('should show success message when success', () => {
      component.responseStatus = { state: 'success', msg: 'Saved' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.success')).to.exist;
    });

    it('should show correct success message', () => {
      component.responseStatus = { state: 'success', msg: 'Saved' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.success')!.textContent).to.include('Saved');
    });

    it('should render 3 date format options', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const dropdowns = compiled.querySelectorAll('.dropdown-menu');
      const options = dropdowns[0].querySelectorAll('li');
      expect(options.length).to.equal(3);
    });

    it('should render 3 datetime format options', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const dropdowns = compiled.querySelectorAll('.dropdown-menu');
      const options = dropdowns[1].querySelectorAll('li');
      expect(options.length).to.equal(3);
    });
  });
});
