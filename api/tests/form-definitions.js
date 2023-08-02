/**
 * Shamelessly copied form medic-data/data/test/forms.json to
 * provide mock data for tests
 */

exports.forms = {
  YYYY: {
    meta: {
      code: 'YYYY',
      label: 'Test Monthly Report'
    },
    fields: {
      facility_id: {
        labels: {
          short: 'Health Facility Identifier',
          tiny: 'HFI'
        },
        type: 'string',
        required: true
      },
      year: {
        labels: {
          short: 'Report Year',
          tiny: 'RPY'
        },
        type: 'integer',
        required: true
      },
      month: {
        labels: {
          short: 'Report Month',
          tiny: 'RPM'
        },
        type: 'integer',
        list: [
          [
            1,
            {
              en: 'January'
            }
          ],
          [
            2,
            {
              en: 'February'
            }
          ],
          [
            3,
            {
              en: 'March'
            }
          ],
          [
            4,
            {
              en: 'April'
            }
          ],
          [
            5,
            {
              en: 'May'
            }
          ],
          [
            6,
            {
              en: 'June'
            }
          ],
          [
            7,
            {
              en: 'July'
            }
          ],
          [
            8,
            {
              en: 'August'
            }
          ],
          [
            9,
            {
              en: 'September'
            }
          ],
          [
            10,
            {
              en: 'October'
            }
          ],
          [
            11,
            {
              en: 'November'
            }
          ],
          [
            12,
            {
              en: 'December'
            }
          ]
        ],
        required: true
      },
      misoprostol_administered: {
        type: 'boolean',
        labels: {
          short: {
            en: 'Misoprostol?'
          },
          tiny: {
            en: 'MSP'
          },
          description: {
            en: 'Was misoprostol administered?'
          }
        }
      },
      'quantity_dispensed.la_6x1': {
        labels: {
          short: 'LA 6x1: Dispensed total',
          tiny: 'L1T'
        },
        type: 'integer'
      },
      'quantity_dispensed.la_6x2': {
        labels: {
          short: 'LA 6x2: Dispensed total',
          tiny: 'L2T'
        },
        type: 'integer'
      },
      'quantity_dispensed.cotrimoxazole': {
        labels: {
          short: 'Cotrimoxazole: Dispensed total',
          tiny: 'CDT'
        },
        type: 'integer'
      },
      'quantity_dispensed.zinc': {
        labels: {
          short: 'Zinc: Dispensed total',
          tiny: 'ZDT'
        },
        type: 'integer'
      },
      'quantity_dispensed.ors': {
        labels: {
          short: 'ORS: Dispensed total',
          tiny: 'ODT'
        },
        type: 'integer'
      },
      'quantity_dispensed.eye_ointment': {
        labels: {
          short: 'Eye Ointment: Dispensed total',
          tiny: 'EOT'
        },
        type: 'integer'
      },
      'days_stocked_out.la_6x1': {
        labels: {
          short: 'LA 6x1: Days stocked out',
          tiny: 'L1O'
        },
        type: 'integer'
      },
      'days_stocked_out.la_6x2': {
        labels: {
          short: 'LA 6x2: Days stocked out',
          tiny: 'L2O'
        },
        type: 'integer'
      },
      'days_stocked_out.cotrimoxazole': {
        labels: {
          short: 'Cotrimoxazole: Days stocked out',
          tiny: 'CDO'
        },
        type: 'integer'
      },
      'days_stocked_out.zinc': {
        labels: {
          short: 'Zinc: Days stocked out',
          tiny: 'ZDO'
        },
        type: 'integer'
      },
      'days_stocked_out.ors': {
        labels: {
          short: 'ORS: Days stocked out',
          tiny: 'ODO'
        },
        type: 'integer'
      },
      'days_stocked_out.eye_ointment': {
        labels: {
          short: 'Eye Ointment: Days stocked out',
          tiny: 'EDO'
        },
        type: 'integer'
      }
    },
    facility_reference: 'facility_id'
  },
  YYYZ: {
    meta: {
      code: 'YYYZ',
      label: 'Test Form - Required fields'
    },
    fields: {
      one: {
        labels: {
          short: 'One',
          tiny: 'one'
        },
        type: 'string',
        required: true
      },
      two: {
        labels: {
          short: 'Two',
          tiny: 'two'
        },
        type: 'string',
        required: true
      },
      birthdate: {
        labels: {
          short: 'Birth Date',
          tiny: 'BIR'
        },
        type: 'date'
      }
    }
  },
  YYYX: {
    meta: {
      code: 'YYYX',
      label: 'Test Form - Required Facility'
    },
    fields: {
      id: {
        labels: {
          short: 'ID'
        },
        type: 'string',
        required: true
      },
      foo: {
        labels: {
          short: 'Foo'
        },
        type: 'string',
        required: true
      },
      facility_reference: 'id',
      facility_required: true
    }
  },
  YYYW: {
    meta: {
      code: 'YYYW',
      label: 'Test Form - Public Form'
    },
    fields: {
      id: {
        labels: {
          short: 'ID'
        },
        type: 'string',
        required: true
      },
      foo: {
        labels: {
          short: 'Foo'
        },
        type: 'string',
        required: true
      }
    },
    public_form: true
  },
  YYYV: {
    meta: {
      code: 'YYYV',
      label: 'Test Labels'
    },
    fields: {
      id: {
        labels: {
          short: {
            fr: 'Identifier'
          }
        },
        type: 'string',
        required: true
      },
      foo: {
        labels: {
          short: {
            fr: 'Foo Bar'
          }
        },
        type: 'string',
        required: true
      }
    },
    public_form: true
  },
  YYYU: {
    meta: {
      code: 'YYYU',
      label: {
        fr: 'Contre-référence'
      }
    },
    fields: {
      cref_year: {
        labels: {
          long: null,
          description: null,
          short: {
            fr: 'Année'
          }
        },
        position: 0,
        type: 'integer',
        length: [
          4,
          4
        ],
      },
      cref_month: {
        labels: {
          long: null,
          description: null,
          short: {
            fr: 'Mois'
          }
        },
        position: 1,
        type: 'integer',
        length: [
          1,
          2
        ],
        flags: {

        },
        list: [
          [
            1,
            {
              fr: 'Janvier'
            }
          ],
          [
            2,
            {
              fr: 'Février'
            }
          ],
          [
            3,
            {
              fr: 'Mars'
            }
          ],
          [
            4,
            {
              fr: 'Avril'
            }
          ],
          [
            5,
            {
              fr: 'Mai'
            }
          ],
          [
            6,
            {
              fr: 'Juin'
            }
          ],
          [
            7,
            {
              fr: 'Juillet'
            }
          ],
          [
            8,
            {
              fr: 'Aout'
            }
          ],
          [
            9,
            {
              fr: 'Septembre'
            }
          ],
          [
            10,
            {
              fr: 'Octobre'
            }
          ],
          [
            11,
            {
              fr: 'Novembre'
            }
          ],
          [
            12,
            {
              fr: 'Décembre'
            }
          ]
        ]
      },
      cref_day: {
        labels: {
          long: null,
          description: null,
          short: {
            fr: 'Jour'
          }
        },
        position: 2,
        type: 'integer',
        length: [
          1,
          2
        ],
        flags: {

        }
      },
      cref_rc: {
        labels: {
          long: null,
          description: null,
          short: {
            fr: 'Code du RC'
          }
        },
        position: 3,
        type: 'string',
        length: [
          11,
          11
        ],
        flags: {
          input_digits_only: true
        }
      },
      cref_ptype: {
        labels: {
          long: null,
          description: null,
          short: {
            fr: 'Type de patient'
          }
        },
        position: 4,
        type: 'integer',
        length: [
          1,
          2
        ],
        list: [
          [
            1,
            {
              fr: 'Femme enceinte'
            }
          ],
          [
            2,
            {
              fr: 'Accouchée malade'
            }
          ],
          [
            3,
            {
              fr: 'Enfant'
            }
          ],
          [
            4,
            {
              fr: 'Nouveau né'
            }
          ],
          [
            5,
            {
              fr: 'Autre'
            }
          ]
        ]
      },
      cref_name: {
        labels: {
          long: null,
          description: null,
          short: {
            fr: 'Nom'
          }
        },
        position: 5,
        type: 'string',
        length: [
          0,
          20
        ]
      },
      cref_age: {
        labels: {
          long: null,
          description: null,
          short: {
            fr: 'Age'
          }
        },
        position: 6,
        type: 'integer',
        length: [
          1,
          2
        ]
      },
      cref_mom: {
        labels: {
          long: null,
          description: null,
          short: {
            fr: 'Nom de la mère ou de l\'accompagnant'
          }
        },
        position: 7,
        type: 'string',
        length: [
          0,
          20
        ]
      },
      cref_treated: {
        labels: {
          long: null,
          description: null,
          short: {
            fr: 'Patient traité pour'
          }
        },
        position: 8,
        type: 'string',
        length: [
          0,
          20
        ]
      },
      cref_rec: {
        labels: {
          long: null,
          description: null,
          short: {
            fr: 'Recommandations/Conseils'
          }
        },
        position: 9,
        type: 'integer',
        length: [
          1,
          2
        ],
        list: [
          [
            1,
            {
              fr: 'Accusé réception'
            }
          ],
          [
            2,
            {
              fr: 'Non recu, rechercher le malade'
            }
          ],
          [
            3,
            {
              fr: 'Revenir au CS'
            }
          ],
          [
            4,
            {
              fr: 'Suivi à domicile'
            }
          ],
          [
            5,
            {
              fr: 'Guéri'
            }
          ],
          [
            6,
            {
              fr: 'Décédé'
            }
          ],
          [
            7,
            {
              fr: 'Référé'
            }
          ],
          [
            8,
            {
              fr: 'Evadé'
            }
          ],
          [
            9,
            {
              fr: 'Refus d\'admission'
            }
          ],
          [
            10,
            {
              fr: 'Conseils hygiéno-diététiques'
            }
          ],
          [
            11,
            {
              fr: 'Autres'
            }
          ]
        ]
      },
      cref_reason: {
        labels: {
          long: null,
          description: null,
          short: {
            fr: 'Précisions pour recommandations'
          }
        },
        position: 10,
        type: 'string',
        length: [
          0,
          35
        ]
      },
      cref_agent: {
        labels: {
          long: null,
          description: null,
          short: {
            fr: 'Nom de l\'agent de santé'
          }
        },
        position: 11,
        type: 'string',
        length: [
          0,
          20
        ]
      }
    },
    facility_reference: 'cref_rc'
  },
  YYYT: {
    meta: {
      code: 'YYYT',
      label: 'Test bsDate'
    },
    fields: {
      patient_id: {
        labels: {
          long: 'Patient ID',
          tiny: 'ID'
        },
        type: 'string',
        required: true
      },
      lmp_date: {
        labels: {
          short: 'LMP Date in BS',
          tiny: 'LMP_BS'
        },
        type: 'bsDate',
        required: true
      }
    }
  },
  YYYS: {
    meta: {
      code: 'YYYS',
      label: 'Test date parts in BS calendar'
    },
    fields: {
      patient_id: {
        labels: {
          long: 'Patient ID',
          tiny: 'ID'
        },
        type: 'string',
        required: true
      },
      lmp_year: {
        labels: {
          short: 'Year',
          tiny: 'Y'
        },
        type: 'bsYear',
        required: true
      },
      lmp_month: {
        labels: {
          short: 'Month',
          tiny: 'M'
        },
        type: 'bsMonth',
        required: true
      },
      lmp_day: {
        labels: {
          short: 'Day',
          tiny: 'D'
        },
        type: 'bsDay',
        required: true
      },
      lmp_date: {
        labels: {
          short: 'LMP Date',
          tiny: 'LMP'
        },
        type: 'bsAggreDate',
        required: true
      }
    }
  },
  YYYR: {
    meta: {
      code: 'YYYR',
      label: 'Test date parts in BS calendar without bsMonth, bsDay'
    },
    fields: {
      patient_id: {
        labels: {
          long: 'Patient ID',
          tiny: 'ID'
        },
        type: 'string',
        required: true
      },
      lmp_year: {
        labels: {
          short: 'Year',
          tiny: 'Y'
        },
        type: 'bsYear',
        required: true
      },
      lmp_date: {
        labels: {
          short: 'LMP Date',
          tiny: 'LMP'
        },
        type: 'bsAggreDate',
        required: true
      }
    }
  },
  NP: {
    'meta': {
      'code': 'NP',
      'translation_key': 'forms.np.title',
      'label': {
        'en': 'New Person with phone_number Registration'
      }
    },
    'fields': {
      'patient_age': {
        'labels': {
          'tiny': {
            'en': 'Person Age'
          },
          'short': {
            'en': 'Person Age'
          }
        },
        'position': 0,
        'type': 'integer',
        'required': true
      },
      'phone_number': {
        'labels': {
          'tiny': {
            'en': 'phone number'
          },
          'description': {
            'en': 'phone number'
          },
          'short': {
            'en': 'phone number'
          }
        },
        'position': 1,
        'type': 'phone_number',
        'required': true
      },
      'patient_name': {
        'labels': {
          'tiny': {
            'en': 'patient_name'
          },
          'description': {
            'en': 'Patient name'
          },
          'short': {
            'en': 'Patient name'
          }
        },
        'position': 2,
        'type': 'string',
        'required': true
      }
    },
    'public_form': false,
    'use_sentinel': true
  }
};
