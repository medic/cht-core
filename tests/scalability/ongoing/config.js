module.exports = {
  contactsNbr: {
    district_hospital: 1,
    health_center: 10,  // 10 health centers
    clinic: 1,         
    person: 3,
    chw: 1,            // 1 CHW per health center = 10 total CHW users
    supervisor: 1,     // 1 Supervisor per district hospital = 1 total supervisor
  },
  workflowContactsNbr: {
    person: 5,
    iterations: 3,     // Increased from 1 to 3 for better stress testing
  },
};


