module.exports = {

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
    riskDanger: [
      ['method_lmp'],
      ['1999-08-01'],
      [],
      ['1'],
      ['yes', '1999-12-15'],
      ['yes', '2000-01-15'],
      ['no', 'no'],
      ['asthma', 'yes', 'underweight'],
      ['yes', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no'],
      ['no'],
      ['no'],
      ['no'],
      [],
      ['no'],
      ['no'],
      []
    ]
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
