document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const fetchValidatorBtn = document.getElementById('fetch-validator-btn');
    const validatorIndexInput = document.getElementById('validator-index');
    const validatorInfoDiv = document.getElementById('validator-info');
    const initialBalanceInput = document.getElementById('initial-balance');
    const credentialTypeSelect = document.getElementById('credential-type');
    const comparisonModeSelect = document.getElementById('comparison-mode');
    const singleResultDiv = document.getElementById('single-result');
    const comparisonResultDiv = document.getElementById('comparison-result');
    const updateBalanceBtn = document.getElementById('update-balance-btn');
    const balanceChangeInput = document.getElementById('balance-change');
    
    // Variables to store validator data
    let currentValidatorData = null;
    
    // beaconcha.in API base URL
    const API_BASE_URL = 'https://beaconcha.in/api/v1';
    
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            
            // Update buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });
    
    // Comparison mode switching
    comparisonModeSelect.addEventListener('change', () => {
        const mode = comparisonModeSelect.value;
        
        if (mode === 'none') {
            singleResultDiv.classList.remove('hidden');
            comparisonResultDiv.classList.add('hidden');
        } else {
            singleResultDiv.classList.add('hidden');
            comparisonResultDiv.classList.remove('hidden');
        }
    });
    
    // Fetch validator data from beaconcha.in API
    async function fetchValidatorData(validatorId) {
        try {
            // Try to validate if input is an ETH address
            let endpoint = '';
            const isAddress = validatorId.startsWith('0x') && validatorId.length === 42;
            const isPublicKey = validatorId.length === 96 || (validatorId.startsWith('0x') && validatorId.length === 98);
            
            if (isAddress) {
                // If input is an ETH address
                endpoint = `${API_BASE_URL}/validator/eth1/${validatorId}`;
            } else if (isPublicKey) {
                // If input is a public key
                // Remove 0x prefix if present for API compatibility
                const cleanPublicKey = validatorId.startsWith('0x') ? validatorId.slice(2) : validatorId;
                endpoint = `${API_BASE_URL}/validator/${cleanPublicKey}`;
            } else {
                // Assume it's a validator index
                endpoint = `${API_BASE_URL}/validator/${validatorId}`;
            }
            
            console.log("Fetching validator data from:", endpoint);
            
            // Set a longer timeout for the API request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(endpoint, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'error' || !data.data) {
                throw new Error(data.message || 'Failed to fetch validator data');
            }
            
            // Use the first validator if response is an array
            if (Array.isArray(data.data)) {
                console.log("API returned multiple validators, using the first one");
                return data.data[0];
            }
            
            return data.data;
        } catch (error) {
            console.error('Error fetching validator data:', error);
            return null;
        }
    }
    
    // Determine withdrawal credential type from validator data
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
    
    // Parse and display validator data
    function displayValidatorData(validator) {
        if (!validator) {
            alert('Failed to fetch validator data. Please check the validator index/address and try again.');
            return;
        }
        
        console.log("Raw validator data:", validator);
        
        // Store the validator data for later use
        currentValidatorData = validator;
        
        // Convert balance from gwei to ETH (beaconcha.in returns balance as a string)
        let currentBalance;
        let effectiveBalance;
        
        try {
            // Handle both string and number formats from the API
            if (typeof validator.balance === 'string') {
                currentBalance = parseFloat(validator.balance) / 1000000000;
            } else if (typeof validator.balance === 'number') {
                currentBalance = validator.balance / 1000000000;
            } else {
                // Fallback value
                console.error("Unexpected balance type:", typeof validator.balance);
                currentBalance = 32;
            }
            
            if (typeof validator.effectivebalance === 'string') {
                effectiveBalance = parseFloat(validator.effectivebalance) / 1000000000;
            } else if (typeof validator.effectivebalance === 'number') {
                effectiveBalance = validator.effectivebalance / 1000000000;
            } else {
                // Fallback value
                console.error("Unexpected effective balance type:", typeof validator.effectivebalance);
                effectiveBalance = 32;
            }
        } catch (error) {
            console.error("Error parsing validator balances:", error);
            currentBalance = 32;
            effectiveBalance = 32;
        }
        
        // Double-check the values are reasonable
        if (isNaN(currentBalance) || currentBalance < 1 || currentBalance > 10000) {
            console.warn("Current balance seems incorrect:", currentBalance, "Using default 32 ETH");
            currentBalance = 32;
        }
        
        if (isNaN(effectiveBalance) || effectiveBalance < 1 || effectiveBalance > 2048) {
            console.warn("Effective balance seems incorrect:", effectiveBalance, "Using default 32 ETH");
            effectiveBalance = 32;
        }
        
        // Determine credential type
        const credentialType = determineCredentialType(validator);
        
        // Get the actual credential prefix for display
        const credentialPrefix = validator.withdrawalcredentials ? 
            validator.withdrawalcredentials.substring(0, 4) : 'Unknown';
        
        // Update display
        document.getElementById('current-balance').textContent = `${currentBalance.toFixed(6)} ETH`;
        document.getElementById('effective-balance').textContent = `${effectiveBalance.toFixed(2)} ETH`;
        document.getElementById('validator-status').textContent = validator.status || 'Unknown';
        document.getElementById('credential-type-display').textContent = credentialPrefix;
        
        // Show/hide credential upgrade note
        const upgradeNoteEl = document.getElementById('credential-upgrade-note');
        if (credentialPrefix === '0x00' || credentialType === '0x01') {
            upgradeNoteEl.classList.remove('hidden');
        } else {
            upgradeNoteEl.classList.add('hidden');
        }
        
        // Clear any previous value in the balance change input
        balanceChangeInput.value = '';
        
        // Update form inputs
        initialBalanceInput.value = currentBalance.toFixed(6);
        credentialTypeSelect.value = credentialType;
        
        // Update UI and immediately calculate rewards based on fetched data
        document.getElementById('calculate-btn').click();
        
        // Show validator info
        validatorInfoDiv.classList.remove('hidden');
        
        console.log("Processed validator data:", {
            currentBalance,
            effectiveBalance,
            credentialType,
            credentialPrefix
        });
    }
    
    // Handle fetch validator button click
    fetchValidatorBtn.addEventListener('click', async () => {
        const validatorId = validatorIndexInput.value.trim();
        
        if (!validatorId) {
            alert('Please enter a validator index or ETH address');
            return;
        }
        
        // Show loading state
        fetchValidatorBtn.textContent = 'Loading...';
        fetchValidatorBtn.disabled = true;
        
        // Fetch validator data
        const validator = await fetchValidatorData(validatorId);
        
        // Reset button
        fetchValidatorBtn.textContent = 'Fetch Validator Data';
        fetchValidatorBtn.disabled = false;
        
        // Display data if successful
        if (validator) {
            displayValidatorData(validator);
        }
    });
    
    // Handle update balance button click
    updateBalanceBtn.addEventListener('click', () => {
        // Get the entered balance change value
        const balanceChange = parseFloat(balanceChangeInput.value.trim());
        
        // Validate the input
        if (isNaN(balanceChange) || balanceChange < 0) {
            alert('Please enter a valid non-negative ETH amount');
            return;
        }
        
        // Get the current balance
        const currentBalanceText = document.getElementById('current-balance').textContent;
        const currentBalance = parseFloat(currentBalanceText.split(' ')[0]);
        
        // Calculate the new balance
        const newBalance = currentBalance + balanceChange;
        
        // Update the displayed current balance
        document.getElementById('current-balance').textContent = `${newBalance.toFixed(6)} ETH`;
        
        // Update the initial balance input for calculation
        initialBalanceInput.value = newBalance.toFixed(6);
        
        // Store the top-up amount for future use
        // We'll keep the input value visible rather than clearing it
        
        // Show notification of the change
        const notificationEl = document.getElementById('balance-update-notification');
        const messageEl = document.getElementById('balance-change-message');
        messageEl.textContent = `Balance updated: +${balanceChange.toFixed(2)} ETH (${currentBalance.toFixed(2)} → ${newBalance.toFixed(2)} ETH)`;
        
        // Show the notification
        notificationEl.classList.remove('hidden');
        
        // Hide notification after 4 seconds
        setTimeout(() => {
            notificationEl.classList.add('hidden');
        }, 4000);
        
        // Recalculate rewards with the new balance
        document.getElementById('calculate-btn').click();
        
        // Check if credential type is 0x01 and show upgrade note if needed
        const credentialPrefix = document.getElementById('credential-type-display').textContent;
        const upgradeNoteEl = document.getElementById('credential-upgrade-note');
        
        if (credentialPrefix === '0x00' || credentialPrefix === '0x01') {
            upgradeNoteEl.classList.remove('hidden');
        } else {
            upgradeNoteEl.classList.add('hidden');
        }
        
        console.log(`Balance updated: ${currentBalance} ETH + ${balanceChange} ETH = ${newBalance} ETH`);
    });
});