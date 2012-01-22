/**
 * Document types to export
 */

var Type = require('couchtypes/types').Type,
    fields = require('couchtypes/fields'),
    widgets = require('couchtypes/widgets'),
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
        /*
        tags: fields.embedList({
            type: fields.string(),
            required: false
        })
        */
        tags: fields.embedList({
            type: exports.tag,
            sortable: false,
            required: false
        })
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
 * National Office Record Type
 */
exports.national_office  = new Type('national_office', {
    fields: {
        name : fields.string(),
        contact: {
            name: fields.string(),
            phone: fields.string({hint: '+15551212'})
        },
        description: fields.string(),
        location: fields.embed({
            required: false,
            type: exports.location
        })
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
            phone: fields.string({hint: '+15551212'})
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
            })
        })
    },

});

/*
 * Health Center Record Type
 */
exports.health_center = new Type('health_center', {
    fields: {
        name : fields.string(),
        contact: {
            name: fields.string(),
            phone: fields.string({hint: '+15551212'})
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
            })
        })
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
            phone: fields.string({hint: '+15551212'})
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
            })
        })
    }
});
