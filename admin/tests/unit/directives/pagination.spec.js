describe('pagination directive', () => {

  'use strict';

  let compile;
  let scope;

  beforeEach(() => {
    module('adminApp');
    module('templates');
    inject((_$compile_, _$rootScope_) => {
      compile = _$compile_;
      scope = _$rootScope_.$new();
    });
  });

  it('should render nothing when no pages', () => {
    scope.pagination = {
      pages: 0,
      perPage: 25,
      page: 1
    };
    const element = compile('<mm-pagination></mm-pagination>')(scope);
    scope.$digest();
    chai.expect(element.html().trim()).to.equal('<!-- ngIf: pagination.pages -->');
  });

  it('should render all pages if number <= 11', () => {
    scope.pagination = {
      pages: 10,
      perPage: 25,
      page: 1,
      total: 240
    };

    const element = compile('<mm-pagination></mm-pagination>')(scope);
    scope.$digest();
    chai.expect(scope.pagination.pageLinks).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    chai.expect(scope.pagination.detail).to.deep.equal({ firstItem: 1, lastItem: 25, displayFirstLastLinks: false });

    chai.expect(element.find('ul').children().length).to.equal(14);
    chai.expect(element.find('ul').children().first().hasClass('ng-hide')).to.equal(true);
    chai.expect(element.find('ul').children().last().hasClass('ng-hide')).to.equal(true);
  });

  it('should render first 11 pages when page is in first braket and pages > 11', () => {
    scope.pagination = {
      pages: 22,
      perPage: 25,
      page: 3,
      total: 540
    };

    const element = compile('<mm-pagination></mm-pagination>')(scope);
    scope.$digest();
    chai.expect(scope.pagination.pageLinks).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    chai.expect(scope.pagination.detail).to.deep.equal({ firstItem: 51, lastItem: 75, displayFirstLastLinks: true });

    chai.expect(element.find('ul').children().length).to.equal(15);
    chai.expect(element.find('ul').children().first().hasClass('ng-hide')).to.equal(false);
    chai.expect(element.find('ul').children().last().hasClass('ng-hide')).to.equal(false);
  });

  it('should render last 11 pages when page is in last bracket and pages > 11', () => {
    scope.pagination = {
      pages: 22,
      perPage: 25,
      page: 21,
      total: 540
    };

    const element = compile('<mm-pagination></mm-pagination>')(scope);
    scope.$digest();
    chai.expect(scope.pagination.pageLinks).to.deep.equal([12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
    chai.expect(scope.pagination.detail).to.deep.equal({ firstItem: 501, lastItem: 525, displayFirstLastLinks: true });

    chai.expect(element.find('ul').children().length).to.equal(15);
    chai.expect(element.find('ul').children().first().hasClass('ng-hide')).to.equal(false);
    chai.expect(element.find('ul').children().last().hasClass('ng-hide')).to.equal(false);
  });

  it('should render padding pages when page > 11 and page is middle bracket', () => {
    scope.pagination = {
      pages: 22,
      perPage: 25,
      page: 12,
      total: 540
    };

    const element = compile('<mm-pagination></mm-pagination>')(scope);
    scope.$digest();
    chai.expect(scope.pagination.pageLinks).to.deep.equal([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    chai.expect(scope.pagination.detail).to.deep.equal({ firstItem: 276, lastItem: 300, displayFirstLastLinks: true });

    chai.expect(element.find('ul').children().length).to.equal(15);
  });

  it('should disable prev/first when on first page', () => {
    scope.pagination = {
      pages: 22,
      perPage: 25,
      page: 1,
      total: 540
    };

    const element = compile('<mm-pagination></mm-pagination>')(scope);
    scope.$digest();

    chai.expect(element.find('ul').children().first().hasClass('disabled')).to.equal(true);
    chai.expect(element.find('ul').children().first().next().hasClass('disabled')).to.equal(true);

    chai.expect(element.find('ul').children().last().hasClass('disabled')).to.equal(false);
    chai.expect(element.find('ul').children().last().prev().hasClass('disabled')).to.equal(false);
  });

  it('should disable next/last when on last page', () => {
    scope.pagination = {
      pages: 22,
      perPage: 25,
      page: 22,
      total: 540
    };

    const element = compile('<mm-pagination></mm-pagination>')(scope);
    scope.$digest();

    chai.expect(element.find('ul').children().first().hasClass('disabled')).to.equal(false);
    chai.expect(element.find('ul').children().first().next().hasClass('disabled')).to.equal(false);

    chai.expect(element.find('ul').children().last().hasClass('disabled')).to.equal(true);
    chai.expect(element.find('ul').children().last().prev().hasClass('disabled')).to.equal(true);
  });

  it('should load correct pages when clicking pagination links', () => {
    scope.pagination = {
      pages: 22,
      perPage: 10,
      page: 12,
      total: 218
    };
    scope.loadPage = sinon.stub();

    const element = compile('<mm-pagination></mm-pagination>')(scope);
    scope.$digest();

    element.find('ul').children().first().find('a').click();
    chai.expect(scope.loadPage.callCount).to.equal(1);
    chai.expect(scope.loadPage.args[0][0]).to.equal(1);

    element.find('ul').children().first().next().find('a').click();
    chai.expect(scope.loadPage.callCount).to.equal(2);
    chai.expect(scope.loadPage.args[1][0]).to.equal(11);

    element.find('ul').children().last().find('a').click();
    chai.expect(scope.loadPage.callCount).to.equal(3);
    chai.expect(scope.loadPage.args[2][0]).to.equal(22);

    element.find('ul').children().last().prev().find('a').click();
    chai.expect(scope.loadPage.callCount).to.equal(4);
    chai.expect(scope.loadPage.args[3][0]).to.equal(13);

    element.find('ul').find('li:nth-child(5)').find('a').click();
    chai.expect(scope.loadPage.callCount).to.equal(5);
    chai.expect(scope.loadPage.args[4][0]).to.equal(9);

    element.find('ul').find('li:nth-child(10)').find('a').click();
    chai.expect(scope.loadPage.callCount).to.equal(6);
    chai.expect(scope.loadPage.args[5][0]).to.equal(14);
  });

  it('should highlight the selected page', () => {
    scope.pagination = {
      pages: 22,
      perPage: 10,
      page: 12,
      total: 218
    };

    const element = compile('<mm-pagination></mm-pagination>')(scope);
    scope.$digest();
    chai.expect(element.find('ul').find('li.active').find('span').text()).to.equal('12');
  });

  it('should watch for changes in page and pages', () => {
    scope.pagination = {
      pages: 22,
      perPage: 10,
      page: 12,
      total: 218
    };

    const element = compile('<mm-pagination></mm-pagination>')(scope);
    scope.$digest();
    chai.expect(element.find('ul').find('li.active').find('span').text()).to.equal('12');
    chai.expect(scope.pagination.pageLinks).to.deep.equal([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    chai.expect(scope.pagination.detail).to.deep.equal({ firstItem: 111, lastItem: 120, displayFirstLastLinks: true });

    scope.$apply('pagination.page = 14');
    chai.expect(element.find('ul').find('li.active').find('span').text()).to.equal('14');
    chai.expect(scope.pagination.pageLinks).to.deep.equal([ 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19 ]);
    chai.expect(scope.pagination.detail).to.deep.equal({ firstItem: 131, lastItem: 140, displayFirstLastLinks: true });

    scope.$apply('pagination.page = 21');
    chai.expect(element.find('ul').find('li.active').find('span').text()).to.equal('21');
    chai.expect(scope.pagination.pageLinks).to.deep.equal([ 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 ]);
    chai.expect(scope.pagination.detail).to.deep.equal({ firstItem: 201, lastItem: 210, displayFirstLastLinks: true });

    scope.$apply('pagination.pages = 40');
    chai.expect(element.find('ul').find('li.active').find('span').text()).to.equal('21');
    chai.expect(scope.pagination.pageLinks).to.deep.equal([ 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26 ]);
    chai.expect(scope.pagination.detail).to.deep.equal({ firstItem: 201, lastItem: 210, displayFirstLastLinks: true });
  });

});
