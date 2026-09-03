#!/usr/bin/env python3
"""Lab 3.2 — Merkle tree

Convention (Bitcoin rule):
 - Leaf = sha256(tx bytes).
 - Parent = sha256(left + right) over raw digests.
 - Odd level: duplicate the last element.
"""
import hashlib

def H(b: bytes) -> bytes:
    return hashlib.sha256(b).digest()

def merkle_root(leaves: list[bytes]) -> bytes:
    """Build bottom-up, return the root digest."""
    if not leaves:
        return b""
    current_level = list(leaves)
    while len(current_level) > 1:
        # Odd level: duplicate the last element
        if len(current_level) % 2 != 0:
            current_level.append(current_level[-1])
        next_level = []
        for i in range(0, len(current_level), 2):
            parent = H(current_level[i] + current_level[i + 1])
            next_level.append(parent)
        current_level = next_level
    return current_level[0]

def merkle_proof(leaves: list[bytes], index: int) -> list[tuple[bytes, bool]]:
    """Return the sibling path from leaf `index` up to the root."""
    proof = []
    current_level = list(leaves)
    idx = index

    while len(current_level) > 1:
        # Odd level: duplicate the last element
        if len(current_level) % 2 != 0:
            current_level.append(current_level[-1])

        # Find sibling
        if idx % 2 == 0:
            # We are the left node -> sibling is on the right
            sibling = current_level[idx + 1]
            sibling_is_left = False
        else:
            # We are the right node -> sibling is on the left
            sibling = current_level[idx - 1]
            sibling_is_left = True

        proof.append((sibling, sibling_is_left))

        # Compute next level to move up to parent
        next_level = []
        for i in range(0, len(current_level), 2):
            next_level.append(H(current_level[i] + current_level[i + 1]))
        current_level = next_level
        idx //= 2

    return proof

def verify_proof(leaf_hash: bytes, proof: list[tuple[bytes, bool]], root: bytes) -> bool:
    """Recompute upward and compare."""
    current = leaf_hash
    for sibling, sibling_is_left in proof:
        if sibling_is_left:
            current = H(sibling + current)
        else:
            current = H(current + sibling)
    return current == root

# ------------------------------------------------------------------ checks
if __name__ == "__main__":
    txs = [f"tx{i}: A->B {i} coin".encode() for i in range(8)]
    leaves = [H(t) for t in txs]
    root = merkle_root(leaves)

    print("root:", root.hex())

    # CHECK 1: Valid proof for every leaf
    ok = all(verify_proof(leaves[i], merkle_proof(leaves, i), root) for i in range(8))
    print("CHECK 1 (all 8 proofs valid):", "OK" if ok else "FAIL")

    # CHECK 2: Proof has exactly log2(8)=3 elements
    print("CHECK 2 (proof length == 3):", "OK" if len(merkle_proof(leaves, 4)) == 3 else "FAIL")

    # CHECK 3: A tampered leaf must fail
    fake = H(b"tx4: A->B 999999 coin")
    print("CHECK 3 (tampered leaf fails):",
          "OK" if not verify_proof(fake, merkle_proof(leaves, 4), root) else "FAIL")

    # CHECK 4: Odd leaf count (7) still works
    l7 = leaves[:7]
    r7 = merkle_root(l7)
    print("CHECK 4 (odd count works):",
          "OK" if all(verify_proof(l7[i], merkle_proof(l7, i), r7) for i in range(7)) else "FAIL")