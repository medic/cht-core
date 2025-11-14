module.exports = {
  contactsNbr: {
    district_hospital: 1,
    health_center: 19,  
    clinic: 1,         // 1 clinic per health center = 19 total clinics
    person: 3,         // 3 persons per clinic = 57 total persons (each gets ~2 reports)
    chw: 1,            // 1 CHW per health center = 19 total CHW users
    supervisor: 1,     // 1 Supervisor per district hospital = 1 total supervisor users
  },
  workflowContactsNbr: {
    person: 5,      // 5 persons per iteration = 15 total persons (each gets ~2 reports)
    iterations: 3,  // 3 iterations (each user goes through the generate→upload→download cycle 3 times)
  },
};


