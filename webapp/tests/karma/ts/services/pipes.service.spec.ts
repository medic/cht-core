import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { DatePipe } from '@angular/common';

import { PipesService } from '@mm-services/pipes.service';
import { HeaderLogoPipe, PartnerImagePipe, ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import {
  AgePipe,
  AutoreplyPipe,
  DateOfDeathPipe,
  DayMonthPipe,
  FullDatePipe,
  RelativeDatePipe,
  RelativeDayPipe,
  SimpleDatePipe,
  SimpleDateTimePipe,
  StatePipe,
  TaskDueDatePipe,
  WeeksPregnantPipe
} from '@mm-pipes/date.pipe';
import {
  ClinicPipe, LineagePipe, SummaryPipe, TitlePipe
} from '@mm-pipes/message.pipe';
import { FormIconNamePipe } from '@mm-pipes/form-icon-name.pipe';
import { FormIconPipe } from '@mm-pipes/form-icon.pipe';
import { SafeHtmlPipe } from '@mm-pipes/safe-html.pipe';
import { PhonePipe } from '@mm-pipes/phone.pipe';
import { TranslateFromPipe } from '@mm-pipes/translate-from.pipe';
import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';

describe('PipesService', () => {
  let pipes;
  let service:PipesService;

  const genPipe = (name) => {
    const pipe = { transform: sinon.stub() };
    pipes.set(name, pipe);
    return pipe;
  };

  beforeEach(() => {
    pipes = new Map();

    TestBed.configureTestingModule({
      providers: [
        { provide: HeaderLogoPipe, useValue: genPipe('HeaderLogoPipe') },
        { provide: PartnerImagePipe, useValue: genPipe('PartnerImagePipe') },
        { provide: ResourceIconPipe, useValue: genPipe('ResourceIconPipe') },
        { provide: AgePipe, useValue: genPipe('AgePipe') },
        { provide: AutoreplyPipe, useValue: genPipe('AutoreplyPipe') },
        { provide: DateOfDeathPipe, useValue: genPipe('DateOfDeathPipe') },
        { provide: DayMonthPipe, useValue: genPipe('DayMonthPipe') },
        { provide: FullDatePipe, useValue: genPipe('FullDatePipe') },
        { provide: RelativeDatePipe, useValue: genPipe('RelativeDatePipe') },
        { provide: RelativeDayPipe, useValue: genPipe('RelativeDayPipe') },
        { provide: SimpleDatePipe, useValue: genPipe('SimpleDatePipe') },
        { provide: SimpleDateTimePipe, useValue: genPipe('SimpleDateTimePipe') },
        { provide: StatePipe, useValue: genPipe('StatePipe') },
        { provide: TaskDueDatePipe, useValue: genPipe('TaskDueDatePipe') },
        { provide: WeeksPregnantPipe, useValue: genPipe('WeeksPregnantPipe') },
        { provide: ClinicPipe, useValue: genPipe('ClinicPipe') },
        { provide: LineagePipe, useValue: genPipe('LineagePipe') },
        { provide: SummaryPipe, useValue: genPipe('SummaryPipe') },
        { provide: TitlePipe, useValue: genPipe('TitlePipe') },
        { provide: FormIconNamePipe, useValue: genPipe('FormIconNamePipe') },
        { provide: FormIconPipe, useValue: genPipe('FormIconPipe') },
        { provide: SafeHtmlPipe, useValue: genPipe('SafeHtmlPipe') },
        { provide: PhonePipe, useValue: genPipe('PhonePipe') },
        { provide: TranslateFromPipe, useValue: genPipe('TranslateFromPipe') },
        { provide: DatePipe, useValue: genPipe('DatePipe') },
        { provide: LocalizeNumberPipe, useValue: genPipe('LocalizeNumberPipe') },
      ],
    });
    service = TestBed.inject(PipesService);
  });

  afterEach(() => sinon.restore());

  describe('transform', () => {
    it('should return nothing when no pipe', () => {
      expect(service.transform('')).to.equal(undefined);
    });

    it('should return nothing when missing pipe', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      expect(service.transform('pipe', 'value')).to.equal('value');
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Invalid pipe');
    });

    it('should call pipe and return value', () => {
      pipes.get('WeeksPregnantPipe').transform.returns('weeksPregnant_result_value');
      pipes.get('PhonePipe').transform.returns('PhonePipe_result_value');
      expect(service.transform('weeksPregnant',  'weeks')).to.equal('weeksPregnant_result_value');
      expect(service.transform('phone', 'phone')).to.equal('PhonePipe_result_value');
      expect(pipes.get('WeeksPregnantPipe').transform.callCount).to.equal(1);
      expect(pipes.get('WeeksPregnantPipe').transform.args[0]).to.deep.equal(['weeks']);
      expect(pipes.get('PhonePipe').transform.callCount).to.equal(1);
      expect(pipes.get('PhonePipe').transform.args[0]).to.deep.equal(['phone']);
    });

    it('should call pipes with params', () => {
      pipes.get('SummaryPipe').transform.returns('SummaryPipe return value');
      const value = service.transform('summary', 'summarise', 'param1', 'param2');
      expect(value).to.equal('SummaryPipe return value');
      expect(pipes.get('SummaryPipe').transform.callCount).to.equal(1);
      expect(pipes.get('SummaryPipe').transform.args[0]).to.deep.equal(['summarise', 'param1', 'param2']);
    });
  });

  describe('getInstance', () => {
    it('should get pipe instance', () => {
      expect(service.getInstance('translateFrom')).to.equal(pipes.get('TranslateFromPipe'));
      expect(service.getInstance('lineage')).to.equal(pipes.get('LineagePipe'));
    });

    it('should return undefined when no pipe', () => {
      expect(service.getInstance('notAPipe')).to.equal(undefined);
    });
  });

  describe('meta', () => {
    it('should return undefined if no pipe', () => {
      expect(service.meta('notAPipe')).to.equal(undefined);
    });

    it('should return true for known pipes', () => {
      expect(service.meta('summary')).to.deep.equal({ pure: true });
      expect(service.meta('safeHtml')).to.deep.equal({ pure: true });
      expect(service.meta('resourceIcon')).to.deep.equal({ pure: true });
    });
  });
});
