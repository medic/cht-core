const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');
const moment = require("moment");

const isPregnant = function (edd, lmpApprox, pregRes, pregResKit) {
    if (edd !== null && !(lmpApprox === '61' || lmpApprox === '91')) {
        return true;
    }
    if (lmpApprox === '122' || lmpApprox === '183' || lmpApprox === '244') {
        return true;
    }
    if (edd !== null && (pregRes === 'pos' || pregResKit === 'pos')) {
        return true;
    }
    return false;
};



module.exports = new Factory()
    .option('patient', '')
    .option('contact', '')
    .attr('inputs', ['patient'], (patient) => {
        const inputContact = {
            _id: patient._id,
            name: patient.name,
            date_of_birth: patient.date_of_birth,
            sex: patient.sex,
            parent: { _id: patient.parent._id }
        };
        const input = {
            meta: '',
            source: 'contact',
            source_id: '',
            contact: inputContact
        };
        return input;
    })
    .attr('patient_id', ['patient'], (patient) => {
        return patient._id;
    })
    .attr('patient_name', ['patient'], (patient) => {
        return patient.name;
    })
    .attr('visited_contact_uuid', ['contact'], (contact) => {
        return contact._id;
    })
    .attr('patient_age_in_years', ['patient'], (patient) => {
        return patient.age_years;
    })
    .attr('group_lmp', () => {
        let gLmpMethod = Faker.faker.random.arrayElement(['calendar', 'approx']);
        let gLmpCalendar = null;
        let gLmpApprox = null;
        let gLmpDateRaw = null;
        let gLmpDate8601 = null;
        let gLmpDate = null;
        let gEdd8601 = null;
        let gEdd = null;
        let gPregTest = null;
        let gPregRes = null;
        let gPregResKit = null;

        if (gLmpMethod === 'calendar') {
            gLmpCalendar = moment().subtract(Faker.faker.datatype.number({ min: 1, max: 9 }), "month").format('YYYY-MM-DD');
            gLmpDateRaw = gLmpCalendar;
            gLmpDate8601 = gLmpCalendar;
            gLmpDate = gLmpCalendar;
        } else {
            gLmpApprox = Faker.faker.random.arrayElement([61, 91, 122, 183, 244]);
            gLmpDateRaw = moment().subtract(gLmpApprox, "day");
            gLmpDate8601 = moment().subtract(gLmpApprox, "day").format('YYYY-MM-DD');
            gLmpDate = moment().subtract(gLmpApprox, "day").format('MMM D, YYYY');
        }
        gEdd8601 = moment(gLmpDate8601).add(279, "days");
        gEdd = moment(gLmpDate8601).add(279, "days").format('MMM D, YYYY');

        if (gLmpApprox === '61' || gLmpApprox === '91') {
            gPregTest = Faker.faker.random.arrayElement(['yes', 'no']);
        }

        if (gPregTest === 'yes') {
            gPregRes = Faker.faker.random.arrayElement(['pos', 'neg']);
        } else {
            gPregResKit = gPregRes = Faker.faker.random.arrayElement(['pos', 'neg']);
        }
        const groupLmp = {
            g_lmp_method: gLmpMethod,
            g_lmp_calendar: gLmpCalendar,
            g_lmp_approx: gLmpApprox,
            g_lmp_date_raw: gLmpDateRaw,
            g_lmp_date_8601: gLmpDate8601,
            g_lmp_date: gLmpDate,
            g_edd_8601: gEdd8601,
            g_edd: gEdd,
            g_preg_test: gPregTest,
            g_preg_res: gPregRes,
            g_preg_res_kit: gPregResKit,
        };
        return groupLmp;
    })
    .attr('group_llin_parity', ['group_lmp'], (groupLmp) => {
        if (!isPregnant(groupLmp.g_edd, groupLmp.g_lmp_approx, groupLmp.g_preg_res, groupLmp.g_preg_res_kit)) {
            return null;
        }

        const groupLlinParity = {
            patient_llin: Faker.faker.random.arrayElement(['yes', 'no'])
        };
        return groupLlinParity;
    })
    .attr('group_anc_visit', ['group_lmp'], (groupLmp) => {
        if (!isPregnant(groupLmp.g_edd, groupLmp.g_lmp_approx, groupLmp.g_preg_res, groupLmp.g_preg_res_kit)) {
            return null;
        }
        let ancVisit = Faker.faker.random.arrayElement(['yes', 'no']);
        let ancVisitRepeat = null;
        let prophylaxisTaken = Faker.faker.random.arrayElement(['yes', 'no']);
        let lastDose = null;
        let lastDoseDate = null;
        let ttImm = Faker.faker.random.arrayElement(['yes', 'no']);
        let tt_received = null;
        let tt_date = null;
        let gAncLastVisit = moment().format('YYYY-MM-DD');
        let gAncLastVisitEpoch = moment(gAncLastVisit).unix() / 120;

        if (ancVisit === 'yes') {
            ancVisitRepeat = {
                anc_visit_completed: Faker.faker.random.arrayElement(['anc_1', 'anc_2', 'anc_3', 'anc_4', 'anc_5', 'anc_6', 'anc_7', 'anc_8']),
                g_anc_last_visit: gAncLastVisit,
                note_warning: '',
                g_anc_last_visit_epoch: gAncLastVisitEpoch,
                bp_reading: Faker.faker.lorem.word()
            }
        }
        if (prophylaxisTaken === 'yes') {
            lastDose = Faker.faker.random.arrayElement(['ipt_1', 'ipt_2', 'ipt_3', 'ipt_4']);
            lastDoseDate = moment().subtract(Faker.faker.datatype.number({ min: 1, max: 120 }), "month").format('YYYY-MM-DD');

        }

        if (ttImm === 'yes') {
            tt_received = Faker.faker.random.arrayElement(['tt_1', 'tt_2']);
            tt_date = moment().subtract(Faker.faker.datatype.number({ min: 1, max: 120 }), "month").format('YYYY-MM-DD');

        }
        const groupAncVisit = {
            anc_visit: ancVisit,
            anc_visit_repeat: ancVisitRepeat,
            prophylaxis_taken: prophylaxisTaken,
            last_dose: lastDose,
            last_dose_date: lastDoseDate,
            tt_imm: ttImm,
            tt_received: tt_received,
            tt_date: tt_date,
            given_mebendazole: Faker.faker.random.arrayElement(['yes', 'no'])
        };
        return groupAncVisit;
    })
    .attr('g_nutrition_screening', ['group_lmp'], (groupLmp) => {
        if (!isPregnant(groupLmp.g_edd, groupLmp.g_lmp_approx, groupLmp.g_preg_res, groupLmp.g_preg_res_kit)) {
            return null;
        }
        let lastFood = [];
        lastFood.push(Faker.faker.random.arrayElement(['milk', 'eggs', 'meat', 'none']));
        if (lastFood[0] !== 'none') {
            lastFood.push(Faker.faker.helpers.uniqueArray(['milk', 'eggs', 'meat'], Faker.faker.datatype.number({ min: 0, max: 3 })));
        }
        let motherHivStatus = Faker.faker.random.arrayElement(['pos', 'neg', 'unknown', 'undisclosed']);
        let motherArv = null;
        if (motherHivStatus === 'pos') {
            motherArv = Faker.faker.random.arrayElement(['yes', 'no']);
        }
        const gNutritionScreening = {
            muac_score: Faker.faker.datatype.number(),
            mother_weight: Faker.faker.datatype.number(),
            last_fed: Faker.faker.random.arrayElement(['1', '2', '3', '4', '5', '6', '7']),
            last_food: lastFood,
            mother_hiv_status: motherHivStatus,
            mother_arv: motherArv
        };
        return gNutritionScreening;
    })
    .attr('group_risk_factors', ['group_lmp'], (groupLmp) => {
        if (!isPregnant(groupLmp.g_edd, groupLmp.g_lmp_approx, groupLmp.g_preg_res, groupLmp.g_preg_res_kit)) {
            return null;
        }
        let gravida = Faker.faker.datatype.number({ min: 0, max: 4 });
        let parity = Faker.faker.datatype.number({ min: 0, max: gravida });

        let gRiskFactors = [];
        gRiskFactors.push(Faker.faker.random.arrayElement(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']));
        if (gRiskFactors[0] !== 'r8') {
            if (gRiskFactors[0] === 'r1') {
                gRiskFactors.push(Faker.faker.helpers.uniqueArray(['r5', 'r6'], Faker.faker.datatype.number({ min: 0, max: 2 })));
            } else {//TODO aqui se podria repetir, corregir
                gRiskFactors.push(Faker.faker.helpers.uniqueArray(['r2', 'r3', 'r4', 'r5', 'r6', 'r7'], Faker.faker.datatype.number({ min: 0, max: 6 })));
            }
        }
        const groupRiskFactors = {
            gravida: gravida,
            parity: parity,
            g_risk_factors: gRiskFactors
        };
        return groupRiskFactors;
    })
    .attr('group_danger_signs', ['group_lmp'], (groupLmp) => {
        if (!isPregnant(groupLmp.g_edd, groupLmp.g_lmp_approx, groupLmp.g_preg_res, groupLmp.g_preg_res_kit)) {
            return null;
        }
        const groupDangerSigns = {
            g_danger_signs: Faker.faker.helpers.uniqueArray(['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9'],
                Faker.faker.datatype.number({ min: 0, max: 9 }))
        };
        return groupDangerSigns;
    })
    .attr('lmp_method', ['group_lmp'], (groupLmp) => {
        return groupLmp.g_lmp_method;
    })
    .attr('lmp_date_8601', ['group_lmp'], (groupLmp) => {
        return groupLmp.g_lmp_date_8601;
    })
    .attr('lmp_date', ['group_lmp'], (groupLmp) => {
        return groupLmp.g_lmp_date;
    })
    .attr('edd_8601', ['group_lmp'], (groupLmp) => {
        return groupLmp.g_edd_8601;
    })
    .attr('edd', ['group_lmp'], (groupLmp) => {
        return groupLmp.g_edd;
    })
    .attr('risk_factors', ['group_risk_factors'], (groupRiskFactors) => {
        return groupRiskFactors.g_risk_factors;
    })
    .attr('danger_signs', ['group_danger_signs'], (groupDangerDigns) => {
        return groupDangerDigns.g_danger_signs;
    })
    .attr('anc_last_visit', ['group_anc_visit'], (groupAncVisit) => {
        return groupAncVisit.g_anc_last_visit;
    })
    .attr('anc_visit_identifier', '')
    .attr('anc_last_bp_reading', '')
    .attr('patient_age_at_lmp', ['patient', 'group_lmp'], (patient, groupLmp) => {
        let birthDate = moment(patient.date_of_birth);
        let lmpDate = moment(groupLmp.g_lmp_date_8601);
        let yearsDiff = birthDate.diff(lmpDate, 'years');
        let ageAtLmp = moment(birthDate).subtract(yearsDiff);
        return ageAtLmp;
    })
    .attr('days_since_lmp', ['group_lmp'], (groupLmp) => {
        let now = moment();
        let lmpDate = moment(groupLmp.g_lmp_date_8601);
        let daysDiff = now.diff(lmpDate, 'days');
        return daysDiff;
    })
    .attr('weeks_since_lmp', ['group_lmp'], (groupLmp) => {
        let now = moment();
        let lmpDate = moment(groupLmp.g_lmp_date_8601);
        let weeksDiff = now.diff(lmpDate, 'weeks');
        return weeksDiff;
    });