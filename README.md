# Ethereum Validator Rewards Calculator (EIP-7251)

An interactive calculator to estimate Ethereum validator rewards with the new EIP-7251 (Pectra upgrade) maximum effective balance changes.

## About EIP-7251

EIP-7251 is part of the Ethereum Pectra upgrade implemented in May 2025. It increases the maximum effective balance for validators from 32 ETH to 2048 ETH for validators with 0x02 withdrawal credentials.

Key benefits:
- Validators with 0x02 credentials can have an effective balance up to 2048 ETH
- Rewards compound automatically as they're added to the effective balance
- Partial withdrawals only trigger when balance exceeds 2048 ETH (vs 32 ETH before)
- Large stakers can consolidate validators, reducing operational complexity
- Effective balance increases in 0.25 ETH increments once balance exceeds previous effective balance by 0.25 ETH

## Features

- Compare rewards for validators with 0x01 and 0x02 withdrawal credentials
- Simulate different compounding frequencies (per epoch, daily, monthly, yearly)
- Visualize balance growth over time with interactive charts
- Calculate final balance, total rewards, and ROI
- Fetch real validator data using beaconcha.in API

## Running the Calculator

### Quick Start
Simply open `index.html` in a web browser. No server-side requirements.

### Using npm
1. Install dependencies:
   ```
   npm install
   ```

2. Start the local server:
   ```
   npm start
   ```

3. Open http://localhost:8080 in your browser

## Sample Validators to Test

Try these validator public keys in the "Fetch Validator" tab:

- 0x02 type: `a7f97d55b37041584d38eaa916346d5381359cdbf9f5957aa1e0b692002bb01a5ec269fa614365b8fe53e375698411ba`
- 0x01 type: `8075a7ccdda37f85c647a667060a06feed69c0fc4c80f66dbf974b81aa6307eaef78e80e0aed114631b4d4b19ef31b42`
- 0x00 type: `8078c7f4ab6f9eaaf59332b745be8834434af4ab3c741899abcff93563544d2e5a89acf2bec1eda2535610f253f73ee6`

## Development

### Running Tests
```
npm test
```

## Resources

The calculator's reward calculation model is based on the following resources:

- [Exploring Validator Compounding - Attestant.io](https://www.attestant.io/posts/exploring-validator-compounding/)
- [EIP-7251: Increase the MAX_EFFECTIVE_BALANCE](https://eips.ethereum.org/EIPS/eip-7251)
- [Ethereum Staking Documentation](https://ethereum.org/en/staking/)

## Technologies Used

- HTML5, CSS3, and JavaScript
- Chart.js for data visualization
- Jest for testing

## License

MIT