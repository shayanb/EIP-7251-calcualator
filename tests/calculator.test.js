/**
 * Tests for the EIP-7251 calculator reward calculations
 */

// Mock constants and functions from our calculator
const SECONDS_PER_YEAR = 31536000;
const SECONDS_PER_EPOCH = 384; // ~6.4 minutes
const EPOCHS_PER_YEAR = SECONDS_PER_YEAR / SECONDS_PER_EPOCH;
const MAX_EFFECTIVE_BALANCE_0X01 = 32;
const MAX_EFFECTIVE_BALANCE_0X02 = 2048;
const DEFAULT_ANNUAL_REWARD_RATE = 4.2; // percent
const EFFECTIVE_BALANCE_INCREMENT = 0.25; // 1/4 of an ETH

/**
 * Calculates rewards for a specific validator configuration
 * @param {Object} config - Configuration object
 * @returns {Object} - Final results object
 */
function calculateRewardsTest(config) {
    const {
        initialBalance,
        credentialType,
        annualRewardRate,
        timePeriod,
        compoundFrequency
    } = config;
    
    // Determine max effective balance based on credential type
    const maxEffectiveBalance = credentialType === '0x01' ? 
        MAX_EFFECTIVE_BALANCE_0X01 : MAX_EFFECTIVE_BALANCE_0X02;
    
    // Determine compound intervals per year
    let intervalsPerYear;
    switch(compoundFrequency) {
        case 'epoch':
            intervalsPerYear = EPOCHS_PER_YEAR;
            break;
        case 'daily':
            intervalsPerYear = 365;
            break;
        case 'monthly':
            intervalsPerYear = 12;
            break;
        case 'yearly':
            intervalsPerYear = 1;
            break;
        default:
            intervalsPerYear = 365;
    }
    
    // Calculate the rate per interval
    const ratePerInterval = annualRewardRate / intervalsPerYear;
    const totalIntervals = intervalsPerYear * timePeriod;
    
    // Initialize with starting values
    let currentBalance = initialBalance;
    // Effective balance is rounded down to the nearest EFFECTIVE_BALANCE_INCREMENT (0.25 ETH)
    // and capped at maxEffectiveBalance
    let currentEffectiveBalance = Math.min(
        Math.floor(initialBalance / EFFECTIVE_BALANCE_INCREMENT) * EFFECTIVE_BALANCE_INCREMENT,
        maxEffectiveBalance
    );
    
    // Calculate compound interest over time
    for (let interval = 1; interval <= totalIntervals; interval++) {
        // Calculate rewards for this interval based on effective balance
        const intervalReward = currentEffectiveBalance * ratePerInterval;
        
        // Add rewards to balance
        currentBalance += intervalReward;
        
        // Update effective balance with bounds
        if (credentialType === '0x01') {
            // For 0x01, effective balance is capped at 32 ETH
            // Any excess is automatically withdrawn and doesn't compound
            currentEffectiveBalance = Math.min(MAX_EFFECTIVE_BALANCE_0X01, currentBalance);
        } else {
            // For 0x02, effective balance can grow up to 2048 ETH
            // Note: Effective balance only increases when total balance exceeds 
            // current effective balance by at least EFFECTIVE_BALANCE_INCREMENT (0.25 ETH)
            if (currentBalance >= currentEffectiveBalance + EFFECTIVE_BALANCE_INCREMENT && 
                currentEffectiveBalance < maxEffectiveBalance) {
                // Calculate new effective balance
                const newEffectiveBalance = Math.min(
                    Math.floor(currentBalance / EFFECTIVE_BALANCE_INCREMENT) * EFFECTIVE_BALANCE_INCREMENT,
                    maxEffectiveBalance
                );
                currentEffectiveBalance = newEffectiveBalance;
            }
        }
    }
    
    // Calculate final results
    const finalBalance = currentBalance;
    const totalRewards = finalBalance - initialBalance;
    const roi = (totalRewards / initialBalance) * 100;
    
    return {
        finalBalance,
        totalRewards,
        roi,
        finalEffectiveBalance: currentEffectiveBalance
    };
}

// Test suite
describe('Validator Reward Calculator', () => {
    // Test 0x01 rewards (32 ETH max)
    test('0x01 credential type should cap effective balance at 32 ETH', () => {
        const config = {
            initialBalance: 32,
            credentialType: '0x01',
            annualRewardRate: DEFAULT_ANNUAL_REWARD_RATE / 100,
            timePeriod: 5,
            compoundFrequency: 'epoch'
        };
        
        const result = calculateRewardsTest(config);
        
        // Effective balance should be capped at 32 ETH
        expect(result.finalEffectiveBalance).toBeLessThanOrEqual(MAX_EFFECTIVE_BALANCE_0X01);
        
        // Final balance should be greater than initial due to rewards
        expect(result.finalBalance).toBeGreaterThan(config.initialBalance);
        
        // Check that 5 years of rewards at ~4.2% gives reasonable return
        // (ballpark check, exact amount will vary with compounding)
        expect(result.totalRewards).toBeCloseTo(32 * 0.042 * 5, 0);
    });
    
    // Test 0x02 rewards (2048 ETH max)
    test('0x02 credential type should allow effective balance to grow', () => {
        const config = {
            initialBalance: 32,
            credentialType: '0x02',
            annualRewardRate: DEFAULT_ANNUAL_REWARD_RATE / 100,
            timePeriod: 5,
            compoundFrequency: 'epoch'
        };
        
        const result = calculateRewardsTest(config);
        
        // Effective balance should be greater than initial 32 ETH due to compounding
        expect(result.finalEffectiveBalance).toBeGreaterThan(32);
        
        // Final balance should be greater than with 0x01 credentials
        const result0x01 = calculateRewardsTest({
            ...config,
            credentialType: '0x01'
        });
        expect(result.finalBalance).toBeGreaterThan(result0x01.finalBalance);
        
        // Check that rewards are higher than non-compounding
        expect(result.totalRewards).toBeGreaterThan(result0x01.totalRewards);
    });
    
    // Test 0.25 ETH increments for effective balance
    test('Effective balance should increase in 0.25 ETH increments', () => {
        const config = {
            initialBalance: 32.1, // Start slightly above 32 ETH
            credentialType: '0x02',
            annualRewardRate: DEFAULT_ANNUAL_REWARD_RATE / 100,
            timePeriod: 1,
            compoundFrequency: 'yearly'
        };
        
        const result = calculateRewardsTest(config);
        
        // The effective balance should be in 0.25 ETH increments
        const remainder = result.finalEffectiveBalance % 0.25;
        expect(remainder).toBeCloseTo(0, 10);
        
        // Verify the specific increment based on expected growth
        // 32.1 + (32 * 0.042) ≈ 33.44, so effective balance should be 33.25 ETH
        expect(result.finalEffectiveBalance).toBeCloseTo(33.25, 10);
    });
    
    // Test multiple compounding frequencies
    test('Different compound frequencies should produce different results', () => {
        const baseConfig = {
            initialBalance: 32,
            credentialType: '0x02',
            annualRewardRate: DEFAULT_ANNUAL_REWARD_RATE / 100,
            timePeriod: 5
        };
        
        const epochResult = calculateRewardsTest({
            ...baseConfig,
            compoundFrequency: 'epoch'
        });
        
        const dailyResult = calculateRewardsTest({
            ...baseConfig,
            compoundFrequency: 'daily'
        });
        
        const monthlyResult = calculateRewardsTest({
            ...baseConfig,
            compoundFrequency: 'monthly'
        });
        
        const yearlyResult = calculateRewardsTest({
            ...baseConfig,
            compoundFrequency: 'yearly'
        });
        
        // More frequent compounding should produce higher returns
        expect(epochResult.finalBalance).toBeGreaterThan(dailyResult.finalBalance);
        expect(dailyResult.finalBalance).toBeGreaterThan(monthlyResult.finalBalance);
        expect(monthlyResult.finalBalance).toBeGreaterThan(yearlyResult.finalBalance);
    });
    
    // Test larger initial balances for 0x02
    test('0x02 credential type should support initial balances up to 2048 ETH', () => {
        const config = {
            initialBalance: 1000, // 1000 ETH (well below 2048)
            credentialType: '0x02',
            annualRewardRate: DEFAULT_ANNUAL_REWARD_RATE / 100,
            timePeriod: 5,
            compoundFrequency: 'epoch'
        };
        
        const result = calculateRewardsTest(config);
        
        // Effective balance should match initial balance
        expect(result.finalEffectiveBalance).toBeGreaterThan(config.initialBalance);
        
        // Ensure it doesn't exceed max
        expect(result.finalEffectiveBalance).toBeLessThanOrEqual(MAX_EFFECTIVE_BALANCE_0X02);
        
        // For 0x01, effective balance would be capped at 32 ETH
        const result0x01 = calculateRewardsTest({
            ...config,
            credentialType: '0x01'
        });
        expect(result0x01.finalEffectiveBalance).toBeLessThanOrEqual(MAX_EFFECTIVE_BALANCE_0X01);
        
        // Rewards for 0x02 should be much higher
        expect(result.totalRewards).toBeGreaterThan(result0x01.totalRewards);
    });
});