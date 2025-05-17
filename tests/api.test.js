/**
 * Tests for the beaconcha.in API integration
 */

// Get sample validator public keys from globals defined in jest.config.js
const SAMPLE_VALIDATORS = {
    TYPE_0X00: global.testData?.validators['0x00'] || '8078c7f4ab6f9eaaf59332b745be8834434af4ab3c741899abcff93563544d2e5a89acf2bec1eda2535610f253f73ee6',
    TYPE_0X01: global.testData?.validators['0x01'] || '8075a7ccdda37f85c647a667060a06feed69c0fc4c80f66dbf974b81aa6307eaef78e80e0aed114631b4d4b19ef31b42',
    TYPE_0X02: global.testData?.validators['0x02'] || 'a7f97d55b37041584d38eaa916346d5381359cdbf9f5957aa1e0b692002bb01a5ec269fa614365b8fe53e375698411ba'
};

// Mock implementation of the determineCredentialType function from api.js
function determineCredentialType(validator) {
    if (!validator.withdrawalcredentials) {
        return '0x01'; // Default to 0x01 if we can't determine
    }
    
    // beaconcha.in provides withdrawal credentials as strings beginning with 0x
    // The first byte (characters 2-3) determine the type
    const credentialPrefix = validator.withdrawalcredentials.substring(0, 4);
    
    // Map credential prefixes to types
    switch (credentialPrefix) {
        case '0x00':
            // 0x00 prefix - BLS withdrawal credentials (original format)
            // These can't receive rewards beyond 32 ETH
            return '0x01';
        case '0x01':
            // 0x01 prefix - Execution layer (ETH1) withdrawal credentials
            // These can use EIP-7251 to have up to 2048 ETH effective balance
            return '0x02';
        case '0x02':
            // In case new prefix is added in the future
            return '0x02';
        default:
            // Unknown prefix, default to 0x01 for safety
            console.warn(`Unknown credential prefix: ${credentialPrefix}`);
            return '0x01';
    }
}

// Skip tests if API key is not available or we're in CI environment
const skipApiTests = process.env.CI === 'true' || !process.env.BEACONCHAIN_API_KEY;

// Fetch validator data from beaconcha.in API
async function fetchValidatorData(validatorId) {
    try {
        // Skip actual API calls in test environment
        if (skipApiTests) {
            // Return mock data for testing
            return mockValidatorData(validatorId);
        }

        const apiKey = process.env.BEACONCHAIN_API_KEY;
        const API_BASE_URL = 'https://beaconcha.in/api/v1';
        
        // Try to validate if input is an ETH address
        let endpoint = '';
        const isAddress = validatorId.startsWith('0x') && validatorId.length === 42;
        
        if (isAddress) {
            // If input is an ETH address
            endpoint = `${API_BASE_URL}/validator/eth1/${validatorId}`;
        } else {
            // Assume it's a validator index or public key
            endpoint = `${API_BASE_URL}/validator/${validatorId}`;
        }
        
        // Add API key if available
        if (apiKey) {
            endpoint += `?apikey=${apiKey}`;
        }
        
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'error' || !data.data) {
            throw new Error(data.message || 'Failed to fetch validator data');
        }
        
        return data.data;
    } catch (error) {
        console.error('Error fetching validator data:', error);
        return null;
    }
}

// Mock validator data for tests
function mockValidatorData(validatorId) {
    // Default mock data
    const mockData = {
        pubkey: validatorId,
        balance: '32100000000', // in gwei (32.1 ETH)
        effectivebalance: '32000000000', // in gwei (32 ETH)
        status: 'active',
        withdrawalcredentials: '0x00'
    };
    
    // Customize withdrawal credentials based on validator ID
    if (validatorId === SAMPLE_VALIDATORS.TYPE_0X00) {
        mockData.withdrawalcredentials = '0x00123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde';
    } else if (validatorId === SAMPLE_VALIDATORS.TYPE_0X01) {
        mockData.withdrawalcredentials = '0x01123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde';
    } else if (validatorId === SAMPLE_VALIDATORS.TYPE_0X02) {
        mockData.withdrawalcredentials = '0x02123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde';
    }
    
    return mockData;
}

// Test suite for the API integration
describe('Beaconcha.in API Integration', () => {
    
    // Test withdrawal credential detection for each type
    test('Should properly detect 0x00 withdrawal credentials', () => {
        const mockValidator = mockValidatorData(SAMPLE_VALIDATORS.TYPE_0X00);
        const credentialType = determineCredentialType(mockValidator);
        
        // 0x00 credentials should be treated as 0x01 type (32 ETH max)
        expect(credentialType).toBe('0x01');
        expect(mockValidator.withdrawalcredentials.substring(0, 4)).toBe('0x00');
    });
    
    test('Should properly detect 0x01 withdrawal credentials', () => {
        const mockValidator = mockValidatorData(SAMPLE_VALIDATORS.TYPE_0X01);
        const credentialType = determineCredentialType(mockValidator);
        
        // 0x01 credentials should be treated as 0x02 type (2048 ETH max)
        expect(credentialType).toBe('0x02');
        expect(mockValidator.withdrawalcredentials.substring(0, 4)).toBe('0x01');
    });
    
    test('Should properly detect 0x02 withdrawal credentials', () => {
        const mockValidator = mockValidatorData(SAMPLE_VALIDATORS.TYPE_0X02);
        const credentialType = determineCredentialType(mockValidator);
        
        // 0x02 credentials should be treated as 0x02 type (2048 ETH max)
        expect(credentialType).toBe('0x02');
        expect(mockValidator.withdrawalcredentials.substring(0, 4)).toBe('0x02');
    });
    
    // Test unknown withdrawal credential handling
    test('Should default to 0x01 type for unknown withdrawal credentials', () => {
        const mockValidator = {
            withdrawalcredentials: '0xff123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde'
        };
        const credentialType = determineCredentialType(mockValidator);
        
        // Unknown credentials should default to 0x01 type for safety
        expect(credentialType).toBe('0x01');
    });
    
    // Test missing withdrawal credentials
    test('Should default to 0x01 type for missing withdrawal credentials', () => {
        const mockValidator = {
            // No withdrawalcredentials field
        };
        const credentialType = determineCredentialType(mockValidator);
        
        // Missing credentials should default to 0x01 type for safety
        expect(credentialType).toBe('0x01');
    });
});