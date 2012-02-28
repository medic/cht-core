/**
 * Document types to export
 */

var Type = require('couchtypes/types').Type,
    fields = require('couchtypes/fields'),
    widgets = require('couchtypes/widgets'),
    permissions = require('couchtypes/permissions'),
    lpermissions = require('./permissions'),
    validators = require('couchtypes/validators'),
    utils = require('couchtypes/utils'),
    lutils = require('./utils'),
    _ = require('underscore')._;


/*
 * Tag Record Type
 */
exports.tag = new Type('tag', {
    fields: {
        label: fields.string({ required: false })
    }
});

/*
 * Location Record Type
 */
exports.location = new Type('location', {
    fields: {
        name: fields.string(),
        lat: fields.number(),
        lon: fields.number(),
        tags: fields.embedList({
            type: exports.tag,
            sortable: false,
            required: false
        })
    }
});


var adminRoles = function(roles) {
    roles = _.map((roles || []), function(role) {
       return 'kujua.admin_' + role; 
    });
    roles.push('_admin');
    return roles;
};

/*
 * National Office Record Type
 */
exports.national_office  = new Type('national_office', {
    fields: {
        name : fields.string(),
        contact: {
            name: fields.string(),
            phone: fields.string()
        },
        description: fields.string(),
        location: fields.embed({
            required: false,
            type: exports.location
        })
    },
    
    permissions: {
        add: permissions.hasRole('_admin'),
        update: permissions.hasRole('_admin'),
        remove: permissions.hasRole('_admin')
    }
});

/*
 * District Hospital Record Type
 */
exports.district_hospital = new Type('district_hospital', {
    allow_extra_fields: true,
    fields: {
        name : fields.string(),
        contact: {
            name: fields.string(),
            phone: fields.string()
        },
        location: fields.embed({
            required: true,
            type: exports.location
        }),
        parent: fields.embed({
            required: true,
            type: exports.national_office,
            widget: widgets.embedList({
                singleton: true,
                widget: widgets.documentSelector({
                    viewName: 'national_offices'
                }),
                actions: {
                    add: false
                }
            }),
            permissions: {
                add: permissions.hasAnyOfTheRoles(adminRoles(['national_office', 'district_hospital', 'health_center'])),
                update: permissions.hasAnyOfTheRoles(adminRoles(['national_office', 'district_hospital', 'health_center'])),
                remove: permissions.hasAnyOfTheRoles(adminRoles(['national_office', 'district_hospital', 'health_center']))
            }
        })
    },

    permissions: {
        add: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office'])),
        update: lpermissions.hasRolesAndParentFacilityOrIsCreator(adminRoles(['national_office'])),
        remove: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office']))
    }
});

/*
 * Health Center Record Type
 */
exports.health_center = new Type('health_center', {
    fields: {
        name : fields.string(),
        contact: {
            name: fields.string(),
            phone: fields.string()
        },
        location: fields.embed({
            required: true,
            type: exports.location
        }),
        parent: fields.embed({
            required: true,
            type: exports.district_hospital,
            widget: widgets.embedList({
                singleton: true,
                widget: widgets.documentSelector({
                    viewName: 'district_hospitals',
                    optionDesc: function(row) {
                        return row.value.name + ' - ' + row.value.parent; }
                }),
                actions: {
                    add: false
                }
            }),
            permissions: {
                add: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center'])),
                update: lpermissions.hasRolesAndParentFacilityOrIsCreator(adminRoles(['national_office', 'district_hospital', 'health_center'])),
                remove: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center']))
            }
        })
    },
    
    permissions: {
        add: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital'])),
        update: lpermissions.hasRolesAndParentFacilityOrIsCreator(adminRoles(['national_office', 'district_hospital'])),
        remove: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital']))
    }
});

/*
 * Clinic Record Type
 */
exports.clinic = new Type('clinic', {
    fields: {
        name : fields.string(),
        contact: {
            name: fields.string(),
            phone: fields.string()
        },
        location: fields.embed({
            required: true,
            type: exports.location
        }),
        parent: fields.embed({
            required: true,
            type: exports.health_center,
            widget: widgets.embedList({
                singleton: true,
                widget: widgets.documentSelector({
                    viewName: 'health_centers',
                    optionDesc: function(row) {
                        return row.value.name + ' - ' + row.value.parent; }
                }),
                actions: {
                    add: false
                }
            }),
            permissions: {
                add: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center'])),
                update: lpermissions.hasRolesAndParentFacilityOrIsCreator(adminRoles(['national_office', 'district_hospital', 'health_center'])),
                remove: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center']))
            }
        })
    },
    
    permissions: {
        add: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center'])),
        update: lpermissions.hasRolesAndParentFacilityOrIsCreator(adminRoles(['national_office', 'district_hospital', 'health_center'])),
        remove: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center']))
    }
});

/*
 * User Type
 */
exports.user = new Type('user', {
    fields: {
        name: fields.string(),
        password: fields.password({
            required: function(doc, value, raw) {
                return !doc._rev;
            }
        }),
        roles: fields.array({
            required: true,
            hint: ' ',
            widget: widgets.select({
                values: [
                    ['_admin', 'Global Admin'],
                    ['kujua.admin_national_office', 'Admin National Office'],
                    ['kujua.editor_national_office', 'Data Entry National Office'],
                    ['kujua.admin_district_hospital', 'Admin District Hospital'],
                    ['kujua.editor_district_hospital', 'Data Entry District Hospital'],
                    ['kujua.admin_health_center', 'Admin Health Center'],
                    ['kujua.editor_health_center', 'Data Entry Health Center'],
                    ['kujua.admin_clinic', 'Admin Clinic'],
                    ['kujua.editor_clinic', 'Data Entry Clinic']
                ]
            })
        }),
        'kujua.national_office': fields.embed({
            required: false,
            type: exports.national_office,
            label: 'National Office',
            widget: widgets.embedList({
                singleton: true,
                widget: widgets.documentSelector({
                    viewName: 'national_offices'
                }),
                actions: {
                    add: false
                }
            })
        }),
        'kujua.district_hospital': fields.embed({
            required: false,
            type: exports.district_hospital,
            label: 'District Hospital',
            widget: widgets.embedList({
                singleton: true,
                widget: widgets.documentSelector({
                    viewName: 'district_hospitals',
                    optionDesc: function(row) {
                        return row.value.name + ' - ' + row.value.parent; }
                }),
                actions: {
                    add: false
                }
            })
        }),
        'kujua.health_center': fields.embed({
            required: false,
            type: exports.health_center,
            label: 'Health Center',
            widget: widgets.embedList({
                singleton: true,
                widget: widgets.documentSelector({
                    viewName: 'health_centers',
                    optionDesc: function(row) {
                        return row.value.name + ' - ' + row.value.parent; }
                }),
                actions: {
                    add: false
                }
            })
        }),
        'kujua.clinic': fields.embed({
            required: false,
            type: exports.clinic,
            label: 'Clinic',
            widget: widgets.embedList({
                singleton: true,
                widget: widgets.documentSelector({
                    viewName: 'clinics',
                    optionDesc: function(row) {
                        return row.value.name + ' - ' + row.value.parent; }
                }),
                actions: {
                    add: false
                }
            })
        })
    },
    
    permissions: {
        add:    permissions.hasRole('_admin'),
        update: permissions.all([permissions.hasRole('_admin'), lpermissions.adminAndPasswordNotSet()]),
        remove: permissions.hasRole('_admin')
    }
});

var conditions = {
    fever: fields.number({
        label:'Malaria/Fever', 
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3}),
        required: false
    }),
    diarrhea: fields.number({
        label:'Diarrhea', 
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3}),
        required: false
    }),
    fast_breath: fields.number({
        label:'Pneumonia/Fast breathing', 
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3}),
        required: false
    }),
    red_eye: fields.number({
        label:'Red eye', 
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3}),
        required: false
    }),
    malnutrition: fields.number({
        label:'Malnutrition', 
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3}),
        required: false
    }),
    anaemia: fields.number({
        label:'Anaemia/Pallor', 
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3}),
        required: false
    }),
    other: fields.number({
        label:'Other Conditions', 
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3}),
        required: false
    })
};

var supplies = {
    la_6x1: fields.number({
        label:'LA 6x1',
        required: false,
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3})
    }),
    la_6x2: fields.number({
        label:'LA 6x2',
        required: false,
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3})
    }),
    ors: fields.number({
        label:'ORS',
        required: false,
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3})
    }),
    cotrimoxazole: fields.number({
        required: false,
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3})
    }),
    zinc: fields.number({
        required: false,
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3})
    }),
    eye_ointment: fields.number({
        required: false,
        validators: [validators.max(999)],
        widget: widgets.text({maxlength: 3})
    })
};



/*
 * Data Record Types
 * 
 * The default, which can be set at the end of the declaration is
 * psi_malawi for now.
 *
 */

var data_record_permissions = {
    add: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center', 'clinic'])),
    update: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center', 'clinic'])),
    remove: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center', 'clinic']))
};

var related_entities = {
    clinic: fields.embed({
        required: true,
        type: exports.clinic,
        widget: widgets.embedList({
            singleton: true,
            widget: widgets.documentSelector({
                viewName: 'clinics', 
                optionDesc: function(row) {
                    return row.value.name + ' - ' + row.value.parent; }
            }),
            actions: {
                add: false
            }
        }),
        permissions: {
            add: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center', 'clinic'])),
            update: lpermissions.hasRolesAndParentFacilityOrIsCreator(adminRoles(['national_office', 'district_hospital', 'health_center', 'clinic'])),
            remove: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center', 'clinic']))
        }
    })    
};

var data_record_common_fields = {
    year: fields.number({
        default_value: function (req) {
            return new Date().getFullYear();
        }
    }),
    data_record_type: fields.string({
        widget: widgets.hidden()
    }),
    related_entities : related_entities,
    is_deleted: fields.boolean({widget: widgets.hidden()}),
    is_valid: fields.boolean({widget: widgets.hidden()}),
    reporting_phone: fields.string({required: false}),
    reported_by: {
        name: fields.string({required: false}),
        user_id: fields.string({required: false}),
        title: fields.string({required: false}),
        place_of_residence: fields.string({required: false})
    },
    reported_date: fields.number()
};

var psi_malawi = {
    fields: _.extend({
                villages_serviced: fields.string(),
                supervisor_visits: fields.number({
                    required: false,
                    validators: [validators.max(999)],
                    widget: widgets.text({maxlength: 3})
                }),
                mentorship_visits: fields.number({
                    required: false,
                    validators: [validators.max(999)],
                    widget: widgets.text({maxlength: 3})
                }),
                cases: {
                    fever_lt_1d: fields.number({
                        label:'Fever cases < 1 day',
                        required: false,
                        validators: [validators.max(999)],
                        widget: widgets.text({maxlength: 3})
                    }),
                    fever_lt_2d: fields.number({
                        label:'Fever cases < 2 days',
                        required: false,
                        validators: [validators.max(999)],
                        widget: widgets.text({maxlength: 3})
                    }),
                    fever_gt_3d: fields.number({
                        label:'Fever cases > 3 days',
                        required: false,
                        validators: [validators.max(999)],
                        widget: widgets.text({maxlength: 3})
                    }),
                    diarrhea_lt_1d: fields.number({
                        label:'Diarrhea cases < 1 day',
                        required: false,
                        validators: [validators.max(999)],
                        widget: widgets.text({maxlength: 3})
                    }),
                    diarrhea_lt_2d: fields.number({
                        label:'Diarrhea cases < 2 days',
                        required: false,
                        validators: [validators.max(999)],
                        widget: widgets.text({maxlength: 3})
                    }),
                    diarrhea_gt_3d: fields.number({
                        label:'Diarrhea cases > 3 days',
                        required: false,
                        validators: [validators.max(999)],
                        widget: widgets.text({maxlength: 3})
                    }),
                    fast_breath_lt_1d: fields.number({
                        label:'Fast breath cases < 1 day',
                        required: false,
                        validators: [validators.max(999)],
                        widget: widgets.text({maxlength: 3})
                    }),
                    fast_breath_lt_2d: fields.number({
                        label:'Fast breath cases < 2 days',
                        required: false,
                        validators: [validators.max(999)],
                        widget: widgets.text({maxlength: 3})
                    }),
                    fast_breath_gt_3d: fields.number({
                        label:'Fast breath cases > 3 days',
                        required: false,
                        validators: [validators.max(999)],
                        widget: widgets.text({maxlength: 3})
                    })
                },
                /* PSMM/PSMS form definition is in flux, commenting out for
                 * the moment for sake of simplicity.
                new_cases_2_to_11_months: conditions,
                new_cases_12_to_59_months: conditions,
                referrals_2_to_11_months: conditions,
                referrals_12_to_59_months: conditions,
                deaths_2_to_11_months: conditions,
                deaths_12_to_59_months: conditions,
                */
                referrals_2_to_11_months: fields.number({
                    required: false,
                    validators: [validators.max(999)],
                    widget: widgets.text({maxlength: 3})
                }),
                referrals_12_to_59_months: fields.number({
                    required: false,
                    validators: [validators.max(999)],
                    widget: widgets.text({maxlength: 3})
                }),
                deaths_2_to_11_months: fields.number({
                    required: false,
                    validators: [validators.max(999)],
                    widget: widgets.text({maxlength: 3})
                }),
                deaths_12_to_59_months: fields.number({
                    required: false,
                    validators: [validators.max(999)],
                    widget: widgets.text({maxlength: 3})
                }),
                opening_balance: supplies,
                days_stocked_out: supplies,
                quantity_dispensed: supplies,
                losses: supplies,
                adjustment_plus: supplies,
                adjustment_minus: supplies,
                ending_balance: supplies,
                quantity_received: supplies,
                new_SOH: supplies,
                audit: {
                    // add prev revisions field ?
                    created_time: fields.createdTime(),
                    updated_time: fields.number({required: false}), // add modified field?
                    reported_by: fields.string({required: false}),
                    created_by: fields.string({required: false}), // creator field?
                    updated_by: fields.string({required: false}) // add updator field?
                },
                month: fields.number({
                    widget: widgets.select({
                        values: lutils.months()
                    })
                })
            }, data_record_common_fields),
    permissions: data_record_permissions
};

exports.data_records = {
    psi_malawi: new Type('data_record_psi_malawi', psi_malawi),
    psi_cameroon: new Type('data_record_psi_cameroon', {
        fields: _.extend({
                    supervision: {
                        supervision_year: fields.number({
                            label: 'Année',
                            required: true,
                            widget: widgets.text({maxlength: 4, minlength: 4})
                        }),
                        supervision_trimester: fields.number({
                            label: 'Trimestre',
                            required: true,
                            widget: widgets.select({
                                values: [
                                    [1, "Janvier - Mars"],
                                    [2, "Avril - Juin"],
                                    [3, "Juillet - Septembre"],
                                    [4, "Octobre - Décembre"]
                                ]
                            })
                        }),
                        supervision_district: fields.string({
                            label: "District de Santé",
                            required: true,
                            widget: widgets.select({
                                values: [
                                    ["Abong Mbang", "Abong Mbang"],
                                    ["Awaé", "Awaé"],
                                    ["Bafang", "Bafang"],
                                    ["Bafia", "Bafia"],
                                    ["Bangangté", "Bangangté"],
                                    ["Batouri", "Batouri"],
                                    ["Doumé", "Doumé"],
                                    ["Ebebda", "Ebebda"],
                                    ["Esse", "Esse"],
                                    ["Mbalmayo", "Mbalmayo"],
                                    ["Mbankomo", "Mbankomo"],
                                    ["Mfou", "Mfou"],
                                    ["Monatélé", "Monatélé"],
                                    ["Ndikinimeki", "Ndikinimeki"],
                                    ["Ngogmapoubi", "Ngogmapoubi"],
                                    ["Ngoumou", "Ngoumou"],
                                    ["Nguelemendouka", "Nguelemendouka"],
                                    ["Okola", "Okola"],
                                    ["Pouma", "Pouma"],
                                    ["Sa'a", "Sa'a"]
                                ]
                            })
                        }),
                        supervision_area: fields.string({
                            label: "Aire de Santé"
                        }),
                        supervision_a1r: fields.number({
                            label: "Nombre des ACT 1 reçus au cours du trimestre"
                        }),
                        supervision_a2r: fields.number({
                            label: "Nombre des ACT 2 reçus au cours du trimestre"
                        }),
                        supervision_a3r: fields.number({
                            label: "Nombre des SRO/Zinc reçus au cours du trimestre"
                        }),
                        supervision_a1dist: fields.number({
                            label: "Nombre des ACT 1 distribués au cours trimestre"
                        }),
                        supervision_a2dist: fields.number({
                            label: "Nombre des ACT 2 distribués au cours trimestre"
                        }),
                        supervision_a3dist: fields.number({
                            label: "Nombre des SRO/ZINC distribués au cours trimestre"
                        }),
                        supervision_a1disp: fields.number({
                            label: "Nombre des ACT 1 disponible à la fin du trimestre"
                        }),
                        supervision_a2disp: fields.number({
                            label: "Nombre des ACT 2 disponible à la fin du trimestre"
                        }),
                        supervision_a3disp: fields.number({
                            label: "Nombre des SRO/ZINC disponible à la fin du trimestre"
                        }),
                        supervision_r1: fields.number({
                            label: "Nombre des relais formés"
                        }),
                        supervision_r2: fields.number({
                            label: "Nombre des relais fonctionnels"
                        }),
                        supervision_r3: fields.number({
                            label: "Nombre de relais supervisés au cours du trimestre"
                        }),
                        supervision_r4: fields.number({
                            label: "Nombre de relais supervisés utilisant correctement l'algorithme"
                        }),
                        supervision_r5: fields.number({
                            label: "Nombre de relais supervisés capable de citer au moins 5 signes de danger"
                        }),
                        supervision_r6: fields.number({
                            label: "Nombre de relais communautaire supervisés ayant connu une rupture de stock en ACT de plus de 7 jours"
                        }),
                        supervision_r7: fields.number({
                            label: "Nombre de relais communautaire supervisés ayant connu une rupture de stock en kits SRO + zinc de plus de 7 jours"
                        }),
                        supervision_p1: fields.number({
                            label: "Nombre de personnes interrogées"
                        }),
                        supervision_p2: fields.number({
                            label: "Nombre de personnes interrogées qui rapportent les services rendus par le RC au sein de la communauté"
                        }),
                        supervision_p3: fields.number({
                            label: "Nombre de personnes interrogées qui affirment avoir administré un traitement à leur enfant chaque fois qu'il est malade"
                        }),
                        supervision_p4: fields.number({
                            label: "Nombre de personnes interrogées qui déclarent avoir rencontré le RC lorsqu'ils étaient dans le besoin"
                        }),
                        supervision_v1: fields.number({
                            label: "Nombre de malades vus par les RC pour toutes causes confondues"
                        }),
                        supervision_v2: fields.number({
                            label: "Nombre de malades vus par les RC pour paludisme"
                        }),
                        supervision_v3: fields.number({
                            label: "Nombre de malades vus par les RC pour diarrhée"
                        }),
                        supervision_t1: fields.number({
                            label: "Paludisme traités"
                        }),
                        supervision_t2: fields.number({
                            label: "Diarrhée traitées"
                        }),
                        supervision_ref1: fields.number({
                            label: "Cas référés par les RC"
                        }),
                        supervision_ref2: fields.number({
                            label: "Cas référés au district"
                        }),
                        supervision_d1: fields.number({
                            label: "Décès < 5 ans"
                        })
                    },
                    
                    synthese: {
                        synthese_year: fields.number({
                            label: "Année",
                            required: true,
                            widget: widgets.text({maxlength: 4, minlength: 4})
                        }),
                        synthese_month: fields.number({
                            label: "Mois",
                            widget: widgets.select({
                                values: lutils.months()
                            })
                        }),
                        synthese_district: fields.string({
                            label: "District de Santé",
                            required: true,
                            widget: widgets.select({
                                values: [
                                    ["Abong Mbang", "Abong Mbang"],
                                    ["Awaé", "Awaé"],
                                    ["Bafang", "Bafang"],
                                    ["Bafia", "Bafia"],
                                    ["Bangangté", "Bangangté"],
                                    ["Batouri", "Batouri"],
                                    ["Doumé", "Doumé"],
                                    ["Ebebda", "Ebebda"],
                                    ["Esse", "Esse"],
                                    ["Mbalmayo", "Mbalmayo"],
                                    ["Mbankomo", "Mbankomo"],
                                    ["Mfou", "Mfou"],
                                    ["Monatélé", "Monatélé"],
                                    ["Ndikinimeki", "Ndikinimeki"],
                                    ["Ngogmapoubi", "Ngogmapoubi"],
                                    ["Ngoumou", "Ngoumou"],
                                    ["Nguelemendouka", "Nguelemendouka"],
                                    ["Okola", "Okola"],
                                    ["Pouma", "Pouma"],
                                    ["Sa'a", "Sa'a"]
                                ]
                            })
                        }),
                        synthese_area: fields.string({
                            label: "Aire de Santé"
                        }),
                        synthese_village: fields.string({
                            label: "Village/quartier"
                        }),
                        synthese_chw: fields.string({
                            label: "Nom du RC"
                        }),
                        synthese_resident: fields.boolean({
                            label: "Habite dans le village déservi"
                        }),
                        synthese_v1: fields.number({
                            label: "Toutes causes confondues, malades vus"
                        }),
                        synthese_v2: fields.number({
                            label: "Paludisme vus"
                        }),
                        synthese_v3: fields.number({
                            label: "Diarrhée, malades vus"
                        }),
                        synthese_v4: fields.number({
                            label: "Pneumonie vus"
                        }),
                        synthese_v5: fields.number({
                            label: "Autres causes vus"
                        }),
                        synthese_t1: fields.number({
                            label: "Paludisme, cas traités"
                        }),
                        synthese_t2: fields.number({
                            label: "Diarrhées, cas traitées"
                        }),
                        synthese_t3: fields.number({
                            label: "Pneumonie,cas traités"
                        }),
                        synthese_r1: fields.number({
                            label: "Paludisme, cas référés au CSI"
                        }),
                        synthese_r2: fields.number({
                            label: "Diarrhées, cas référées au CSI"
                        }),
                        synthese_r3: fields.number({
                            label: "Pneumonies, cas référées au CSI"
                        }),
                        synthese_r4: fields.number({
                            label: "Autres causes, cas référées au CSI"
                        }),
                        synthese_r5: fields.number({
                            label: "Cas contre référés par le CSI"
                        }),
                        synthese_a1: fields.number({
                            label: "ACT au début du mois"
                        }),
                        synthese_a2: fields.number({
                            label: "ACT à la fin du mois"
                        }),
                        synthese_s1: fields.number({
                            label: "SRO/ZINC au début du mois"
                        }),
                        synthese_s2: fields.number({
                            label: "SRO/ZINC à la fin du mois"
                        }),
                        synthese_b1: fields.number({
                            label: "Antibiotiques au début du mois"
                        }),
                        synthese_b2: fields.number({
                            label: "Antibiotiques à la fin du mois"
                        }),
                        synthese_d1: fields.number({
                            label: "Décès < 5 ans"
                        })
                    },
                    month: fields.number({
                        widget: widgets.select({
                            values: lutils.months()
                        })
                    })
                }, data_record_common_fields),
        permissions: data_record_permissions
    }),
    cdc_nepal: new Type('data_record_cdc_nepal', {
        fields: _.extend({
                    wkn: fields.number({
                        label: "Week number"
                    }),
                    wks: fields.number({
                        label: "Number of weeks"
                    }),
                    afp: fields.number({
                        label: "Acute Flaccid Paralysis"
                    }),
                    nnt: fields.number({
                        label: "Neonatal Tetanus"
                    }),
                    msl: fields.number({
                        label: "Measles"
                    }),
                    aes: fields.number({
                        label: "Acute Encephalitis Syndrome"
                    })
                }, data_record_common_fields), 
        permissions: data_record_permissions
    })
};

exports.data_record = new Type('data_record', psi_malawi);
exports.data_record_types = _.map(exports.data_records, function(type) {
    return type.name;
});
exports.data_record_types.push('data_record');




/*
 * Outbreak Reports
 *
 * For now the outbreak reports are associated with the data record,
 * meaning that if cdc nepal is chosen as data record type, it will
 * also be used as outbreak report type.
 *
 */

var outbreak_report_common_fields = {
    year: fields.number({
        default_value: function (req) {
            return new Date().getFullYear();
        }
    }),
    data_record_type: fields.string({
        widget: widgets.hidden()
    }),
    is_deleted: fields.boolean({widget: widgets.hidden()}),
    is_valid: fields.boolean({widget: widgets.hidden()}),
    reporting_phone: fields.string({required: false}),
    reported_by: {
        name: fields.string({required: false}),
        user_id: fields.string({required: false}),
        title: fields.string({required: false}),
        place_of_residence: fields.string({required: false})
    },
    reported_date: fields.number()
};

exports.outbreak_reports = {
    cdc_nepal: new Type('outbreak_report_cdc_nepal', {
        fields: _.extend({
                    vdc: fields.embed({
                        required: true,
                        label: "Village development committee",
                        type: exports.district_hospital,
                        widget: widgets.embedList({
                            singleton: true,
                            widget: widgets.documentSelector({
                                viewName: 'district_hospitals',
                                optionDesc: function(row) {
                                    return row.value.name + ' - ' + row.value.parent; }
                            }),
                            actions: {
                                add: false
                            }
                        })
                    }),
                    wrd: fields.number({
                        label: "Ward number"
                    }),
                    afp: fields.number({
                        label: "Acute Flaccid Paralysis"
                    }),
                    msl: fields.number({
                        label: "Measles"
                    })
                }, outbreak_report_common_fields),
        permissions: data_record_permissions
    })
};

exports.outbreak_report = exports.outbreak_reports.cdc_nepal;
exports.outbreak_report_types = _.map(exports.outbreak_reports, function(type) {
    return type.name;
});
exports.outbreak_report_types.push('outbreak_report');


/*
 * Replication Target Type
 * 
 * @attr _id 
 *    Unique identifier for a medic dashboard replication_target.
 *    Prepended with type string.
 *    e.g. node_lilongwe4
 *
 * @attr name
 *    The title or name of a node, uniqueness may or may not be enforced.  
 *    e.g.  Lilongwe Node 4
 *
 * @attr type
 *    This should always be 'node' and part of the validation.
 *
 * @attr facility_id
 *    Reference to facility type 
 *    e.g. lilongwe 
 * 
 * @attr auth_key
 *    Random alphanumeric provided by head office administration for
 *    installation of a node.
 *    e.g. 3ff29zx99
 *
 * @attr related_entities
 *    Default null on initial creation (2nd step to add node to facility) might
 *    include facility_id: 'uuid', Reference to facility lilongwe(?)
 *
 *
*/
exports.replication_target = new Type('replication_target', {

    allow_extra_fields: true,

    permissions: {
        add:    permissions.hasRole('_admin'),
        update: permissions.hasRole('_admin'),
        remove: permissions.hasRole('_admin')
    },

    fields: {
        name: fields.string(),
        host_name: fields.string(),
        port_number: fields.number({ required: false }),
        database_name: fields.string(),
        authorization_key: fields.string(),
        is_active: fields.boolean({ required: false })
    }
});


/*
 * Setup
 */
 
var data_record_types = _.keys(exports.data_records).map(function(type) {
    return [type, utils.titleize(type)];
});

exports.setup = new Type('setup', {
    fields: {
        facility_id: fields.string({
            required: true,
            label: 'Associated facility',
            widget: widgets.select({
                values: []
            })
        }),
        data_record_type: fields.string({
            required: true,
            widget: widgets.select({
                values: data_record_types
            })
        })
   },
   
   permissions: {
       add:    permissions.hasRole('_admin'),
       update: permissions.hasRole('_admin'),
       remove: permissions.hasRole('_admin')
   }
});
