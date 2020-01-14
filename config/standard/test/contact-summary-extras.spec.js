const assert = require('chai').assert;

describe('contact-summary-extras', function() {
  const csu = require('../contact-summary-extras');

  describe('Immunisations', function() {
    describe('#IMMUNIZATION_LIST', function() {
      csu.IMMUNIZATION_LIST.forEach(imm => {
        describe(imm, function() {
          it('should not contain any spaces', function() {
            assert.isFalse(imm.includes(' '));
          });

          it('should be included in IMMUNIZATION_DOSES', function() {
            assert.isTrue(
                csu.IMMUNIZATION_DOSES.some(d => d[0] === imm || d[0].startsWith(`${imm}_`)),
                `No doses found for immunisation: ${imm}`);
          });
        });
      });
    });

    describe('#IMMUNIZATION_DOSES', function() {
      csu.IMMUNIZATION_DOSES.forEach(d => {
        describe(d.toString(), function() {
          it(`should have two entries`, function() {
            assert.equal(d.length, 2);
          });
          it(`first entry should be lower-case`, function() {
            assert.equal(d[0].toLowerCase(), d[0]);
          });
          it(`second entry should be upper-case`, function() {
            assert.equal(d[1].toUpperCase(), d[1]);
          });
          it('should be included in IMMUNIZATION_LIST', function() {
            const immunisationName = d[0].match(/^.*_\d+/) ?
                d[0].slice(0, d[0].lastIndexOf('_')) :
                d[0];
            assert.isTrue(csu.IMMUNIZATION_LIST.includes(immunisationName),
                `Could not find ${immunisationName} in IMMUNIZATION_LIST`);
          });
        });
      });

      it('should only number doses for immunisations with more than one dose', function() {
        csu.IMMUNIZATION_LIST.forEach(imm => {
          const singleDoseCount = csu.IMMUNIZATION_DOSES.filter(d => d[0] === imm).length;
          const multiDoseCount  = csu.IMMUNIZATION_DOSES.filter(d => d[0].startsWith(`${imm}_`)).length;
          // eslint-disable-next-line no-bitwise
          assert.isOk((singleDoseCount === 1) ^ (multiDoseCount > 1), `Incorrect number of doses listed for ${imm}`);
        });
      });
    });
  });

  describe('#getDeliveryCode()', function() {

    it('should return "unknown" if no value available', function() {
      // expect
      assert.equal(csu.getDeliveryCode(), 'unknown');
    });

    it('should use fields.group_note.default_chw_sms if available', function() {
      // given
      const report = { fields:{ group_note:{ default_chw_sms:'code' } } };

      // expect
      assert.equal(csu.getDeliveryCode(report), 'code');
    });

    it('should use fields.delivery_code if available', function() {
      // given
      const report = { fields:{ delivery_code:'code' } };

      // expect
      assert.equal(csu.getDeliveryCode(report), 'code');
    });

    it('should use fields.group_note.default_chw_sms in preference to fields.delivery_code', function() {
      // given
      const report = {
        fields: {
          delivery_code: 'code_a',
          group_note: {
            default_chw_sms: 'code_b',
          },
        },
      };

      // expect
      assert.equal(csu.getDeliveryCode(report), 'code_b');
    });

    it('should remove "anc_only_" suffix if supplied', function() {
      // given
      const report = { fields:{ delivery_code:'anc_only_code' } };

      // expect
      assert.equal(csu.getDeliveryCode(report), 'code');
    });

    it('should convert to lower-case', function() {
      // given
      const report = { fields:{ delivery_code:'CODE' } };

      // expect
      assert.equal(csu.getDeliveryCode(report), 'code');
    });

    it('should convert to lower-case and strip "anc_only_" prefix', function() {
      // given
      const report = { fields:{ delivery_code:'ANC_ONLY_CODE' } };

      // expect
      assert.equal(csu.getDeliveryCode(report), 'code');
    });

  });

  describe('#isVaccineInLineage()', function() {
    it('should return falsy if lineage is not defined', function() {
      // expect
      assert.isNotOk(csu.isVaccineInLineage());
    });

    it('should return true if first lineage member has vaccine', function() {
      // given
      const lineage = [ { vaccines:'ABC' } ];

      // expect
      assert.isTrue(csu.isVaccineInLineage(lineage, 'ABC'));
    });

    it('should return true if first lineage member has many vaccines including expected', function() {
      // given
      const lineage = [ { vaccines:'ABC DEF' } ];

      // expect
      assert.isTrue(csu.isVaccineInLineage(lineage, 'ABC'));
    });
  });
});
