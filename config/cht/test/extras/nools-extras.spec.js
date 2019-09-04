const chai = require('chai');
const expect = chai.expect;
const moment = require('moment');
const sinon = require('sinon');
const extras = require('../../nools-extras');

describe('Date related tests', () => {
    before(() => { sinon.restore(); });
    it("tests that today is correct", () => {
        expect(moment().startOf('day').valueOf()).to.equal(extras.today);
    });

    it("tests that method addDays works correctly", () => {
        for (let i = 1; i < 100; i++) {
            expect(moment().startOf('day').add(i, 'days').valueOf()).to.equal(extras.addDays(extras.today, i).getTime());
        }
    });

    it("tests that method getTimeForMidnight works correctly", () => {
        expect(moment().startOf('day').valueOf()).to.equal(extras.getTimeForMidnight(Date.now()).getTime());
    });

    it("tests that method isOnSameMonth works correctly", () => {
        for (let i = 1; i < 33; i++) {
            const date1 = (new Date(2000, 0, i)).getTime();
            for (let j = 1; j < 33; j++) {
                const date2 = (new Date(2000, 0, j)).getTime();
                if (moment(date1).isSame(date2, 'month')) {
                    expect(extras.isOnSameMonth(date1, date2), date1 + " - " + date2).to.be.true;
                }
                else {
                    expect(extras.isOnSameMonth(date1, date2), date1 + " - " + date2).to.be.false;
                }

            }
        }
    });

    it("tests that method getDateMS works correctly", () => {
        expect(moment("2000-01-01").valueOf()).to.equal(extras.getDateMS("2000-01-01"));//String format      
        expect(moment("2000-01-01").valueOf()).to.equal(extras.getDateMS(new Date("2000-01-01")));//Date format
        expect(moment("2000-01-01").valueOf()).to.equal(extras.getDateMS((new Date("2000-01-01").getTime())));//MS since epoch    
    });

    it("tests that method getMostRecentReport works correctly", () => {
        const reports = [
            { _id: "r1", reported_date: 2, form: "a" },
            { _id: "r2", reported_date: 3, form: "b" },
            { _id: "r3", reported_date: 1, form: "a" },
            { _id: "r4", reported_date: 2, form: "b" }];
        expect(extras.getMostRecentReport(reports, "a")._id).to.equal("r1");
        expect(extras.getMostRecentReport(reports, "b")._id).to.equal("r2");
    });
});