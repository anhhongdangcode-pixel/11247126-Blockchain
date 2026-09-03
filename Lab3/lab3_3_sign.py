#!/usr/bin/env python3
from eth_account import Account
from eth_account.messages import encode_defunct

# 1. Create a test wallet (NEVER USE FOR REAL FUNDS)
acct = Account.create()
print("address:", acct.address)

# 2. Original message
msg = encode_defunct(text="I attended Session 3 / Toi da hoc Buoi 3")

# 3. Sign the message (1st time)
sig1 = Account.sign_message(msg, acct.key)
print("\n--- Signature 1 ---")
print("r,s,v:", hex(sig1.r), hex(sig1.s), sig1.v)

# 4. Sign the message (2nd time) to test determinism
sig2 = Account.sign_message(msg, acct.key)
print("--- Signature 2 ---")
print("r,s,v:", hex(sig2.r), hex(sig2.s), sig2.v)
print("Are both signatures identical?:", sig1.signature == sig2.signature)

# 5. Recover address from the signature
who = Account.recover_message(msg, signature=sig1.signature)
print("\nrecovered:", who, "| match:", who == acct.address)

# 6. Tamper the message
bad = encode_defunct(text="I attended Session 3 / Toi da hoc Buoi 4")
tampered_who = Account.recover_message(bad, signature=sig1.signature)
print("tampered ->", tampered_who)
print("Matches original wallet?:", tampered_who == acct.address)