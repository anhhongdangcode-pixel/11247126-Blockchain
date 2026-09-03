# Lab 3.1 Answers
**Experimental result:**
--- (a) Avalanche effect ---
SHA256('Blockchain 2026'): c42dafbbe164b917016b4c3491ee7445e6c01fae0524a83f96c2ece8720b2d78
SHA256('blockchain 2026'): 3b467304922f266e0331cc5e1598ec58657f48b5a9e2587763260244a30f40c7

--- (b) Toy Proof-of-Work ---
k=1  nonce=        5  time=0.000s
k=2  nonce=       61  time=0.000s
k=3  nonce=       61  time=0.000s
k=4  nonce=    14229  time=0.022s
k=5  nonce=    55980  time=0.088s
k=6  nonce= 24517505  time=34.941s
**Q1: Each extra leading zero multiplies expected work by ≈ how much? Why?**
- **Answer:** It theoretically multiplies the expected work by **16**. 
- **Why:** The hash output is in hexadecimal (base 16). Each hex character has 16 possible values (0-9, a-f). To get an extra leading zero, the next character must be exactly '0' (probability 1/16). 
- **Experimental note:** As seen in the experiment, the actual number of attempts varies wildly due to the probabilistic nature of hashing (e.g., jumping from 61 attempts for `k=3` to 14,229 for `k=4` is a ~233x increase, while `k=4` to `k=5` is only ~4x). Despite the variance, the massive jump at `k=6` (over 24.5 million attempts) clearly demonstrates the exponential difficulty curve.

**Q2: Verifying your found nonce takes how many hash calls? What does this say about PoW?**
- **Answer:** Verifying takes exactly **1 hash call**. 
- **What it says about PoW:** This demonstrates that Proof-of-Work is heavily **asymmetric**. For example, in the experiment, finding the nonce for `k=6` took **24,517,505 attempts** and **~35 seconds** of CPU time. Yet, anyone can verify this correct nonce in just **1 single hash** (~0.000s). It proves that PoW is computationally expensive to solve, but trivially fast to verify.

# Lab 3.2 Answers

**Q3: For n = 1,000,000 transactions, how many hashes does one proof contain?**
- **Answer:** One proof contains **20 hashes**.
- **Explanation:** The number of hashes in a Merkle proof is proportional to the height of the tree, which is exactly `ceil(log2(n))`. For `n = 1,000,000`, `log2(1,000,000) ≈ 19.93`. Rounding up gives a proof length of 20 elements. This logarithmic scaling is why Merkle proofs are extremely efficient for massive datasets.

**Q4: Explain one real system that uses exactly this mechanism (SPV, airdrop claim, proof-of-reserves…).**
- **System: Cryptocurrency Airdrops (e.g., Uniswap, Arbitrum)**
- **Explanation:** When distributing tokens to hundreds of thousands of eligible users, it is way too expensive (due to high gas fees) to store every user's address and reward amount directly in the blockchain's state. Instead, the smart contract only stores a single 32-byte **Merkle root** of all eligible claims. To claim the airdrop, a user submits their address, amount, and their specific **Merkle proof**. The smart contract uses the same logic as our `verify_proof` function to hash upward to the root. If the computed root matches the stored root, the contract verifies the user is eligible and transfers the tokens, keeping on-chain data minimal and cheap.

# Lab 3.3 Answers

**Task 1: Run twice with the same message — is the signature identical? Which RFC explains this?**
- **Answer:** Yes, both signatures are perfectly identical.
- **Explanation:** This is explained by **RFC 6979** (Deterministic Usage of the Digital Signature Algorithm and Elliptic Curve Digital Signature Algorithm). In standard ECDSA, a random nonce (`k`) is required for every signature. If the random number generator is flawed and reuses a nonce across two different messages, attackers can instantly calculate the private key (a famous example is the PlayStation 3 hack). RFC 6979 eliminates this risk by generating the nonce deterministically using a cryptographic hash of the private key and the message itself. As a result, signing the exact same message with the same key will always safely yield the exact same signature.

**Task 2: The tampered message recovers a different address. Explain why this proves integrity.**
- **Explanation:** When we tampered with the message (changing "Buoi 3" to "Buoi 4") and recovered the signer's address using the original signature, the elliptic curve math produced a completely different, random public key (address: `0x261e...`). Because this recovered address does NOT match the original signer's address (`0x89c1...`), the system immediately knows the signature is invalid for this new message. This guarantees data **integrity**: if anyone alters the data even slightly in transit, the signature verification will fail, mathematically proving the data is no longer exactly what the owner signed.
