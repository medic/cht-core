const sinon = require('sinon');
const moment = require('moment');
const expect = require('chai').expect;
const should = require('chai').should();
const rewire = require('rewire');
const utils = rewire('../src/index');

const MAX_GSM_LENGTH = 160;
const MAX_UNICODE_LENGTH = 70;

const generateMessage = function(length, unicode) {
  const result = [];
  for (let i = 0; i < length; i++) {
    result[i] = unicode ? '☃' : 'o';
  }
  return result.join('');
};

describe('messageUtils', () => {

  beforeEach(done => {
    sinon.restore();
    done();
  });

  describe('_getRecipient', () => {
    it('returns undefined if no doc is passed', () => {
      should.not.exist(utils._getRecipient());
    });
    it('returns doc.from if no recipient', () => {
      utils._getRecipient({from: 'foo'})
        .should.equal('foo');
    });
    describe('recipient variations', () => {
      const fromPhone = 'fromPhone';
      const clinicPhone = 'clinicPhone';
      const parentPhone = 'parentPhone';
      const grandparentPhone = 'grandParentPhone';
      const fieldsPhone = 'fieldsPhone';
      const inlinePhone = 'inlinePhone';
      const complexInlinePhone = 'complexInlinePhone';
      const linkedPhone1 = 'linkedPhone1';
      const linkedPhone2 = 'linkedPhone2';
      const linkedPhone3 = 'linkedPhone3';
      const linkedPhone4 = 'linkedPhone4';
      const doc = {
        form: 'x',
        from: fromPhone,
        fields: {
          phone: fieldsPhone,
        },
        phone: inlinePhone,
        contact: {
          parent: {
            type: 'clinic',
            contact: {
              phone: clinicPhone
            },
            parent: {
              type: 'health_center',
              contact: {
                phone: parentPhone
              },
              parent: {
                type: 'district_hospital',
                contact: {
                  phone: grandparentPhone
                }
              }
            }
          }
        },
        complex: { inline: { phone: complexInlinePhone }}
      };

      const docWithPatient = {
        form: 'x',
        from: fromPhone,
        fields: {
          phone: fieldsPhone,
          patient_id: 'patient_id',
        },
        phone: inlinePhone,
        contact: {
          parent: {
            type: 'clinic',
            contact: {
              phone: `not${clinicPhone}`,
            },
            parent: {
              type: 'health_center',
              contact: {
                phone: `not${parentPhone}`,
              },
              parent: {
                type: 'district_hospital',
                contact: {
                  phone: `not${grandparentPhone}`,
                },
              },
            },
          },
        },
        patient: {
          type: 'person',
          parent: {
            type: 'clinic',
            contact: {
              phone: clinicPhone,
            },
            parent: {
              type: 'health_center',
              contact: {
                phone: parentPhone,
              },
              parent: {
                type: 'district_hospital',
                contact: {
                  phone: grandparentPhone,
                },
              },
            },
          },
        },
        complex: { inline: { phone: complexInlinePhone }}
      };

      const docWithPlace = {
        form: 'x',
        from: fromPhone,
        fields: {
          phone: fieldsPhone,
          place_id: 'place_id',
        },
        phone: inlinePhone,
        contact: {
          parent: {
            type: 'clinic',
            contact: {
              phone: `not${clinicPhone}`,
            },
            parent: {
              type: 'health_center',
              contact: {
                phone: `not${parentPhone}`,
              },
              parent: {
                type: 'district_hospital',
                contact: {
                  phone: `not${grandparentPhone}`,
                },
              },
            },
          },
        },
        place: {
          type: 'some_place',
          parent: {
            type: 'clinic',
            contact: {
              phone: clinicPhone,
            },
            parent: {
              type: 'health_center',
              contact: {
                phone: parentPhone,
              },
              parent: {
                type: 'district_hospital',
                contact: {
                  phone: grandparentPhone,
                },
              },
            },
          },
        },
        complex: { inline: { phone: complexInlinePhone }}
      };

      const flexibleDoc = {
        form: 'x',
        from: fromPhone,
        fields: {
          phone: fieldsPhone,
        },
        phone: inlinePhone,
        contact: {
          parent: {
            type: 'contact',
            contact_type: 'clinic',
            contact: {
              phone: clinicPhone
            },
            parent: {
              type: 'contact',
              contact_type: 'health_center',
              contact: {
                phone: parentPhone
              },
              parent: {
                type: 'contact',
                contact_type: 'district_hospital',
                contact: {
                  phone: grandparentPhone
                }
              }
            }
          }
        },
      };

      const linkedDoc = {
        form: 'x',
        from: fromPhone,
        fields: {
          phone: fieldsPhone,
        },
        phone: inlinePhone,
        contact: {
          parent: {
            type: 'contact',
            contact_type: 'clinic',
            contact: {
              phone: clinicPhone
            },
            parent: {
              type: 'contact',
              contact_type: 'health_center',
              contact: {
                phone: parentPhone
              },
              parent: {
                type: 'contact',
                contact_type: 'district_hospital',
                contact: {
                  phone: grandparentPhone
                }
              },
              linked_docs: {
                chw4: {
                  phone: linkedPhone4,
                },
              }
            },
            linked_docs: {
              chw2: {
                phone: linkedPhone2,
              },
              chw3: {
                phone: linkedPhone3,
              }
            }
          },
          linked_docs: {
            chw1: {
              phone: linkedPhone1,
            },
            random: 'unknown',
            random2: { _id: 'unknown' },
          },
        },
      };

      const linkedDocWithPatient = {
        form: 'x',
        from: fromPhone,
        fields: {
          phone: fieldsPhone,
        },
        phone: inlinePhone,
        patient: {
          linked_docs: {
            tag1: {
              phone: linkedPhone1,
            },
            tag2: 'aaaa'
          },
          phone: 'patientPhone',
          parent: {
            type: 'clinic',
            contact: {
              phone: clinicPhone,
            },
            parent: {
              type: 'health_center',
              contact: {
                phone: parentPhone,
              },
              linked_docs: {
                tag4: { phone: linkedPhone4 },
              }
            },
            linked_docs: {
              tag3: { phone: linkedPhone3 },
              tagtag: { phone: '' },
            }
          },
        },
        contact: {
          phone: 'otherphone',
          parent: {},
          linked_docs: {
            tag1: { phone: 'otherphone' },
            tag2: { phone: linkedPhone2 },
            tag3: { phone: 'otherphone' },
            tag4: { phone: 'otherphone' },
          }
        }
      };

      const linkedDocWithPlace = {
        form: 'x',
        from: fromPhone,
        fields: {
          phone: fieldsPhone,
        },
        phone: inlinePhone,
        place: {
          linked_docs: {
            tag1: {
              phone: linkedPhone1,
            },
            tag2: 'aaaa'
          },
          phone: 'patientPhone',
          parent: {
            type: 'clinic',
            contact: {
              phone: clinicPhone,
            },
            parent: {
              type: 'health_center',
              contact: {
                phone: parentPhone,
              },
              linked_docs: {
                tag4: { phone: linkedPhone4 },
              }
            },
            linked_docs: {
              tag3: { phone: linkedPhone3 },
              tagtag: { phone: '' },
            }
          },
        },
        contact: {
          phone: 'otherphone',
          parent: {},
          linked_docs: {
            tag1: { phone: 'otherphone' },
            tag2: { phone: linkedPhone2 },
            tag3: { phone: 'otherphone' },
            tag4: { phone: 'otherphone' },
          }
        }
      };


      it('resolves reporting_unit correctly', () => {
        utils._getRecipient(doc, 'reporting_unit')
          .should.equal(fromPhone);
      });
      it('resolves clinic correctly', () => {
        utils._getRecipient(doc, 'clinic')
          .should.equal(clinicPhone);
        utils._getRecipient(flexibleDoc, 'clinic')
          .should.equal(clinicPhone);
        utils._getRecipient(docWithPatient, 'clinic').should.equal(clinicPhone);
        utils._getRecipient(docWithPlace, 'clinic').should.equal(clinicPhone);
      });
      it('resolves parent correctly', () => {
        utils._getRecipient(doc, 'parent')
          .should.equal(parentPhone);
        utils._getRecipient(docWithPatient, 'parent').should.equal(parentPhone);
        utils._getRecipient(docWithPlace, 'parent').should.equal(parentPhone);
      });
      it('resolves grandparent correctly', () => {
        utils._getRecipient(doc, 'grandparent')
          .should.equal(grandparentPhone);
        utils._getRecipient(docWithPatient, 'grandparent').should.equal(grandparentPhone);
        utils._getRecipient(docWithPlace, 'grandparent').should.equal(grandparentPhone);
      });
      it('resolves ancestor: correctly', () => {
        utils._getRecipient(doc, 'ancestor:health_center')
          .should.equal(parentPhone);
        utils._getRecipient(flexibleDoc, 'ancestor:health_center')
          .should.equal(parentPhone);
        utils._getRecipient(doc, 'ancestor:clinic')
          .should.equal(clinicPhone);
        utils._getRecipient(flexibleDoc, 'ancestor:clinic')
          .should.equal(clinicPhone);
        utils._getRecipient(docWithPatient, 'ancestor:health_center').should.equal(parentPhone);
        utils._getRecipient(docWithPlace, 'ancestor:health_center').should.equal(parentPhone);
        utils._getRecipient(docWithPatient, 'ancestor:clinic').should.equal(clinicPhone);
        utils._getRecipient(docWithPlace, 'ancestor:clinic').should.equal(clinicPhone);
      });
      it('resolves clinic based on patient if given', () => {
        const context = {
          patient: {
            parent: {
              type: 'clinic',
              contact: {
                phone: '111'
              }
            }
          },
          parent: {
            type: 'clinic',
            contact: {
              phone: '222'
            }
          }
        };
        const contextFlexible = {
          patient: {
            parent: {
              type: 'contact',
              contact_type: 'clinic',
              contact: {
                phone: '111'
              }
            }
          },
          parent: {
            type: 'contact',
            contact_type: 'clinic',
            contact: {
              phone: '222'
            }
          }
        };
        utils._getRecipient(context, 'clinic')
          .should.equal('111');
        utils._getRecipient(contextFlexible, 'clinic')
          .should.equal('111');
      });

      it('resolves health_center based on place if given', () => {
        const context = {
          place: {
            type: 'clinic',
            parent: {
              type: 'health_center',
              contact: {
                phone: '111'
              }
            }
          },
          parent: {
            type: 'health_center',
            contact: {
              phone: '222'
            }
          }
        };
        const contextFlexible = {
          place: {
            type: 'contact',
            contact_type: 'clinic',
            parent: {
              type: 'contact',
              contact_type: 'health_center',
              contact: {
                phone: '111'
              }
            }
          },
          parent: {
            type: 'contact',
            contact_type: 'health_center',
            contact: {
              phone: '222'
            }
          }
        };
        utils._getRecipient(context, 'health_center').should.equal('111');
        utils._getRecipient(contextFlexible, 'health_center').should.equal('111');
      });

      it('should resolve link: correctly', () => {
        utils._getRecipient(linkedDoc, 'link:chw1').should.equal(linkedPhone1);
        utils._getRecipient(linkedDoc, 'link:chw2').should.equal(linkedPhone2);
        utils._getRecipient(linkedDoc, 'link:chw3').should.equal(linkedPhone3);
        utils._getRecipient(linkedDoc, 'link:chw4').should.equal(linkedPhone4);
        utils._getRecipient(linkedDoc, 'link:nothing').should.equal(fromPhone);
        utils._getRecipient(linkedDoc, 'link:random').should.equal(fromPhone);

        utils._getRecipient(doc, 'link:health_center').should.equal(parentPhone);
        utils._getRecipient(flexibleDoc, 'link:health_center').should.equal(parentPhone);
        utils._getRecipient(doc, 'link:clinic').should.equal(clinicPhone);
        utils._getRecipient(flexibleDoc, 'link:clinic').should.equal(clinicPhone);

        utils._getRecipient(docWithPatient, 'link:health_center').should.equal(parentPhone);
        utils._getRecipient(docWithPlace, 'link:health_center').should.equal(parentPhone);
        utils._getRecipient(docWithPatient, 'link:clinic').should.equal(clinicPhone);
        utils._getRecipient(docWithPlace, 'link:clinic').should.equal(clinicPhone);
      });

      it('should resolve link: correctly based on patient', () => {
        utils._getRecipient(linkedDocWithPatient, 'link:tag1').should.equal(linkedPhone1);
        // this resolves from contact instead of patient! patient:tag2 is 'aaa'
        utils._getRecipient(linkedDocWithPatient, 'link:tag2').should.equal(linkedPhone2);
        utils._getRecipient(linkedDocWithPatient, 'link:tag3').should.equal(linkedPhone3);
        utils._getRecipient(linkedDocWithPatient, 'link:tag4').should.equal(linkedPhone4);
        utils._getRecipient(linkedDocWithPatient, 'link:nonexisting').should.equal(fromPhone);
        utils._getRecipient(linkedDocWithPatient, 'link:tagtag').should.equal(fromPhone);
      });

      it('should resolve link: correctly based on place', () => {
        utils._getRecipient(linkedDocWithPlace, 'link:tag1').should.equal(linkedPhone1);
        // this resolves from contact instead of place! place:tag2 is 'aaa'
        utils._getRecipient(linkedDocWithPlace, 'link:tag2').should.equal(linkedPhone2);
        utils._getRecipient(linkedDocWithPlace, 'link:tag3').should.equal(linkedPhone3);
        utils._getRecipient(linkedDocWithPlace, 'link:tag4').should.equal(linkedPhone4);
        utils._getRecipient(linkedDocWithPlace, 'link:nonexisting').should.equal(fromPhone);
        utils._getRecipient(linkedDocWithPlace, 'link:tagtag').should.equal(fromPhone);
      });

      it('should resolve link: on 1st match', () => {
        const context = {
          contact: {
            phone: 'a',
            linked_docs: {
              one: { phone: 'one' },
              two: { phone: 'two' },
              three: { phone: 'three' },
            },
            parent: {
              linked_docs: {
                one: { phone: 'not-one' },
                two: { phone: 'not-two' },
                three: { phone: 'not-three' },
                four: { phone: 'yes-four' },
              },
              contact: { phone: 'random' },
            },
          },
        };

        utils._getRecipient(context, 'link:one').should.equal('one');
        utils._getRecipient(context, 'link:two').should.equal('two');
        utils._getRecipient(context, 'link:three').should.equal('three');
        utils._getRecipient(context, 'link:four').should.equal('yes-four');
      });

      it('should resolve link: tag 1st, contact type 2nd', () => {
        const context = {
          contact: {
            type: 'contact',
            contact_type: 'person',
            phone: '000000',
            linked_docs: {
              person: { phone: 'one' },
            },
            parent: {
              type: 'contact',
              contact_type: 'clinic',
              contact: { phone: '111111' },
              linked_docs: {
                clinic: { phone: 'two' },
              },
              parent: {
                type: 'contact',
                contact_type: 'health_center',
                contact: { phone: '22222' },
                linked_docs: {
                  health_center: { phone: 'three' },
                },
              }
            },
          },
        };

        utils._getRecipient(context, 'link:person').should.equal('one');
        utils._getRecipient(context, 'link:clinic').should.equal('two');
        utils._getRecipient(context, 'link:health_center').should.equal('three');
      });
    });
    it('tries to resolve the value from the fields property', () => {
      utils._getRecipient({fields: {foo: 'bar'}}, 'foo')
        .should.equal('bar');
    });
    it('tries to resolve simple values directly on the doc', () => {
      utils._getRecipient({foo: 'bar'}, 'foo')
        .should.equal('bar');
    });
    it('tries to resolve complex values directly on the doc', () => {
      utils._getRecipient({foo: {bar: {smang: 'baz'}}}, 'foo.bar.smang')
        .should.equal('baz');
    });
    it('should return the provided recipient if it is a valid phone number', () => {
      utils._getRecipient({ from: 'martha' }, '+26339262897').should.equal('+26339262897'); // zimbabwe
      utils._getRecipient({ from: 'martha' }, '+33470075051').should.equal('+33470075051'); // france
      utils._getRecipient({ from: 'martha' }, '+254202244150').should.equal('+254202244150'); // kenya
      utils._getRecipient({ from: 'martha' }, '+9771-4492163').should.equal('+9771-4492163'); // nepal
      utils._getRecipient({ from: 'martha' }, '+10789212558').should.equal('martha'); // random numbers
      utils._getRecipient({ from: 'martha' }, '123').should.equal('martha');
      utils._getRecipient({ from: 'martha' }, '99999').should.equal('martha');
    });
    it('returns doc.from if the recipient cannot be resolved', () => {
      utils._getRecipient({from: 'foo'}, 'a-recipient')
        .should.equal('foo');
    });
  });

  describe('extendedTemplateContext', () => {

    it('picks patient data first', () => {
      const doc = { name: 'alice', fields: { name: 'bob' } };
      const patient = { name: 'charles' };
      const registrations = [{ name: 'doug', fields: { name: 'elisa' } }];
      const place = { name: 'charles area' };
      const placeRegistrations = [{ name: 'mary', fields: { name: 'zeewa' } }];

      const actual = utils._extendedTemplateContext(doc, { patient, registrations, place, placeRegistrations });
      actual.name.should.equal('charles');
    });

    it('should pick place data second', () => {
      const doc = { name: 'alice', fields: { name: 'bob' } };
      const place = { name: 'charles' };
      const registrations = [{ name: 'doug', fields: { name: 'elisa' } }];
      const placeRegistrations = [{ name: 'mary', fields: { name: 'zeewa' } }];
      const actual = utils._extendedTemplateContext(doc, { place, registrations, placeRegistrations });
      actual.name.should.equal('charles');
    });

    it('picks doc.fields properties third', () => {
      const doc = { name: 'alice', fields: { name: 'bob' } };
      const patient = { };
      const place = { };
      const registrations = [{ name: 'doug', fields: { name: 'elisa' } }];
      const placeRegistrations = [{ name: 'mary', fields: { name: 'zeewa' } }];
      const actual = utils._extendedTemplateContext(doc, { patient, registrations, place, placeRegistrations });
      actual.name.should.equal('bob');
    });

    it('picks doc properties fourth', () => {
      const doc = { name: 'alice' };
      const patient = { };
      const place = { };
      const registrations = [{ name: 'doug', fields: { name: 'elisa' } }];
      const placeRegistrations = [{ name: 'mary', fields: { name: 'zeewa' } }];
      const actual = utils._extendedTemplateContext(doc, { patient, registrations, place, placeRegistrations });
      actual.name.should.equal('alice');
    });

    it('picks registrations[0].fields properties fifth', () => {
      const doc = { };
      const patient = { };
      const place = { };
      const registrations = [{ name: 'doug', fields: { name: 'elisa' } }];
      const placeRegistrations = [{ name: 'mary', fields: { name: 'zeewa' } }];
      const actual = utils._extendedTemplateContext(doc, { patient, registrations, place, placeRegistrations });
      actual.name.should.equal('elisa');
    });

    it('picks registrations[0] properties sixth', () => {
      const doc = { };
      const patient = { };
      const registrations = [{ name: 'doug' }];
      const placeRegistrations = [{ name: 'mary', fields: { name: 'zeewa' } }];
      const actual = utils._extendedTemplateContext(doc, { patient, registrations, placeRegistrations });
      actual.name.should.equal('doug');
    });

    it('picks placeRegistrations[0].fields properties seventh', () => {
      const doc = { };
      const patient = { };
      const place = { };
      const registrations = [];
      const placeRegistrations = [{ name: 'mary', fields: { name: 'zeewa' } }];
      const actual = utils._extendedTemplateContext(doc, { patient, registrations, place, placeRegistrations });
      actual.name.should.equal('zeewa');
    });

    it('picks placeRegistrations[0] properties eighth', () => {
      const doc = { };
      const patient = { };
      const place = { };
      const registrations = [];
      const placeRegistrations = [{ name: 'mary' }];
      const actual = utils._extendedTemplateContext(doc, { patient, registrations, place, placeRegistrations });
      actual.name.should.equal('mary');
    });

    it('should allow registrations without a patient', () => {
      const extras = { registrations: [{ patient_name: 'clone' }] };
      const result = utils._extendedTemplateContext({}, extras);
      result.patient_name.should.equal('clone');
    });
  });

  describe('generate', () => {

    it('adds uuid', () => {
      utils.__set__('uuid', { v4: sinon.stub().returns('some-uuid') });
      const config = {};
      const translate = null;
      const doc = {};
      const content = { message: 'xxx' };
      const recipient = '+1234';
      const messages = utils.generate(config, translate, doc, content, recipient);
      expect(messages.length).to.equal(1);
      const message = messages[0];
      expect(message.message).to.equal('xxx');
      expect(message.to).to.equal('+1234');
      expect(message.uuid).to.equal('some-uuid');
    });

    describe('recipient', () => {

      it('calculates clinic from contact if no patient', () => {
        const config = {};
        const translate = null;
        const doc = {
          from: '+111',
          contact: {
            type: 'person',
            parent: {
              type: 'clinic',
              contact: {
                type: 'person',
                phone: '+222'
              }
            }
          }
        };
        const content = { message: 'xxx' };
        const recipient = 'clinic';
        const context = {};
        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages.length).to.equal(1);
        const message = messages[0];
        expect(message.to).to.equal('+222');
      });

      it('calculates clinic from patient', () => {
        const config = {};
        const translate = null;
        const doc = {
          from: '+111',
          contact: {
            type: 'person',
            parent: {
              type: 'clinic',
              contact: {
                type: 'person',
                phone: '+222'
              }
            }
          }
        };
        const content = { message: 'xxx' };
        const recipient = 'clinic';
        const context = {
          patient: {
            parent: {
              type: 'clinic',
              contact: {
                type: 'person',
                phone: '+333'
              }
            }
          }
        };
        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages.length).to.equal(1);
        const message = messages[0];
        expect(message.to).to.equal('+333');
      });

      it('calculates health_center', () => {
        const config = {};
        const translate = null;
        const doc = {
          from: '+111',
          contact: {
            type: 'person',
            parent: {
              type: 'health_center',
              contact: {
                type: 'person',
                phone: '+222'
              }
            }
          }
        };
        const content = { message: 'xxx' };
        const recipient = 'health_center';
        const context = {
          patient: {
            parent: {
              type: 'clinic',
              parent: {
                type: 'health_center',
                contact: {
                  type: 'person',
                  phone: '+333'
                }
              }
            }
          }
        };
        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages.length).to.equal(1);
        const message = messages[0];
        expect(message.to).to.equal('+333');
      });

      it('calculates district', () => {
        const config = {};
        const translate = null;
        const doc = {
          from: '+111',
          contact: {
            type: 'person',
            parent: {
              type: 'district_hospital',
              contact: {
                type: 'person',
                phone: '+222'
              }
            }
          }
        };
        const content = { message: 'xxx' };
        const recipient = 'district';
        const context = {
          patient: {
            parent: {
              type: 'clinic',
              parent: {
                type: 'health_center',
                parent: {
                  type: 'district_hospital',
                  contact: {
                    type: 'person',
                    phone: '+333'
                  }
                }
              }
            }
          }
        };
        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages.length).to.equal(1);
        const message = messages[0];
        expect(message.to).to.equal('+333');
      });
    });

    describe('truncation', () => {

      it('does not truncate short sms', () => {
        const sms = generateMessage(MAX_GSM_LENGTH);
        const config = { multipart_sms_limit: 10 };
        const translate = null;
        const doc = {};
        const content = { message: sms };
        const recipient = '+1234';
        const messages = utils.generate(config, translate, doc, content, recipient);
        expect(messages.length).to.equal(1);
        expect(messages[0].message).to.equal(sms);
        expect(messages[0].original_message).to.equal(undefined);
      });

      it('does not truncate short unicode sms', () => {
        const sms = generateMessage(MAX_UNICODE_LENGTH, true);
        const config = { multipart_sms_limit: 10 };
        const translate = null;
        const doc = {};
        const content = { message: sms };
        const recipient = '+1234';
        const messages = utils.generate(config, translate, doc, content, recipient);
        expect(messages.length).to.equal(1);
        expect(messages[0].message).to.equal(sms);
        expect(messages[0].original_message).to.equal(undefined);
      });

      it('truncates long sms', () => {
        const sms = generateMessage(1000);
        const expected = sms.substr(0, 150) + '...';
        const config = { multipart_sms_limit: 1 };
        const translate = null;
        const doc = {};
        const content = { message: sms };
        const recipient = '+1234';
        const messages = utils.generate(config, translate, doc, content, recipient);
        expect(messages.length).to.equal(1);
        expect(messages[0].message).to.equal(expected);
        expect(messages[0].original_message).to.equal(sms);
      });

      it('truncates long unicode sms', () => {
        const sms = generateMessage(1000, true);
        const expected = sms.substr(0, 64) + '...';
        const config = { multipart_sms_limit: 1 };
        const translate = null;
        const doc = {};
        const content = { message: sms };
        const recipient = '+1234';
        const messages = utils.generate(config, translate, doc, content, recipient);
        expect(messages.length).to.equal(1);
        expect(messages[0].message).to.equal(expected);
        expect(messages[0].original_message).to.equal(sms);
      });

    });

    describe('errors', () => {
      it('should add an error when registrations are provided without a patient', () => {
        const config = {};
        const translate = null;
        const doc = {};
        const content = { message: 'sms' };
        const recipient = '1234';
        const context = { registrations: [{ _id: 'a' }] };

        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages[0].message).to.equal('sms');
        expect(messages[0].to).to.equal('1234');
        expect(messages[0].error).to.equal('messages.errors.patient.missing');
      });

      it('should not add an error when no patient and no registrations are provided', () => {
        const config = {};
        const translate = null;
        const doc = {};
        const content = { message: 'sms' };
        const recipient = '1234';
        const context = { registrations: false };

        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages[0].message).to.equal('sms');
        expect(messages[0].to).to.equal('1234');
        expect(messages[0].error).to.equal(undefined);
      });

      it('should not add an error when patient is provided', () => {
        const config = {};
        const translate = null;
        const doc = {};
        const content = { message: 'sms' };
        const recipient = '1234';
        const context = { patient: { name: 'a' } };

        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages[0].message).to.equal('sms');
        expect(messages[0].to).to.equal('1234');
        expect(messages[0].error).to.equal(undefined);
      });

      it('should add an error when placeRegistrations are provided without a place', () => {
        const config = {};
        const translate = null;
        const doc = {};
        const content = { message: 'sms' };
        const recipient = '1234';
        const context = { placeRegistrations: [{ _id: 'a' }] };

        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages[0].message).to.equal('sms');
        expect(messages[0].to).to.equal('1234');
        expect(messages[0].error).to.equal('messages.errors.place.missing');
      });

      it('should not add an error when no patient, no place and no registrations are provided', () => {
        const config = {};
        const translate = null;
        const doc = {};
        const content = { message: 'sms' };
        const recipient = '1234';
        const context = { registrations: false };

        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages[0].message).to.equal('sms');
        expect(messages[0].to).to.equal('1234');
        expect(messages[0].error).to.equal(undefined);
      });

      it('should not add an error when place is provided', () => {
        const config = {};
        const translate = null;
        const doc = {};
        const content = { message: 'sms' };
        const recipient = '1234';
        const context = { place: { name: 'a' } };

        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages[0].message).to.equal('sms');
        expect(messages[0].to).to.equal('1234');
        expect(messages[0].error).to.equal(undefined);
      });
    });

  });

  describe('template', () => {

    it('plain text', () => {
      const actual = utils.template({}, null, {}, { message: 'hello' });
      expect(actual).to.equal('hello');
    });

    it('variables', () => {
      const actual = utils.template({}, null, { name: 'george' }, { message: 'hello {{name}}' });
      expect(actual).to.equal('hello george');
    });

    describe('dates', () => {

      it('string', () => {
        const date = '2016-03-06T03:45:41.000Z';
        const input = '{{#date}}{{reported_date}}{{/date}}';
        const doc = { reported_date: date };
        const config = { date_format: 'DD-MMM-YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.date_format));
      });

      it('integer', () => {
        const date = 1457235941000;
        const input = '{{#date}}{{reported_date}}{{/date}}';
        const doc = { reported_date: date };
        const config = { date_format: 'DD-MMM-YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.date_format));
      });

      it('Date object', () => {
        const date = 1457235941000;
        const input = '{{#date}}Date({{reported_date}}){{/date}}';
        const doc = { reported_date: date };
        const config = { date_format: 'DD-MMM-YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.date_format));
      });

    });

    describe('datetimes', () => {

      it('integer', () => {
        const date = 1457235941000;
        const input = '{{#datetime}}{{reported_date}}{{/datetime}}';
        const doc = { reported_date: date };
        const config = { reported_date_format: 'DD-MMMM-YYYY HH:mm:ss' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.reported_date_format));
      });

      it('Date object', () => {
        const date = 1457235941000;
        const input = '{{#datetime}}Date({{reported_date}}){{/datetime}}';
        const doc = { reported_date: date };
        const config = { reported_date_format: 'DD-MMMM-YYYY HH:mm:ss' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.reported_date_format));
      });

      it('i18n', () => {
        const date = 1457235941000;
        const input = '{{#datetime}}Date({{reported_date}}){{/datetime}}';
        const doc = { reported_date: date, locale: 'sw' };
        const config = { reported_date_format: 'ddd, MMM Do, YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).locale('sw').format(config.reported_date_format));
        expect(actual).to.not.equal(moment(date).format(config.reported_date_format));
      });

      it('i18n with inexistent locale falls back to en', () => {
        const date = 1457235941000;
        const input = '{{#datetime}}Date({{reported_date}}){{/datetime}}';
        const doc = { reported_date: date, locale: 'this-locale-doesnt-exist' };
        const config = { reported_date_format: 'ddd, MMM Do, YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).locale('en').format(config.reported_date_format));
        expect(actual).to.equal(moment(date).format(config.reported_date_format));
      });

      it('i18n with undefined locale falls back to en', () => {
        const date = 1457235941000;
        const input = '{{#datetime}}Date({{reported_date}}){{/datetime}}';
        const doc = { reported_date: date, locale: false };
        const config = { reported_date_format: 'ddd, MMM Do, YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).locale('en').format(config.reported_date_format));
        expect(actual).to.equal(moment(date).format(config.reported_date_format));
      });

    });

    describe('bikram sambat', () => {

      it('integer', () => {
        const date = new Date(2016, 2, 6);
        const expected = '२३ फाल्गुन २०७२';
        const input = '{{#bikram_sambat_date}}{{reported_date}}{{/bikram_sambat_date}}';
        const doc = { reported_date: date.getTime() };
        const config = { reported_date_format: 'DD-MMMM-YYYY HH:mm:ss' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(expected);
      });

      it('Date object', () => {
        const date = new Date(2016, 2, 6);
        const expected = '२३ फाल्गुन २०७२';
        const input = '{{#bikram_sambat_date}}Date({{reported_date}}){{/bikram_sambat_date}}';
        const doc = { reported_date: date.getTime() };
        const config = { reported_date_format: 'DD-MMMM-YYYY HH:mm:ss' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(expected);
      });

      it('i18n has no influence', () => {
        const date = new Date(2016, 2, 6);
        const expected = '२३ फाल्गुन २०७२';
        const input = '{{#bikram_sambat_date}}Date({{reported_date}}){{/bikram_sambat_date}}';
        const doc = { reported_date: date.getTime(), locale: 'sw' };
        const config = { reported_date_format: 'ddd, MMM Do, YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(expected);
      });

    });

    describe('template context', () => {

      it('supports template variables on doc', () => {
        const doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z',
          governor: 'arnold',
          contact: {
            phone: '123',
            parent: {
              contact: {
                phone: '123'
              }
            }
          }
        };
        const actual = utils.template({}, null, doc, { message: '{{contact.phone}}, {{governor}}' });
        expect(actual).to.equal('123, arnold');
      });

      it('internal fields always override form fields', () => {
        const doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z',
          chw_name: 'Arnold',
          contact: {
            name: 'Sally',
            parent: {
              contact: {
                name: 'Sally'
              }
            }
          }
        };
        const actual = utils.template({}, null, doc, { message: '{{contact.name}}, {{chw_name}}' });
        expect(actual).to.equal('Sally, Arnold');
      });

      it('merges extra context', () => {
        const doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z',
          chw_name: 'Arnold'
        };
        const extraContext = {
          patient: {
            parent: {
              type: 'clinic',
              contact: { name: 'Bede' }
            }
          }
        };
        const config = {};
        const translate = null;
        const content = { message: 'Your CHP is {{clinic.contact.name}}' };
        const actual = utils.template(config, translate, doc, content, extraContext);
        expect(actual).to.equal('Your CHP is Bede');
      });

      // Tests how standard configuration sets district_hospital parents
      it('handles parent as an empty string - #4410', () => {
        const doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z',
          chw_name: 'Arnold',
          parent: {
            type: 'health_center',
            parent: {
              type: 'district_hospital',
              parent: ''
            }
          }
        };
        const extraContext = {
          patient: {
            parent: {
              type: 'clinic',
              contact: { name: 'Bede' }
            }
          }
        };
        const config = {};
        const translate = null;
        const content = { message: 'Your CHP is {{clinic.contact.name}}' };
        const actual = utils.template(config, translate, doc, content, extraContext);
        expect(actual).to.equal('Your CHP is Bede');
      });

    });

  });

  describe('hasError', () => {
    it('should work with incorrect param', () => {
      expect(utils.hasError()).to.equal(undefined);
      expect(utils.hasError(false)).to.equal(false);
      expect(utils.hasError({})).to.equal(undefined);
      expect(utils.hasError([])).to.equal(undefined);
    });

    it('should return correct result', () => {
      expect(utils.hasError([{ a: 1 }])).to.equal(undefined);
      expect(utils.hasError([{ error: false }])).to.equal(false);
      expect(utils.hasError([{ error: 'something' }])).to.equal('something');
    });
  });

  describe('getMessage', () => {
    it('should return with no config', () => {
      expect(utils.getMessage(undefined)).to.equal('');
    });

    it('should return translation when using translationKey', () => {
      const config = {
        translationKey: 'some_key',
        message: [{ locale: 'en', content: 'aaa' }],
      };
      const translate = sinon.stub().returnsArg(0);
      expect(utils.getMessage(config, translate, 'en', console)).to.equal('some_key');
      expect(translate.callCount).to.equal(1);
      expect(translate.args[0]).to.deep.equal(['some_key', 'en']);
    });

    it('should return translation when using translation_key', () => {
      const config = {
        translation_key: 'other_key',
        message: [{ locale: 'en', content: 'aaa' }],
      };
      const translate = sinon.stub().returnsArg(0);
      expect(utils.getMessage(config, translate, 'en', console)).to.equal('other_key');
      expect(translate.callCount).to.equal(1);
      expect(translate.args[0]).to.deep.equal(['other_key', 'en']);
    });

    it('should return message', () => {
      const config = { message: 'the message' };
      expect(utils.getMessage(config)).to.equal('the message');
    });

    it('should return messages', () => {
      const config = { messages: 'the messages' };
      expect(utils.getMessage(config)).to.equal('the messages');
    });

    it('should return empty when no messages', () => {
      const config = { messages: [] };
      expect(utils.getMessage(config)).to.equal('');
    });

    it('should return message for requested locale', () => {
      const config = {
        messages: [
          { locale: 'en', content: 'the en' },
          { locale: 'fr', content: 'the fr' },
          { locale: 'nl', content: 'the nl' },
        ]
      };
      const translate = sinon.stub().returnsArg(0);
      expect(utils.getMessage(config, translate, 'fr')).to.equal('the fr');
      expect(translate.callCount).to.equal(0);
    });

    it('should return message for fallback to en when no locale is passed', () => {
      const config = {
        messages: [
          { locale: 'en', content: 'the en' },
          { locale: 'fr', content: 'the fr' },
          { locale: 'nl', content: 'the nl' },
        ]
      };
      const translate = sinon.stub().returnsArg(0);
      expect(utils.getMessage(config, translate)).to.equal('the en');
      expect(translate.callCount).to.equal(0);
    });

    it('should return message for fallback to first in array when no locale is passed', () => {
      const config = {
        message: [
          { locale: 'nl', content: 'the nl' },
          { locale: 'en', content: 'the en' },
          { locale: 'fr', content: 'the fr' },
        ]
      };
      const translate = sinon.stub().returnsArg(0);
      expect(utils.getMessage(config, translate, 'zf')).to.equal('the nl');
      expect(translate.callCount).to.equal(0);
    });

    it('should work when messages are misconfigured', () => {
      const config = {
        messages: [
          { locale: 'nl', contents: 'the nl' },
          { locale: 'en', not_content: 'the en' },
          { locale: 'fr', the_content: 'the fr' },
        ]
      };
      const translate = sinon.stub().returnsArg(0);
      expect(utils.getMessage(config, translate, 'zf')).to.equal('');
      expect(translate.callCount).to.equal(0);
    });
  });
});
