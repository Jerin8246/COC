const ChainOfCustody = artifacts.require("ChainOfCustody");

module.exports = async function(deployer, network, accounts) {
  // Deploy the contract
  await deployer.deploy(ChainOfCustody);
  const chainOfCustody = await ChainOfCustody.deployed();

  // Set up initial authorized users
  // These could be environment variables in production
  const authorizedUsers = {
    'POLICE': accounts[1],
    'LAWYER': accounts[2],
    'ANALYST': accounts[3],
    'EXECUTIVE': accounts[4]
  };

  // Add authorized users
  console.log('Setting up authorized users...');
  try {
    for (const [role, address] of Object.entries(authorizedUsers)) {
      await chainOfCustody.addAuthorizedUser(address);
      console.log(`Added ${role} with address ${address} as authorized user`);
    }
  } catch (error) {
    console.error('Error setting up authorized users:', error);
    throw error;
  }

  // Log deployment information
  console.log('\nDeployment completed successfully!');
  console.log('Contract address:', chainOfCustody.address);
  console.log('\nAuthorized Users:');
  for (const [role, address] of Object.entries(authorizedUsers)) {
    console.log(`${role}: ${address}`);
  }

  // Verify deployment
  const adminAddress = await chainOfCustody.admin();
  console.log('\nContract Admin:', adminAddress);
  
  // Optional: Add some test data if we're in development
  if (network === 'development') {
    console.log('\nAdding test data...');
    try {
      // Add a test case with evidence
      const testCaseId = "c84e339e-5c0f-4f4d-84c5-bb79a3c1d2a2";
      const testItemId = "1004820154";
      
      await chainOfCustody.addEvidence(
        testCaseId,
        testItemId,
        { from: authorizedUsers['POLICE'] }
      );
      
      console.log('Test data added successfully');
      console.log(`Test Case ID: ${testCaseId}`);
      console.log(`Test Item ID: ${testItemId}`);
    } catch (error) {
      console.error('Error adding test data:', error);
      // Don't throw error for test data - deployment should still be considered successful
    }
  }
};