/**
 * Kanso document types to export
 */

var Type = require('couchtypes/types').Type,
    fields = require('couchtypes/fields'),
    widgets = require('couchtypes/widgets');

/*
 * Location Record Type
 */
exports.location = new Type('location', {
    fields: {
        name: fields.string(),
        lat: fields.number(),
        lon: fields.number()
        /*
        tags: fields.embedList({
            type: fields.string(),
            required: false
        })
        */
        /*
        tags: fields.embedList({
            type: exports.tag,
            sortable: false,
            required: false
        })
        */
        /*
        tags: fields.embedList({
            type: 'tag',
            sortable: false,
            widget: widgets.embedForm({
                type: exports.tag
            })
        })
        */
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
        })/*,
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
    */}/*,
    
    permissions: {
        add: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center'])),
        update: lpermissions.hasRolesAndParentFacilityOrIsCreator(adminRoles(['national_office', 'district_hospital', 'health_center'])),
        remove: lpermissions.hasRolesAndParentFacility(adminRoles(['national_office', 'district_hospital', 'health_center']))
    }*/
});

