document.addEventListener('DOMContentLoaded', () => {
    // Constants for validator rewards calculation
    const SECONDS_PER_YEAR = 31536000;
    const SECONDS_PER_EPOCH = 384; // ~6.4 minutes
    const EPOCHS_PER_YEAR = SECONDS_PER_YEAR / SECONDS_PER_EPOCH; // ~82,125 epochs per year
    const MAX_EFFECTIVE_BALANCE_0X01 = 32;
    const MAX_EFFECTIVE_BALANCE_0X02 = 2048;
    
    // Constants for validator rewards calculation based on Ethereum PoS spec
    const BASE_REWARD_FACTOR = 64;
    const BASE_REWARDS_PER_EPOCH = 4;
    // Activation threshold for effective balance changes (in ETH)
    const EFFECTIVE_BALANCE_INCREMENT = 0.25; // 1/4 of an ETH
    
    // Default annual reward rate based on research
    // Source: https://www.attestant.io/posts/exploring-validator-compounding/
    // and https://ethereum.org/en/staking/
    const DEFAULT_ANNUAL_REWARD_RATE = 4.2; // 4.2% APR

    // DOM elements
    const initialBalanceInput = document.getElementById('initial-balance');
    const credentialTypeSelect = document.getElementById('credential-type');
    const rewardRateInput = document.getElementById('reward-rate');
    const timePeriodInput = document.getElementById('time-period');
    const compoundFrequencySelect = document.getElementById('compound-frequency');
    const comparisonModeCheckbox = document.getElementById('comparison-mode');
    const calculateBtn = document.getElementById('calculate-btn');
    
    // Result elements
    const finalBalanceEl = document.getElementById('final-balance');
    const totalRewardsEl = document.getElementById('total-rewards');
    const roiEl = document.getElementById('roi');
    
    // Set default values from research
    rewardRateInput.value = DEFAULT_ANNUAL_REWARD_RATE;
    compoundFrequencySelect.value = 'epoch'; // Set default to per-epoch compounding
    
    // Chart instance
    let rewardsChart = null;
    
    
    // Calculate rewards based on inputs
    function calculateRewards() {
        // Get input values
        const initialBalance = parseFloat(initialBalanceInput.value);
        const credentialType = credentialTypeSelect.value;
        const annualRewardRate = parseFloat(rewardRateInput.value) / 100;
        const timePeriod = parseInt(timePeriodInput.value);
        const compoundFrequency = compoundFrequencySelect.value;
        
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
        
        // Arrays to track balance over time
        const timeLabels = [];
        const balanceData = [];
        const effectiveBalanceData = [];
        
        // Initialize with starting values
        let currentBalance = initialBalance;
        // Effective balance is rounded down to the nearest EFFECTIVE_BALANCE_INCREMENT (0.25 ETH)
        // and capped at maxEffectiveBalance
        let currentEffectiveBalance = Math.min(
            Math.floor(initialBalance / EFFECTIVE_BALANCE_INCREMENT) * EFFECTIVE_BALANCE_INCREMENT,
            maxEffectiveBalance
        );
        
        timeLabels.push(0);
        balanceData.push(currentBalance);
        effectiveBalanceData.push(currentEffectiveBalance);
        
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
            
            // Record data points for chart (not every interval to keep chart readable)
            // For epoch compounding, record daily points
            const yearFraction = interval / intervalsPerYear;
            
            if (compoundFrequency === 'epoch') {
                // Record approximately daily for epoch compounding
                if (interval % Math.floor(EPOCHS_PER_YEAR / 365) === 0 || interval === totalIntervals) {
                    timeLabels.push(yearFraction.toFixed(2));
                    balanceData.push(currentBalance);
                    effectiveBalanceData.push(currentEffectiveBalance);
                }
            } else {
                // Record every interval for other compounding frequencies
                timeLabels.push(yearFraction.toFixed(2));
                balanceData.push(currentBalance);
                effectiveBalanceData.push(currentEffectiveBalance);
            }
        }
        
        // Calculate final results
        const finalBalance = currentBalance;
        const totalRewards = finalBalance - initialBalance;
        const roi = (totalRewards / initialBalance) * 100;
        
        // Update UI
        finalBalanceEl.textContent = `${finalBalance.toFixed(4)} ETH`;
        totalRewardsEl.textContent = `${totalRewards.toFixed(4)} ETH`;
        roiEl.textContent = `${roi.toFixed(2)}%`;
        
        // Update chart
        updateChart(timeLabels, balanceData, effectiveBalanceData);
    }
    
    // Calculate rewards for a specific credential type
    function calculateRewardsForCredentialType(credentialType) {
        // Get input values
        const initialBalance = parseFloat(initialBalanceInput.value);
        const annualRewardRate = parseFloat(rewardRateInput.value) / 100;
        const timePeriod = parseInt(timePeriodInput.value);
        const compoundFrequency = compoundFrequencySelect.value;
        
        // Determine max effective balance based on credential type
        // For 0x01, limit to 32 ETH, for 0x02 allow up to 2048 ETH
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
        
        // Arrays to track balance over time
        const timeLabels = [];
        const balanceData = [];
        const effectiveBalanceData = [];
        
        // Initialize with starting values
        let currentBalance = initialBalance;
        // Effective balance is rounded down to the nearest EFFECTIVE_BALANCE_INCREMENT (0.25 ETH)
        // and capped at maxEffectiveBalance
        let currentEffectiveBalance = Math.min(
            Math.floor(initialBalance / EFFECTIVE_BALANCE_INCREMENT) * EFFECTIVE_BALANCE_INCREMENT,
            maxEffectiveBalance
        );
        
        timeLabels.push(0);
        balanceData.push(currentBalance);
        effectiveBalanceData.push(currentEffectiveBalance);
        
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
            
            // Record data points for chart (not every interval to keep chart readable)
            // For epoch compounding, record daily points
            const yearFraction = interval / intervalsPerYear;
            
            if (compoundFrequency === 'epoch') {
                // Record approximately daily for epoch compounding
                if (interval % Math.floor(EPOCHS_PER_YEAR / 365) === 0 || interval === totalIntervals) {
                    timeLabels.push(yearFraction.toFixed(2));
                    balanceData.push(currentBalance);
                    effectiveBalanceData.push(currentEffectiveBalance);
                }
            } else {
                // Record every interval for other compounding frequencies
                timeLabels.push(yearFraction.toFixed(2));
                balanceData.push(currentBalance);
                effectiveBalanceData.push(currentEffectiveBalance);
            }
        }
        
        // Calculate final results
        const finalBalance = currentBalance;
        const totalRewards = finalBalance - initialBalance;
        const roi = (totalRewards / initialBalance) * 100;
        
        return {
            timeLabels,
            balanceData,
            effectiveBalanceData,
            finalBalance,
            totalRewards,
            roi
        };
    }
    
    // Calculate rewards and update the UI
    function calculateRewards() {
        const comparisonMode = comparisonModeCheckbox.checked;
        const timePeriod = parseInt(timePeriodInput.value);
        
        // Show time window
        const timeWindowText = `over ${timePeriod} year${timePeriod > 1 ? 's' : ''}`;
        
        if (!comparisonMode) {
            // Show single result div, hide comparison result div
            document.getElementById('single-result').classList.remove('hidden');
            document.getElementById('comparison-result').classList.add('hidden');
            
            // Single credential type calculation
            const credentialType = credentialTypeSelect.value;
            const results = calculateRewardsForCredentialType(credentialType);
            
            // Update UI
            finalBalanceEl.textContent = `${results.finalBalance.toFixed(4)} ETH`;
            totalRewardsEl.textContent = `${results.totalRewards.toFixed(4)} ETH ${timeWindowText}`;
            roiEl.textContent = `${results.roi.toFixed(2)}% ${timeWindowText}`;
            
            // Update chart
            updateChart(results.timeLabels, results.balanceData, results.effectiveBalanceData);
        } else {
            // Show comparison result div, hide single result div
            document.getElementById('single-result').classList.add('hidden');
            document.getElementById('comparison-result').classList.remove('hidden');
            
            // Compare 0x01 vs 0x02
            const results0x01 = calculateRewardsForCredentialType('0x01');
            const results0x02 = calculateRewardsForCredentialType('0x02');
            
            // Calculate differences
            const finalBalanceDiff = results0x02.finalBalance - results0x01.finalBalance;
            const totalRewardsDiff = results0x02.totalRewards - results0x01.totalRewards;
            const roiDiff = results0x02.roi - results0x01.roi;
            
            // Update comparison UI with time window
            document.getElementById('compare-0x01-final').textContent = `${results0x01.finalBalance.toFixed(4)} ETH`;
            document.getElementById('compare-0x02-final').textContent = `${results0x02.finalBalance.toFixed(4)} ETH`;
            document.getElementById('compare-final-diff').textContent = `${finalBalanceDiff > 0 ? '+' : ''}${finalBalanceDiff.toFixed(4)} ETH`;
            document.getElementById('compare-final-diff').classList.toggle('negative', finalBalanceDiff < 0);
            
            document.getElementById('compare-0x01-rewards').textContent = `${results0x01.totalRewards.toFixed(4)} ETH`;
            document.getElementById('compare-0x02-rewards').textContent = `${results0x02.totalRewards.toFixed(4)} ETH`;
            document.getElementById('compare-rewards-diff').textContent = `${totalRewardsDiff > 0 ? '+' : ''}${totalRewardsDiff.toFixed(4)} ETH`;
            document.getElementById('compare-rewards-diff').classList.toggle('negative', totalRewardsDiff < 0);
            
            document.getElementById('compare-0x01-roi').textContent = `${results0x01.roi.toFixed(2)}%`;
            document.getElementById('compare-0x02-roi').textContent = `${results0x02.roi.toFixed(2)}%`;
            document.getElementById('compare-roi-diff').textContent = `${roiDiff > 0 ? '+' : ''}${roiDiff.toFixed(2)}%`;
            document.getElementById('compare-roi-diff').classList.toggle('negative', roiDiff < 0);
            
            // Add time window text to the table header
            document.querySelector('.comparison-header .header-cell:first-child').textContent = 
                `Metric ${timeWindowText}`;
            
            // Update chart with both datasets
            updateComparisonChart(
                results0x01.timeLabels, 
                results0x01.balanceData, 
                results0x01.effectiveBalanceData,
                results0x02.balanceData,
                results0x02.effectiveBalanceData
            );
        }
    }
    
    // Update the chart with single credential type data
    function updateChart(labels, balanceData, effectiveBalanceData) {
        const ctx = document.getElementById('rewards-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (rewardsChart) {
            rewardsChart.destroy();
        }
        
        // Create new chart
        rewardsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Balance (ETH)',
                        data: balanceData,
                        borderColor: '#1a2f60',
                        backgroundColor: 'rgba(26, 47, 96, 0.1)',
                        fill: true,
                        tension: 0.3,
                        order: 1
                    },
                    {
                        label: 'Effective Balance (ETH)',
                        data: effectiveBalanceData,
                        borderColor: '#6d7ca1',
                        backgroundColor: 'rgba(109, 124, 161, 0.1)',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.3,
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                return `${label}: ${value.toFixed(4)} ETH`;
                            },
                            title: function(tooltipItems) {
                                return `Year ${tooltipItems[0].label}`;
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Validator Balance Growth Over Time'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Years'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'ETH'
                        },
                        beginAtZero: false
                    }
                }
            }
        });
    }
    
    // Update chart with comparison data
    function updateComparisonChart(labels, balance0x01, effective0x01, balance0x02, effective0x02) {
        const ctx = document.getElementById('rewards-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (rewardsChart) {
            rewardsChart.destroy();
        }
        
        // Create new chart with both 0x01 and 0x02 data
        rewardsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '0x01 Total Balance',
                        data: balance0x01,
                        borderColor: '#1a2f60',
                        backgroundColor: 'rgba(26, 47, 96, 0.1)',
                        fill: false,
                        tension: 0.3,
                        order: 1
                    },
                    {
                        label: '0x01 Effective Balance',
                        data: effective0x01,
                        borderColor: '#1a2f60',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.3,
                        order: 2
                    },
                    {
                        label: '0x02 Total Balance',
                        data: balance0x02,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        fill: false,
                        tension: 0.3,
                        order: 3
                    },
                    {
                        label: '0x02 Effective Balance',
                        data: effective0x02,
                        borderColor: '#28a745',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.3,
                        order: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                return `${label}: ${value.toFixed(4)} ETH`;
                            },
                            title: function(tooltipItems) {
                                return `Year ${tooltipItems[0].label}`;
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Credential Type Comparison: 0x01 vs 0x02'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Years'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'ETH'
                        },
                        beginAtZero: false
                    }
                }
            }
        });
    }
    
    // Event listeners
    calculateBtn.addEventListener('click', calculateRewards);
    
    // Handle changes in comparison mode
    comparisonModeCheckbox.addEventListener('change', () => {
        // Recalculate when comparison mode changes
        calculateRewards();
    });
    
    // Initialize with default values
    calculateRewards();
});