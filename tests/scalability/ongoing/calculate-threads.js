#!/usr/bin/env node

const config = require('./config');

const calculateTotalUsers = () => {
  const { contactsNbr } = config;
  
  const chws = contactsNbr.health_center * contactsNbr.chw;
  const supervisors = contactsNbr.district_hospital * contactsNbr.supervisor;
  const totalUsers = chws + supervisors;
  
  return totalUsers;
};

const calculateOptimalThreads = () => {
  const totalUsers = calculateTotalUsers();
  
  const optimalThreads = totalUsers % 2 === 0 ? totalUsers : totalUsers + 1;
  
  return {
    totalUsers,
    optimalThreads,
    initialSyncThreads: optimalThreads / 2
  };
};

if (require.main === module) {
  const result = calculateOptimalThreads();
  console.log(result.optimalThreads);
}

module.exports = { calculateTotalUsers, calculateOptimalThreads };
