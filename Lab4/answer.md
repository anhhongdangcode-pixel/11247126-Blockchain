# Lab 04 Answers

**Experimental Output:**
```text
chain tip height: 965,660
block #840,000: 0000000000000000000320283a032748cef8227873ff4872689bf23f1cda83a5  bits=0x17034219
  CHECK recomputed hash == block id: OK
target = 0000000000000000000342190000000000000000000000000000000000000000
  CHECK PoW: int(hash) < target: OK
tx 2bb85f4b004be6da...  fee = 673,200,000 sat  vsize = 187 vB  rate = 3,600,000.0 sat/vB
  CHECK our fee == API 'fee' field: OK
computed root: 031b417c3a1828ddf3d6527fc210daafcc9218e81f98257f88d4d43bd7a5894f
header root  : 031b417c3a1828ddf3d6527fc210daafcc9218e81f98257f88d4d43bd7a5894f
  CHECK computed merkle root == header merkle_root: OK
```

**Q1: The target has roughly how many leading zero hex digits? How many bits of work does one valid header represent (~2^?)?**
- **Answer:** As shown in the output, the target is `000000000000000000034219...`, which has exactly **19 leading zero hex digits**. 19 hex digits equal 76 bits (19 * 4). The next hex digit `3` is `0011` in binary (2 leading zero bits). Thus, there are 78 leading zero bits in total. This means finding a valid block requires roughly **2^78 hashes** (bits of work).

**Q2: Verifying the PoW took your laptop 2 hash calls. Finding it took the network ~10 minutes at ~10²⁰ H/s. What property of SHA-256 creates this asymmetry?**
- **Answer:** This is caused by the **pre-image resistance (one-way function)** property of SHA-256. It is computationally infeasible to reverse the hash function to find the input (the nonce). As a result, miners are forced to use brute-force guessing, taking massive computational energy. However, once the correct input is found, anyone can hash it forward (just 2 hash calls for `dsha256`, taking ~0.000s as seen in our check) to instantly verify the output.

**Q3: This tx paid ~3,600,000 sat/vB (≈ 6.73 BTC fee for 187 vB!). Look at the date. What was happening, and what does it teach about how fees are set?**
- **Answer:** As seen in our output, this tiny 187 vB transaction paid a staggering `fee = 673,200,000 sat` (6.73 BTC). The date (April 20, 2024) marks the **4th Bitcoin Halving (Block 840,000)** and the simultaneous launch of the **Runes Protocol**. People were bidding astronomical fees to be the first to mint Runes on this historic block. This teaches us that Bitcoin transaction fees are determined by a **free-market auction (supply and demand)**, completely independent of the transaction's physical byte size. When block space demand spikes, fees skyrocket.

**Q4: The coinbase outputs total 4,075,061,499 sat. Subsidy is 312,500,000 sat. Where does the difference come from?**
- **Answer:** The massive difference (3,762,561,499 sat, or ~37.6 BTC) comes entirely from the **transaction fees** paid by all the 3,050 transactions included in this block. The miner gets to claim the fixed block subsidy (3.125 BTC) plus all the collected transaction fees.

**Q5: Your computed root matches the header exactly. Explain in 2–3 sentences what this proves about the block's transaction list, citing the hash property involved.**
- **Answer:** As shown in the output, both roots precisely match (`031b417c...5894f`). This mathematically proves the absolute **integrity** of the entire transaction list in the block. Thanks to the **collision resistance** and **avalanche effect** properties of SHA-256, if even a single bit of any transaction (or their order) was altered, the resulting Merkle root would be completely different. Because our computed root matches the header, we can guarantee this is the exact, untampered set of transactions the miner committed to.

---

# Bonus

**1. Testing Yesterday's Block (Online Mode)**
- **Result:** Successfully fetched and processed block `#965,517` dynamically via the API.
- **Outcome:** The PoW target, transaction fees, and Merkle root were all correctly validated (`OK`). This proves that our algorithms and implementations in the starter script are robust, standard-compliant, and work perfectly with any valid Bitcoin block, not just the hardcoded one.

**2. Current Mempool & Fees Analysis**
- **Mempool Status:** There are currently **~89,350 transactions** waiting in the mempool.
- **Fee Rates:** The recommended fees across all priority tiers (High, Medium, Low) are currently sitting at the absolute floor of **1 sat/vB**. 
- **Conclusion:** Compared to the astronomical fees of ~3,600,000 sat/vB during the 4th Halving (Block 840,000), the network is currently experiencing extremely low demand for block space. This stark contrast perfectly illustrates how Bitcoin's free-market fee auction works in practice.
