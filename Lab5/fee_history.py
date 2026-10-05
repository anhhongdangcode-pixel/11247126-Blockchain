from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

# Kết nối đến mạng TrustKeys L1
w3 = Web3(Web3.HTTPProvider("https://l1testnet.trustkeys.network"))
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

blk = w3.eth.get_block("latest")
print(f"Connected to TrustKeys L1 chainId=11968 head block={blk['number']}")
print("baseFeePerGas =", blk["baseFeePerGas"], "wei")

# Lấy lịch sử fee của 20 block gần nhất
fh = w3.eth.fee_history(20, "latest", [10, 50, 90])

print(f"\n{'block':<10} {'baseFee(wei)':<15} {'gasUsedRatio':<15}")
for i, base in enumerate(fh["baseFeePerGas"][:-1]):
    block_num = fh["oldestBlock"] + i
    gas_ratio = fh["gasUsedRatio"][i]
    print(f"{block_num:<10} {base:<15} {gas_ratio*100:.2f}%")

next_base = fh["baseFeePerGas"][-1]
print(f"\nnext block's projected baseFee = {next_base} wei")
