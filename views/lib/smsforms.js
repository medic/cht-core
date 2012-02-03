/**
 * @param {String} form - smsforms key string
 * @returns {Boolean} - Return true if this form is a referral since we need to
 * do extra work to process a referral form.
 * @api public
 */
exports.isReferralForm = function(form) {
    return ['MSBR','MSBC','MSBB'].indexOf(form) !== -1;
};

exports['TEST'] = {
    fields: [
        {key: 'foo', label: 'Foo', type: 'string'},
        {key: 'bar', label: 'Bar', type: 'number'}
    ],
    autoreply: 'Thank you!'
};

exports['PSMS'] = {
    fields: [
        {key: 'facility_id', label: 'Health Facility Identifier', type: 'string'},
        {key: 'year', label: 'Report Year', type: 'year'},
        {key: 'month', label: 'Report Month', type: 'month'},
        {key: 'la_6x1_dispensed', label: 'LA 6x1: Dispensed total', type: 'number'},
        {key: 'la_6x2_dispensed', label: 'LA 6x2: Dispensed total', type: 'number'},
        {key: 'cotrimoxazole_dispensed', label: 'Cotrimoxazole: Dispensed total', type: 'number'},
        {key: 'zinc_dispensed', label: 'Zinc: Dispensed total', type: 'number'},
        {key: 'ors_dispensed', label: 'ORS: Dispensed total', type: 'number'},
        {key: 'eye_ointment_dispensed', label: 'Eye Ointment: Dispensed total', type: 'number'},
        {key: 'la_6x1_days_stocked_out', label: 'LA 6x1: Days stocked out', type: 'number'},
        {key: 'la_6x2_days_stocked_out', label: 'LA 6x2: Days stocked out', type: 'number'},
        {key: 'cotrimoxazole_days_stocked_out', label: 'Cotrimoxazole: Days stocked out', type: 'number'},
        {key: 'zinc_days_stocked_out', label: 'Zinc: Days stocked out', type: 'number'},
        {key: 'ors_days_stocked_out', label: 'ORS: Days stocked out', type: 'number'},
        {key: 'eye_ointment_days_stocked_out', label: 'Eye Ointment: Days stocked out', type: 'number'}
    ],
    autoreply: "Zikomo!"
};

exports['PSCQ'] = {
    fields: [
        {key: 'supervision_year', label: 'Année', type: 'year'},
        {key: 'supervision_trimester', label: 'Trimestre', type: 'number'},
        {key: 'supervision_district', label: 'District de Santé', type: 'number'},
        {key: 'supervision_area', label: 'Aire de Santé', type: 'string'},
        {
            key: 'supervision_a1r',
            label: 'Nombre des ACT 1 reçus au cours du trimestre',
            type: 'number'
        },
        {
            key: 'supervision_a2r',
            label: "Nombre des ACT 2 reçus au cours du trimestre",
            type: 'number'
        },
        {
            key: 'supervision_a3r',
            label: "Nombre des SRO/Zinc reçus au cours du trimestre",
            type: 'number'
        },
        {
            key: 'supervision_a1dist',
            label: "Nombre des ACT 1 distribués au cours trimestre",
            type: 'number'
        },
        {
            key: 'supervision_a2dist',
            label: "Nombre des ACT 2 distribués au cours trimestre",
            type: 'number'
        },
        {
            key: 'supervision_a3dist',
            label: "Nombre des SRO/ZINC distribués au cours trimestre",
            type: 'number'
        },
        {
            key: 'supervision_a1disp',
            label: "Nombre des ACT 1 disponible à la fin du trimestre",
            type: 'number'
        },
        {
            key: 'supervision_a2disp',
            label: "Nombre des ACT 2 disponible à la fin du trimestre",
            type: 'number'
        },
        {
            key: 'supervision_a3disp',
            label: "Nombre des SRO/ZINC disponible à la fin du trimestre",
            type: 'number'
        },
        {
            key: 'supervision_r1',
            label: "Nombre des relais formés",
            type: 'number'
        },
        {
            key: 'supervision_r2',
            label: "Nombre des relais fonctionnels",
            type: 'number'
        },
        {
            key: 'supervision_r3',
            label: "Nombre de relais supervisés au cours du trimestre",
            type: 'number'
        },
        {
            key: 'supervision_r4',
            label: "Nombre de relais supervisés utilisant correctement l'algorithme",
            type: 'number'
        },
        {
            key: 'supervision_r5',
            label: "Nombre de relais supervisés capable de citer au moins 5 signes de danger",
            type: 'number'
        },
        {
            key: 'supervision_r6',
            label: "Nombre de relais communautaire supervisés ayant connu une rupture de stock en ACT de plus de 7 jours",
            type: 'number'
        },
        {
            key: 'supervision_r7',
            label: "Nombre de relais communautaire supervisés ayant connu une rupture de stock en kits SRO + zinc de plus de 7 jours",
            type: 'number'
        },
        {
            key: 'supervision_p1',
            label: "Nombre de personnes interrogées",
            type: 'number'
        },
        {
            key: 'supervision_p2',
            label: "Nombre de personnes interrogées qui rapportent les services rendus par le RC au sein de la communauté",
            type: 'number'
        },
        {
            key: 'supervision_p3',
            label: "Nombre de personnes interrogées qui affirment avoir administré un traitement à leur enfant chaque fois qu'il est malade",
            type: 'number'
        },
        {
            key: 'supervision_p4',
            label: "Nombre de personnes interrogées qui déclarent avoir rencontré le RC lorsqu'ils étaient dans le besoin",
            type: 'number'
        },
        {
            key: 'supervision_v1',
            label: "Nombre de malades vus par les RC pour toutes causes confondues",
            type: 'number'
        },
        {
            key: 'supervision_v2',
            label: "Nombre de malades vus par les RC pour paludisme",
            type: 'number'
        },
        {
            key: 'supervision_v3',
            label: "Nombre de malades vus par les RC pour diarrhée",
            type: 'number'
        },
        {key: 'supervision_t1', label: "Paludisme traités", type: 'number'},
        {key: 'supervision_t2', label: "Diarrhée traitées", type: 'number'},
        {key: 'supervision_ref1', label: "Cas référés par les RC", type: 'number'},
        {key: 'supervision_ref2', label: "Cas référés au district", type: 'number'},
        {key: 'supervision_d1', label: "Décès < 5 ans", type: 'number'}
    ],
    autoreply: 'Merci, votre formulaire a été bien reçu.'
};

exports['PSCA'] = {
    fields: [
        {key: 'synthese_year', label: "Année", type: 'year'},
        {key: 'synthese_month', label: "Mois", type: 'month'},
        {key: 'synthese_district', label: "District de Santé", type: 'number'},
        {key: 'synthese_area', label: "Aire de Santé", type: 'string'},
        {key: 'synthese_village_as', label: "# de villages", type: 'number'},
        {key: 'synthese_name_as', label: "Nome du chef AS", type: 'number'},
        {
            key: 'synthese_v1',
            label: "Malades vus, toutes causes confondues",
            type: 'number'
        },
        {
            key: 'synthese_v2',
            label: "Palu vus",
            type: 'number'
        },
        {
            key: 'synthese_v3',
            label: "Diarrhée, malades vus",
            type: 'number'
        },
        {
            key: 'synthese_v5',
            label: "Autres causes vus",
            type: 'number'
        },
        {
            key: 'synthese_t1',
            label: "Paludisme, cas traités",
            type: 'number'
        },
        {
            key: 'synthese_t1a',
            label: "Paludisme, cas traités < 24h",
            type: 'number'
        },
        {
            key: 'synthese_t1b',
            label: "Paludisme, cas traités 24-48h",
            type: 'number'
        },
        {
            key: 'synthese_t2',
            label: "Diarrhées, cas traitées",
            type: 'number'
        },
        {
            key: 'synthese_r1',
            label: "Paludisme, cas référés au CSI",
            type: 'number'
        },
        {
            key: 'synthese_r2',
            label: "Diarrhées, cas référées au CSI",
            type: 'number'
        },
        {
            key: 'synthese_r4',
            label: "Autres causes, cas référées au CSI",
            type: 'number'
        },
        {
            key: 'synthese_r5',
            label: "Cas contre référés par le CSI",
            type: 'number'
        },
        {
            key: 'synthese_a1d',
            label: "ACT1 distribués",
            type: 'number'
        },
        {
            key: 'synthese_a1f',
            label: "ACT1 disponibles fin du mois",
            type: 'number'
        },
        {
            key: 'generic_stockout1',
            label: "Rupture de stock",
            type: 'choice',
            choices: {
                1: "Aucune rupture",
                2: "ACT1 rupture 3 jours ou plus"
            }
        },
        {
            key: 'synthese_a2d',
            label: "ACT2 distribués",
            type: 'number'
        },
        {
            key: 'synthese_a2f',
            label: "ACT2 disponibles fin du mois",
            type: 'number'
        },
        {
            key: 'generic_stockout2',
            label: "Rupture de stock",
            type: 'choice',
            choices: {
                1: "Aucune rupture",
                2: "ACT2 rupture 3 jours ou plus"
            }
        },
        {
            key: 'synthese_sd',
            label: "SRO/ZINC distribués",
            type: 'number'
        },
        {
            key: 'synthese_sf',
            label: "SRO/ZINC disponibles fin du mois",
            type: 'number'
        },
        {
            key: 'generic_stockout3',
            label: "Rupture de stock",
            type: 'choice',
            choices: {
                1: "Aucune rupture",
                2: "SRO/ZINC rupture 3 jours ou plus"
            }
        },
        {key: 'synthese_d1', label: "Décès < 5 ans", type: 'number'}
    ],
    autoreply: 'Merci, votre formulaire a été bien reçu.'
};

exports['PSCR'] = {
    fields: [
        {key: 'synthese_year', label: "Année", type: 'year'},
        {key: 'synthese_month', label: "Mois", type: 'month'},
        {key: 'synthese_district', label: "District de Santé", type: 'number'},
        {key: 'synthese_area', label: "Aire de Santé", type: 'string'},
        {key: 'synthese_village_rc', label: "Village/quartier", type: 'number'},
        {key: 'synthese_name_rc', label: "Nome du RC", type: 'number'},
        {
            key: 'synthese_v1',
            label: "Malades vus, toutes causes confondues",
            type: 'number'
        },
        {
            key: 'synthese_v2',
            label: "Palu vus",
            type: 'number'
        },
        {
            key: 'synthese_v3',
            label: "Diarrhée, malades vus",
            type: 'number'
        },
        {
            key: 'synthese_v5',
            label: "Autres causes vus",
            type: 'number'
        },
        {
            key: 'synthese_t1',
            label: "Paludisme, cas traités",
            type: 'number'
        },
        {
            key: 'synthese_t1a',
            label: "Paludisme, cas traités < 24h",
            type: 'number'
        },
        {
            key: 'synthese_t1b',
            label: "Paludisme, cas traités 24-48h",
            type: 'number'
        },
        {
            key: 'synthese_t2',
            label: "Diarrhées, cas traitées",
            type: 'number'
        },
        {
            key: 'synthese_r1',
            label: "Paludisme, cas référés au CSI",
            type: 'number'
        },
        {
            key: 'synthese_r2',
            label: "Diarrhées, cas référées au CSI",
            type: 'number'
        },
        {
            key: 'synthese_r4',
            label: "Autres causes, cas référées au CSI",
            type: 'number'
        },
        {
            key: 'synthese_r5',
            label: "Cas contre référés par le CSI",
            type: 'number'
        },
        {
            key: 'synthese_a1d',
            label: "ACT1 distribués",
            type: 'number'
        },
        {
            key: 'synthese_a1f',
            label: "ACT1 disponibles fin du mois",
            type: 'number'
        },
        {
            key: 'generic_stockout1',
            label: "Rupture de stock",
            type: 'choice',
            choices: {
                1: "Aucune rupture",
                2: "ACT1 rupture 3 jours ou plus"
            }
        },
        {
            key: 'synthese_a2d',
            label: "ACT2 distribués",
            type: 'number'
        },
        {
            key: 'synthese_a2f',
            label: "ACT2 disponibles fin du mois",
            type: 'number'
        },
        {
            key: 'generic_stockout2',
            label: "Rupture de stock",
            type: 'choice',
            choices: {
                1: "Aucune rupture",
                2: "ACT2 rupture 3 jours ou plus"
            }
        },
        {
            key: 'synthese_sd',
            label: "SRO/ZINC distribués",
            type: 'number'
        },
        {
            key: 'synthese_sf',
            label: "SRO/ZINC disponibles fin du mois",
            type: 'number'
        },
        {
            key: 'generic_stockout3',
            label: "Rupture de stock",
            type: 'choice',
            choices: {
                1: "Aucune rupture",
                2: "SRO/ZINC rupture 3 jours ou plus"
            }
        },
        {key: 'synthese_d1', label: "Décès < 5 ans", type: 'number'}
    ],
    autoreply: 'Merci, votre formulaire a été bien reçu.'
};

exports['MSBR'] = {
    title: 'Alerte référence',
    fields: [
        {key: 'ref_year', label: "Année", type: 'year'},
        {key: 'ref_month', label: "Mois", type: 'month'},
        {key: 'ref_day', label: "Jour", type: 'number'},

        {key: 'ref_rc', label: "Code du RC", type: 'number'},
        {key: 'ref_hour', label: "Heure de départ", type: 'number'},
        {key: 'ref_name', label: "Nom", type: 'string'},
        {key: 'ref_age', label: "Age", type: 'number'},
        {
            key: 'ref_reason',
            label: "Motif référenc",
            type: 'choice',
            choices: {
                1: "Femme enceinte très malade",
                2: "Accouchement difficile",
                3: "Accouchée très malade",
                4: "Nouveau-né malade",
                5: "Enfant avec SGD ou SG",
                6: "Enfant traité ne va pas mieux ",
                7: "Manque de médicament",
                8: "TB dans le rouge",
                9: "Palu grave",
                10: "Diarrhée grave",
                11: "Malnutrition Aigue modérée",
                12: "Autre"
            }
        },
        {
            key: 'ref_reason_other',
            label: "Si 'autre', précisez motif référenc",
            type: 'string'
        }
    ],
    autoreply: 'Merci, votre formulaire a été bien reçu.'
};

exports['MSBB'] = {
    title: 'Alerte référence',
    fields: [
        {key: 'ref_year', label: "Année", type: 'year'},
        {key: 'ref_month', label: "Mois", type: 'month'},
        {key: 'ref_day', label: "Jour", type: 'number'},

        {key: 'ref_rc', label: "Code du RC", type: 'number'},
        {key: 'ref_hour', label: "Heure de départ", type: 'number'},
        {key: 'ref_name', label: "Nom", type: 'string'},
        {key: 'ref_age', label: "Age", type: 'number'},
        {
            key: 'ref_reason',
            label: "Motif référenc",
            type: 'choice',
            choices: {
                1: "Palu grave",
                2: "Urg Chir",
                3: "Hémorragie Fm",
                4: "HTA grossesse",
                5: "Détresse resp",
                6: "Coma",
                7: "Anémie sevére",
                8: "Ut cicatriciel",
                9: "-Choléra",
                10: "-Fievre jaune",
                11: "-Méningite",
                12: "-Tétanos",
                13: "-PFA",
                14: "-Autres MPE",
                15: "Autres"
            }
        },
        {
            key: 'ref_reason_other',
            label: "Si 'autre', précisez motif référenc",
            type: 'string'
        }
    ],
    autoreply: 'Merci, votre formulaire a été bien reçu.'
};

exports['MSBC'] = {
    title: 'Contre-référence',
    fields: [
        { key: 'cref_year', label: "Année", type: 'year' },
        { key: 'cref_month', label: "Mois", type: 'month' },
        { key: 'cref_day', label: "Jour", type: 'number' },
        { key: 'cref_rc', label: "Code du RC", type: 'number' },
        {
            key: 'cref_ptype',
            label: "Type de patient",
            type: 'choice',
            choices: {
                1: "Femme enceinte",
                2: "Accouchée malade",
                3: "Enfant",
                4: "Nouveau né",
                5: "Autre"
            }
        },
        { key: 'cref_name', label: "Nom", type: 'string' },
        { key: 'cref_age', label: "Age", type: 'number' },
        { key: 'cref_mom', label: "Nom de la mère ou de l'accompagnant", type: 'string' },
        { key: 'cref_treated', label: "Patient traité pour", type: 'string' },
        {
            key: 'cref_rec',
            label: "Recommandations/Conseils",
            type: 'choice',
            choices: {
                1: "A revenir au centre de santé",
                2: "Suivi de soins à domicile",
                3: "Guéri",
                4: "Décédé",
                5: "Référé",
                6: "Conseils hygiéno-diététiques",
                7: "Autres"
            }
        },
        { key: 'cref_reason', label: "Précisions pour recommandations", type: 'string' },
        { key: 'cref_agent', label: "Nom de l'agent de santé", type: 'string' }
    ],
    autoreply: 'Merci, votre formulaire a été bien reçu.'
};

exports['MSBM'] = {
    title: 'Alerte besoin médicaments',
    fields: [
        { key: 'med_year', label: "Année", type: 'year' },
        { key: 'med_month', label: "Mois", type: 'month' },
        { key: 'med_day', label: "Jour", type: 'number' },
        { key: 'med_rc', label: "Code du RC", type: 'number' },
        { key: 'med_cta_a', label: "CTA actuel", type: 'number' },
        { key: 'med_cta_c', label: "CTA commendé", type: 'number' },
        { key: 'med_tdr_a', label: "TDR actuel", type: 'number' },
        { key: 'med_tdr_c', label: "TDR commandé", type: 'number' },
        { key: 'med_ctm_a', label: "CTM 480 actuel", type: 'number' },
        { key: 'med_ctm_c', label: "CTM 480 commandé", type: 'number' },
        { key: 'med_sro_a', label: "SRO/Zinc actuel", type: 'number' },
        { key: 'med_sro_c', label: "SRO/Zinc commandé", type: 'number' },
        { key: 'med_para_a', label: "PARA actuel", type: 'number' },
        { key: 'med_para_c', label: "PARA commandé", type: 'number' }
    ],
    autoreply: 'Merci, votre formulaire a été bien reçu.'
};

exports['MSBP'] = {
    title: 'Synthese des cas pris en charge',
    fields: [
        { key: 'case_year', label: "Année", type: 'year' },
        { key: 'case_month', label: "Mois", type: 'month' },
        { key: 'case_day', label: "Jour", type: 'number' },
        { key: 'case_rc', label: "Code du RC", type: 'number' },
        { key: 'case_pec_m', label: "M: 0-5 ans PEC", type: 'number' },
        { key: 'case_pec_f', label: "F: 0-5 ans PEC", type: 'number' },
        { key: 'case_urg_m', label: "M: 0-5 ans référé en urgence", type: 'number' },
        { key: 'case_urg_f', label: "F: 0-5 ans référé en urgence", type: 'number' },
        { key: 'case_tdr', label: "TDR de palu réalisé", type: 'number' },
        { key: 'case_palu_m', label: "M: Palu simple traité", type: 'number' },
        { key: 'case_palu_f', label: "F: Palu simple traité", type: 'number' },
        { key: 'case_dia_m', label: "M: Diarrhée simple traité", type: 'number' },
        { key: 'case_dia_f', label: "F: Diarrhée simple traité", type: 'number' },
        { key: 'case_pneu_m', label: "M: Pneumonie traité", type: 'number' },
        { key: 'case_pneu_f', label: "F: Pneumonie traité", type: 'number' },
        { key: 'case_mal_m', label: "M: Malnutrition dépisté", type: 'number' },
        { key: 'case_mal_f', label: "F: Malnutrition dépisté", type: 'number' },
        { key: 'case_rev', label: "0-5 ans revu pour suivi des soins", type: 'number' },
        { key: 'case_vad', label: "0-5 and vu au cours VAD", type: 'number' },
        { key: 'case_edu', label: "Séance éducative réalisée", type: 'number' }
    ],
    autoreply: 'Merci, votre formulaire a été bien reçu.'
};

exports['MSBG'] = {
    title: 'Rapport mensuel de gestion des médicaments',
    fields: [
        { key: 'monthly_year', label: "Année", type: 'year' },
        { key: 'monthly_month', label: "Mois", type: 'month' },
        { key: 'monthly_rc', label: "Code du RC", type: 'number' },
        { key: 'monthly_cta1', label: "CTA au début de mois", type: 'number' },
        { key: 'monthly_cta2', label: "CTA cédés dans le mois", type: 'number' },
        { key: 'monthly_cta3', label: "CTA restants à la fin du mois", type: 'number' },
        { key: 'monthly_sro1', label: "SRO/Zinc au début de mois", type: 'number' },
        { key: 'monthly_sro2', label: "SRO/Zinc cédés dans le mois", type: 'number' },
        { key: 'monthly_sro3', label: "SRO/Zinc restants à la fin du mois", type: 'number' },
        { key: 'monthly_ctm1', label: "CTM 480mg au début de mois", type: 'number' },
        { key: 'monthly_ctm2', label: "CTM 480mg cédés dans le mois", type: 'number' },
        { key: 'monthly_ctm3', label: "CTM 480mg restants à la fin du mois", type: 'number' }
    ],
    autoreply: 'Merci, votre formulaire a été bien reçu.'
};
