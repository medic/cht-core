module.exports = {

  deathReportScenarios: {
    withDeathDate: deathDate => [
      [deathDate, 'health_facility', 'Died while sleeping.'],
      [],
    ],
    undo:[
      ['yes']
    ]
  },

  pregnancyRegistrationScenarios: {
    safe: [
      ['method_lmp'],
      ['1999-08-01'],
      [],
      ['0'],
      ['yes', '2000-01-15'],
      ['no', 'no'],
      ['none', 'no'],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      ['no'],
      [],
      ['no'],
      []
    ],
    safeNoFollowUp: [
      ['method_lmp'],
      ['1999-08-01'],
      [],
      ['0'],
      ['no'],
      [],
      ['no', 'no'],
      ['none', 'no'],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      ['no'],
      [],
      ['no'],
      []
    ],
    safe12WeeksApprox: [
      ['method_approx'],
      ['approx_weeks', '12'],
      [],
      ['0'],
      ['no'],
      [],
      ['no', 'no'],
      ['none', 'no'],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      [],
      ['no'],
      []
    ],
    safe3MonthsApprox: [
      ['method_approx'],
      ['approx_months', '3'],
      [],
      ['0'],
      ['no'],
      [],
      ['no', 'no'],
      ['none', 'no'],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      ['no'],
      [],
      ['no'],
      []
    ],

    safeWithEddMethod: [
      ['method_edd'],
      ['2000-05-07'],
      [],
      ['0'],
      ['no'],
      [],
      ['no', 'no'],
      ['none', 'no'],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      ['no'],
      [],
      ['no'],
      []
    ],
    safe12Weeks: [
      ['method_lmp'],
      ['1999-10-09'],
      [],
      ['0'],
      ['no'],
      [],
      ['no', 'no'],
      ['none', 'no'],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      [],
      ['no'],
      []
    ],
    safe12Weeks1Day: [
      ['method_lmp'],
      ['1999-10-08'],
      [],
      ['0'],
      ['no'],
      [],
      ['no', 'no'],
      ['none', 'no'],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      ['no'],
      [],
      ['no'],
      []
    ],
    safe10Weeks: [
      ['method_lmp'],
      ['1999-08-01'],
      [],
      ['0'],
      ['no'],
      [],
      ['no', 'no'],
      ['none', 'no'],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      [],
      ['no'],
      []
    ],
    safe10WeeksWith1FacilityVisit: [
      ['method_lmp'],
      ['1999-08-01'],
      [],
      ['1'],
      ['no'],
      ['no'],
      [],
      ['no', 'no'],
      ['none', 'no'],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      [],
      ['no'],
      ['no'],
      []
    ],
    safe10WeeksWith4FacilityVisits: [
      ['method_lmp'],
      ['1999-08-01'],
      [],
      ['4'],
      ['no', 'no', 'no', 'no'],
      ['no'],
      [],
      ['no', 'no'],
      ['none', 'no'],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      [],
      ['no'],
      ['no'],
      []
    ],

    danger: [
      ['method_lmp'],
      ['1999-11-01'],
      [],
      ['0'],
      ['yes', '2000-01-20'],
      ['no', 'no'],
      ['none', 'no'],
      ['yes', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no'],
      ['no'],
      ['no'],
      [],
      ['no'],
      []
    ],
    lmpUnknown: [
      ['method_none'],
      ['visibly_pregnant'],
      ['no', 'no'],
      ['none', 'no'],
      Array(11).fill('no'),
      ['yes'],
      ['yes'],
      ['yes'],
      []

    ],
    riskDanger: opts => {
      const content = {
        firstPregnancy: 'no',
        miscarriages: 'no',
        conditions: ['asthma'],
        additionalFactors: ['yes', 'underweight']
      };
      Object.assign(content, opts);

      const pregnancyAnswers = [content.firstPregnancy];
      if (content.firstPregnancy === 'no') {
        pregnancyAnswers.push(content.miscarriages);
      }

      return [
        ['method_lmp'],
        ['1999-08-01'],
        [],
        ['1'],
        ['yes', '1999-12-15'],
        ['yes', '2000-01-15'],
        pregnancyAnswers,
        [content.conditions, ...content.additionalFactors],
        ['yes', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no'],
        ['no'],
        ['no'],
        ['no'],
        [],
        ['no'],
        ['no'],
        []
      ];
    },
  },

  pregnancyHomeVisitScenarios: {
    safe: [
      ['yes', 'yes'],
      ['yes', 'no'],
      ['none', 'no'],
      ['no'],
      [],
      Array(11).fill('no'),
      ['yes'],
      ['yes'],
      ['yes'],
      [],
      ['yes'],
      ['yes'],
      []
    ],
    safeNoFacilityVisits: [
      ['yes', 'yes'],
      ['no'],
      ['none', 'no'],
      ['no'],
      [],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      [],
      ['no'],
      []
    ],
    safe1FacilityVisit: [
      ['yes', 'yes'],
      ['yes', '1', 'no'],
      ['none', 'no'],
      ['no'],
      [],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      [],
      ['no'],
      ['no'],
      []
    ],
    safe4FacilityVisits: [
      ['yes', 'yes'],
      ['yes', '4', 'no', 'no', 'no', 'no'],
      ['none', 'no'],
      ['no'],
      [],
      Array(11).fill('no'),
      ['no'],
      ['no'],
      [],
      ['no'],
      ['no'],
      []
    ],
    danger: [
      ['yes', 'yes'],
      ['no', 'no'],
      ['none', 'no'],
      ['no'],
      [],
      Array(11).fill('yes'),
      ['yes'],
      ['yes'],
      ['yes'],
      [],
      ['yes'],
      ['yes'],
      []
    ],
    riskDangerUpdateEDD: [
      ['yes', 'no'],
      ['method_edd', '2000-05-10'],
      [],
      ['yes', 'no'],
      ['diabetes', 'yes', 'hypothyroidism'],
      ['no'],
      [],
      Array(11).fill('yes'),
      ['yes'],
      ['yes'],
      ['yes'],
      ['yes'],
      ['yes'],
      []
    ],
    lmpUnknown: [
      ['yes', 'yes'],
      Array(11).fill('no'),
      ['yes'],
      ['yes'],
      ['yes'],
      ['yes'],
      []
    ],
    miscarriage: [
      ['miscarriage'],
      ['2000-01-02']
    ],
    abortion: [
      ['abortion'],
      ['2000-01-02']
    ],
    clearAll: [
      ['migrated'],
      ['clear_all']
    ],
    riskDangerMultipleVisits: [
      ['yes', 'yes'],
      ['yes', '2', 'yes', '1999-10-02', 'yes', '1999-10-05'],
      ['asthma,diabetes', 'yes', 'underweight'],
      ['yes', '1999-11-01'],
      ['no', 'yes', 'no', 'no', 'no', 'yes', 'no', 'no', 'no', 'no', 'no'],
      ['yes'],
      ['yes'],
      [],
      ['yes'],
      ['yes'],
      []
    ],
    attendedLastANCVisit: ({ ttReceivedPast } = {}) => [
      ['yes', 'yes'],
      ['yes', 'no'],
      ['none', 'no'],
      ['no'],
      [],
      Array(11).fill('yes'),
      ['yes'],
      ['yes'],
      ['yes'],
      [],
      ['yes'],
      ...(ttReceivedPast ? [] : [['yes']]),
    ]
  },
  pregnancyDangerSignScenarios: {
    danger: [
      Array(11).fill('yes')
    ],
    followUp: {
      cured: [
        ['yes', 'no']
      ],
      danger: [
        ['yes', 'yes', 'yes', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no']
      ]
    }
  },

  deliveryReportScenarios: {
    oneChildHealthyFacility: [
      ['alive_well'],
      Array(5).fill('no'),
      ['1', '1', '2000-04-22', 'health_facility', 'vaginal'],
      ['alive_well', 'Baby-1', 'female', 'yes', '2500', 'yes', '45', 'bcg_and_birth_polio', 'yes', 'yes'].concat(Array(9).fill('no')),
      [],
      ['within_24_hrs'],
      []
    ],
    oneChildHealthyHome: [
      ['alive_well'],
      Array(5).fill('no'),
      ['1', '1', '2000-04-22', 'home', 'skilled'],
      ['alive_well', 'Baby-1', 'female', 'yes', '2500', 'yes', '45', 'bcg_and_birth_polio', 'yes', 'yes'].concat(Array(9).fill('no')),
      [],
      ['within_24_hrs'],
      []
    ],
    motherDangerSign: [
      ['alive_well'],
      ['no', 'no', 'no', 'no', 'yes'],
      ['1', '1', '2000-04-22', 'home', 'skilled'],
      ['alive_well', 'Baby-1', 'female', 'yes', '2500', 'yes', '45', 'bcg_and_birth_polio', 'yes', 'yes'].concat(Array(9).fill('no')),
      [],
      ['within_24_hrs'],
      []
    ],
    twoChildrenHealthy: [
      ['alive_well'],
      Array(5).fill('no'),
      ['2', '2', '2000-04-22', 'health_facility', 'vaginal'],
      ['alive_well', 'Baby-1', 'female', 'yes', '2500', 'yes', '45', 'bcg_and_birth_polio', 'yes', 'yes'].concat(Array(9).fill('no')).concat(
        ['alive_well', 'Baby-2', 'female', 'yes', '2500', 'yes', '45', 'bcg_and_birth_polio', 'yes', 'yes'].concat(Array(9).fill('no'))
      ),
      [],
      ['within_24_hrs'],
      []
    ],
    oneChildHealthyOneDeceasedOneStillbirth: [
      ['alive_well'],
      Array(5).fill('no'),
      ['3', '1', '2000-04-22', 'health_facility', 'vaginal'],
      ['2000-04-22', 'health_facility', 'yes', '', '2000-04-23', 'home', 'no', ''],
      ['alive_well', 'Baby-1', 'female', 'yes', '2500', 'yes', '45', 'bcg_and_birth_polio', 'yes', 'yes'].concat(Array(9).fill('no')),
      [],
      ['within_24_hrs'],
      []
    ],
    babyDeceased: (deliveryDate, motherOutcome) => [
      [motherOutcome],
      Array(5).fill('no'),
      [1, 0, deliveryDate, 'health_facility', 'vaginal'],
      [deliveryDate, 'health_facility', 'yes', 'Baby Death Notes'],
      ['none', ''],
      [],
    ],
    motherDeceased: deliveryDate => [
      ['deceased'],
      [deliveryDate, 'health_facility', 'yes', 'Additional Notes'],
      [1, 1, deliveryDate, 'health_facility', 'vaginal'],
      ['alive_well', 'Baby Name', 'female', 'yes', 2000, 'yes', 50, 'bcg_and_birth_polio', ...Array(11).fill('no')],
      [],
      ['none', ''],
      [],
    ],
    babyDeceased_motherDeceased: (deliveryDate) => [
      ['deceased'],
      [deliveryDate, 'health_facility', 'yes', 'Mother Death Notes'],
      [1, 0, deliveryDate, 'health_facility', 'vaginal'],
      [deliveryDate, 'health_facility', 'yes', 'Baby Death Notes'],
      [],
    ],
    pncVisits: (deliveryDate, pncVisitsAttended, pncVisitsAdditional) => [
      ['alive_well'],
      Array(5).fill('no'),
      [1, 1, deliveryDate, 'health_facility', 'vaginal'],
      ['alive_well', 'Baby Name', 'female', 'yes', 2000, 'yes', 50, 'bcg_and_birth_polio', 'yes', 'yes', ...Array(9).fill('no')],
      [],
      [pncVisitsAttended, pncVisitsAdditional],
      [],
    ]
  },

  pncDangerSignFollowUpScenarios: {
    mother: {
      cured: [
        ['yes', 'no', 'no', 'no', 'no', 'no', 'no']
      ],
      danger: [
        ['yes', 'yes', 'yes', 'no', 'no', 'no', 'no']
      ]
    },
    baby: {
      cured: [
        ['yes', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no']
      ],
      danger: [
        ['yes', 'yes', 'yes', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no']
      ]
    }
  }

};
