from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

w3 = Web3(Web3.HTTPProvider("https://l1testnet.trustkeys.network"))
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

# TODO: THAY THẾ CHUỖI NÀY BẰNG TRANSACTION HASH GIAO DỊCH CỦA BẠN TRONG METAMASK
h = "0xf854ed6e3c595c578f2db4516c6c9b29c2c18fcf416cb69f223a68266d12673b"

try:
    rcpt = w3.eth.get_transaction_receipt(h)
    tx = w3.eth.get_transaction(h)
    blk = w3.eth.get_block(rcpt["blockNumber"])

    base_fee = blk["baseFeePerGas"]
    gas_used = rcpt["gasUsed"]
    eff_price = rcpt["effectiveGasPrice"]

    paid = gas_used * eff_price
    burned = gas_used * base_fee
    tip = gas_used * (eff_price - base_fee)

    print(f"baseFee = {base_fee} wei")
    print(f"effectiveGasPrice = {eff_price} wei\n")
    
    print(f"paid   = {paid} wei")
    print(f"burned = {burned} wei (roi luu thong)")
    print(f"tip    = {tip} wei (ve proposer)")
    print("\ninvariant OK: paid == burned + tip =>", paid == burned + tip)
except Exception as e:
    print(f"Error: {e}\nVui long nhap dung transaction hash cua ban.")
