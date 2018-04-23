describe('RelativeDate Service', () => {
  'use strict';

  let service;
  let formatDateRelativeDay = sinon.stub(),
    formatDateRelativeTime = sinon.stub(),
    formatDateAge = sinon.stub(),
    formatDateTime = sinon.stub();

  const resetStubs = () => {
    formatDateAge.reset();
    formatDateAge.returns('someage');

    formatDateRelativeDay.reset();
    formatDateRelativeDay.returns('somerelativeday');

    formatDateRelativeTime.reset();
    formatDateRelativeTime.returns('somerelativetime');

    formatDateTime.reset();
    formatDateTime.returns('someabsolutetime');
  };

  const TEST_DATE = 2398472085558;

  beforeEach(() => {
    module('inboxApp');
    module($provide => {
      $provide.value('FormatDate', {
        relative: function(timestamp, options) {
          if (options.withoutTime) {
            return formatDateRelativeDay();
          }
          return formatDateRelativeTime();
        },
        age: formatDateAge,
        time: formatDateTime
      });
    });
    inject((_RelativeDate_) => {
      service = _RelativeDate_;
    });
    resetStubs();
  });

  afterEach(() => {
    let elements = document.querySelectorAll('.update-relative-date');
    elements.forEach(element => {
      element.remove();
    });
  });

  it('returns correct CSS selector', done => {
    let actual = service.getCssSelector();
    chai.expect(actual).to.equal('update-relative-date');
    done();
  });

  it('generates correct dataset', done => {
    let options = {
      RelativeDate: service,
      FormatDate: { someObject: 'somevalue' },
      prefix: 'prefix',
      suffix: 'suffix',
      camelCase: 123456,
      text: 'string',
      undef: undefined,
      isFalse: false,
      isNull: null,
      obj: { someProperty: 'somevalue' }
    };

    let actual = service.generateDataset(TEST_DATE, options);
    chai.expect(actual).to.equal(`data-date-options='{"date":${TEST_DATE.valueOf()},"camelCase":123456,"text":"string"}'`);
    actual = service.generateDataset(TEST_DATE, options, true);
    chai.expect(actual).to.equal(`data-date-options='{"date":${TEST_DATE.valueOf()},"absoluteToday":true,"camelCase":123456,"text":"string"}'`);
    done();
  });

  it('does nothing with no elements are present', done => {
    service.updateRelativeDates();
    chai.expect(formatDateRelativeTime.callCount).to.equal(0);
    chai.expect(formatDateAge.callCount).to.equal(0);
    done();
  });

  it('does not update relative date when no date is present, date is undefined or incorrect', done => {
    let spanNoData = document.createElement('span');
    spanNoData.appendChild(document.createTextNode('sometext'));
    spanNoData.setAttribute('id', 'spanNoData');
    spanNoData.className += 'update-relative-date';
    document.body.appendChild(spanNoData);

    let spanEmptyData = document.createElement('span');
    spanEmptyData.appendChild(document.createTextNode('sometext'));
    spanEmptyData.setAttribute('id', 'spanEmptyData');
    spanEmptyData.setAttribute('data-date-options', '');
    spanEmptyData.className += 'update-relative-date';
    document.body.appendChild(spanEmptyData);

    let spanBadData = document.createElement('span');
    spanBadData.appendChild(document.createTextNode('sometext'));
    spanBadData.setAttribute('id', 'spanBadData');
    spanBadData.setAttribute('data-date-options', 'alpha');
    spanBadData.className += 'update-relative-date';
    document.body.appendChild(spanBadData);

    let spanBadDate = document.createElement('span');
    spanBadDate.appendChild(document.createTextNode('sometext'));
    spanBadDate.setAttribute('id', 'spanBadDate');
    spanBadDate.setAttribute('data-date-options', '{"date":"something"}');
    spanBadDate.className += 'update-relative-date';
    document.body.appendChild(spanBadDate);

    service.updateRelativeDates();

    chai.expect(document.getElementById('spanNoData').innerHTML).to.equal('sometext');
    chai.expect(document.getElementById('spanEmptyData').innerHTML).to.equal('sometext');
    chai.expect(document.getElementById('spanBadData').innerHTML).to.equal('sometext');
    chai.expect(document.getElementById('spanBadDate').innerHTML).to.equal('sometext');

    chai.expect(formatDateRelativeTime.callCount).to.equal(0);
    chai.expect(formatDateAge.callCount).to.equal(0);
    done();
  });

  it('processes age option correctly', done => {
    let spanAge = document.createElement('span');
    spanAge.appendChild(document.createTextNode('sometext'));
    spanAge.setAttribute('id', 'spanAge');
    spanAge.setAttribute('data-date-options', JSON.stringify({date: 123456789, age: true}));
    spanAge.className += 'update-relative-date';
    document.body.appendChild(spanAge);

    let spanNoAge = document.createElement('span');
    spanNoAge.appendChild(document.createTextNode('sometext'));
    spanNoAge.setAttribute('id', 'spanNoAge');
    spanNoAge.setAttribute('data-date-options', JSON.stringify({date: 123456789}));
    spanNoAge.className += 'update-relative-date';
    document.body.appendChild(spanNoAge);

    service.updateRelativeDates();

    chai.expect(document.getElementById('spanAge').innerHTML).to.equal('someage');
    chai.expect(document.getElementById('spanNoAge').innerHTML).to.equal('somerelativetime');

    chai.expect(formatDateRelativeTime.callCount).to.equal(1);
    chai.expect(formatDateAge.callCount).to.equal(1);

    done();
  });

  it('processes withoutTime option correctly', done => {
    let spanWithoutTime = document.createElement('span');
    spanWithoutTime.setAttribute('id', 'spanWithoutTime');
    spanWithoutTime.setAttribute('data-date-options', JSON.stringify({date: 123456789, withoutTime: true}));
    spanWithoutTime.className += 'update-relative-date';
    document.body.appendChild(spanWithoutTime);

    let spanNoWithoutTime = document.createElement('span');
    spanNoWithoutTime.setAttribute('id', 'spanNoWithoutTime');
    spanNoWithoutTime.setAttribute('data-date-options', JSON.stringify({date: 123456789}));
    spanNoWithoutTime.className += 'update-relative-date';
    document.body.appendChild(spanNoWithoutTime);

    service.updateRelativeDates();
    chai.expect(document.getElementById('spanWithoutTime').innerHTML).to.equal('somerelativeday');
    chai.expect(document.getElementById('spanNoWithoutTime').innerHTML).to.equal('somerelativetime');

    chai.expect(formatDateRelativeTime.callCount).to.equal(1);
    chai.expect(formatDateRelativeDay.callCount).to.equal(1);

    done();
  });

  it('processes absoluteToday option correctly', done => {
    let timeToday = new Date().valueOf();
    let timeSomeOtherDay = 123456789;

    let spanTodayNoAbsolute = document.createElement('span');
    spanTodayNoAbsolute.setAttribute('id', 'spanTodayNoAbsolute');
    spanTodayNoAbsolute.setAttribute('data-date-options', JSON.stringify({date: timeToday}));
    spanTodayNoAbsolute.className += 'update-relative-date';
    document.body.appendChild(spanTodayNoAbsolute);

    let spanTodayAbsolute = document.createElement('span');
    spanTodayAbsolute.setAttribute('id', 'spanTodayAbsolute');
    spanTodayAbsolute.setAttribute('data-date-options', JSON.stringify({date: timeToday, absoluteToday: true}));
    spanTodayAbsolute.className += 'update-relative-date';
    document.body.appendChild(spanTodayAbsolute);

    let spanOtherDayNoAbsolute = document.createElement('span');
    spanOtherDayNoAbsolute.setAttribute('id', 'spanOtherDayNoAbsolute');
    spanOtherDayNoAbsolute.setAttribute('data-date-options', JSON.stringify({date: timeSomeOtherDay}));
    spanOtherDayNoAbsolute.className += 'update-relative-date';
    document.body.appendChild(spanOtherDayNoAbsolute);

    let spanOtherDayAbsolute = document.createElement('span');
    spanOtherDayAbsolute.setAttribute('id', 'spanOtherDayAbsolute');
    spanOtherDayAbsolute.setAttribute('data-date-options', JSON.stringify({date: timeSomeOtherDay, absoluteToday: true}));
    spanOtherDayAbsolute.className += 'update-relative-date';
    document.body.appendChild(spanOtherDayAbsolute);

    let spanTodayAbsoluteWitoutTime = document.createElement('span');
    spanTodayAbsoluteWitoutTime.setAttribute('id', 'spanTodayAbsoluteWitoutTime');
    spanTodayAbsoluteWitoutTime.setAttribute('data-date-options', JSON.stringify({date: timeToday, absoluteToday: true, withoutTime: true}));
    spanTodayAbsoluteWitoutTime.className += 'update-relative-date';
    document.body.appendChild(spanTodayAbsoluteWitoutTime);


    service.updateRelativeDates();
    chai.expect(document.getElementById('spanTodayNoAbsolute').innerHTML).to.equal('somerelativetime');
    chai.expect(document.getElementById('spanTodayAbsolute').innerHTML).to.equal('someabsolutetime');
    chai.expect(document.getElementById('spanOtherDayNoAbsolute').innerHTML).to.equal('somerelativetime');
    chai.expect(document.getElementById('spanOtherDayAbsolute').innerHTML).to.equal('somerelativetime');
    chai.expect(document.getElementById('spanTodayAbsoluteWitoutTime').innerHTML).to.equal('somerelativeday');

    chai.expect(formatDateRelativeTime.callCount).to.equal(3);
    chai.expect(formatDateTime.callCount).to.equal(1);
    chai.expect(formatDateRelativeDay.callCount).to.equal(1);
    done();
  });
});
