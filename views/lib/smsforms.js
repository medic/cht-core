exports['TEST'] = [
    {key: 'foo', label: 'Foo', type: 'string'},
    {key: 'bar', label: 'Bar', type: 'number'}
];

exports['PSMS'] = [
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
];

exports['PSCQ'] = [
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
];

exports['PSCM'] = [
    {key: 'synthese_year', label: "Année", type: 'year'},
    {key: 'synthese_month', label: "Mois", type: 'month'},
    {key: 'synthese_district', label: "District de Santé", type: 'number'},
    {key: 'synthese_area', label: "Aire de Santé", type: 'string'},
    {key: 'synthese_village', label: "Village/quartier", type: 'string'},
    {key: 'synthese_chw', label: "Nom du RC", type: 'string'},
    {
        key: 'synthese_resident',
        label: "Habite dans le village déservi",
        type: 'number'
    },
    {
        key: 'synthese_v1',
        label: "Toutes causes confondues, malades vus",
        type: 'number'
    },
    {
        key: 'synthese_v2',
        label: "Paludisme vus",
        type: 'number'
    },
    {
        key: 'synthese_v3',
        label: "Diarrhée, malades vus",
        type: 'number'
    },
    {
        key: 'synthese_v4',
        label: "Pneumonie vus",
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
        key: 'synthese_t2',
        label: "Diarrhées, cas traitées",
        type: 'number'
    },
    {
        key: 'synthese_t3',
        label: "Pneumonie,cas traités",
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
        key: 'synthese_r3',
        label: "Pneumonies, cas référées au CSI",
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
        key: 'synthese_a1',
        label: "ACT au début du mois",
        type: 'number'
    },
    {
        key: 'synthese_a2',
        label: "ACT à la fin du mois",
        type: 'number'
    },
    {
        key: 'synthese_s1',
        label: "SRO/ZINC au début du mois",
        type: 'number'
    },
    {
        key: 'synthese_s2',
        label: "SRO/ZINC à la fin du mois",
        type: 'number'
    },
    {
        key: 'synthese_b1',
        label: "Antibiotiques au début du mois",
        type: 'number'
    },
    {
        key: 'synthese_b2',
        label: "Antibiotiques à la fin du mois",
        type: 'number'
    },
    {
        key: 'synthese_d1',
        label: "Décès < 5 ans",
        type: 'number'
    }
];
