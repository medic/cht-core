// Example scaling configurations for CHT scalability testing
// 
// HOW TO USE:
// 1. Copy one of these configurations
// 2. Paste it into config.js 
// 3. Run: ./run.sh local
// 4. Analyze results: ./analyze-performance.js
//

const EXAMPLE_CONFIGS = {
  baseline: {
    contactsNbr: {
      district_hospital: 1,
      health_center: 10,
      clinic: 1,
      person: 3,
      chw: 1,
      supervisor: 1,
    },
    workflowContactsNbr: {
      person: 5,
      iterations: 3,
    },
    description: "Current baseline: 10 users, 5 persons per iteration, 3 iterations"
  },

  small: {
    contactsNbr: {
      district_hospital: 1,
      health_center: 20,
      clinic: 1,
      person: 3,
      chw: 1,
      supervisor: 1,
    },
    workflowContactsNbr: {
      person: 5,
      iterations: 3,
    },
    description: "Small scale: 20 users, 5 persons per iteration, 3 iterations"
  },

  medium: {
    contactsNbr: {
      district_hospital: 1,
      health_center: 50,
      clinic: 1,
      person: 3,
      chw: 1,
      supervisor: 1,
    },
    workflowContactsNbr: {
      person: 5,
      iterations: 3,
    },
    description: "Medium scale: 50 users, 5 persons per iteration, 3 iterations"
  },

  large: {
    contactsNbr: {
      district_hospital: 1,
      health_center: 100,
      clinic: 1,
      person: 3,
      chw: 1,
      supervisor: 1,
    },
    workflowContactsNbr: {
      person: 5,
      iterations: 3,
    },
    description: "Large scale: 100 users, 5 persons per iteration, 3 iterations"
  },

  data_heavy: {
    contactsNbr: {
      district_hospital: 1,
      health_center: 10,
      clinic: 1,
      person: 3,
      chw: 1,
      supervisor: 1,
    },
    workflowContactsNbr: {
      person: 20, 
      iterations: 5,
    },
    description: "Data heavy: 10 users, 20 persons per iteration, 5 iterations"
  },

  stress: {
    contactsNbr: {
      district_hospital: 1,
      health_center: 200,
      clinic: 1,
      person: 3,
      chw: 1,
      supervisor: 1,
    },
    workflowContactsNbr: {
      person: 10,
      iterations: 5,
    },
    description: "Stress test: 200 users, 10 persons per iteration, 5 iterations"
  }
};

