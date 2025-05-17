module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ['js/*.js'],
  // Test data available to all tests
  globals: {
    testData: {
      validators: {
        "0x00": "8078c7f4ab6f9eaaf59332b745be8834434af4ab3c741899abcff93563544d2e5a89acf2bec1eda2535610f253f73ee6",
        "0x01": "8075a7ccdda37f85c647a667060a06feed69c0fc4c80f66dbf974b81aa6307eaef78e80e0aed114631b4d4b19ef31b42",
        "0x02": "a7f97d55b37041584d38eaa916346d5381359cdbf9f5957aa1e0b692002bb01a5ec269fa614365b8fe53e375698411ba"
      }
    }
  }
};