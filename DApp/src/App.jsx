import { useState, useEffect, useCallback, useMemo } from "react";
import { Web3 } from "web3";
import {
    CONTRACT_ADDRESS,
    DEPLOYMENT_BLOCK,
    CONTRACT_ABI,
    SEPOLIA_CHAIN_ID,
    SEPOLIA_CHAIN_ID_HEX
} from "./contract";
import "./style.css";

// Ham boc tach thong bao loi Revert tu Smart Contract / MetaMask RPC
function parseWeb3Error(err) {
    if (!err) return "Đã xảy ra lỗi không xác định.";
    const raw =
        err?.cause?.message ||
        err?.data?.message ||
        err?.innerError?.message ||
        err?.message ||
        String(err);

    if (raw.includes("User denied transaction signature")) {
        return "Người dùng đã từ chối xác nhận giao dịch trên ví MetaMask (User Rejected).";
    }

    // Loc cau thong bao nam trong require("...") cua Solidity
    const revertMatch =
        raw.match(/execution reverted:\s*([^"\n,]+)/i) ||
        raw.match(/reverted with reason string\s*'([^']+)'/i);

    if (revertMatch && revertMatch[1]) {
        return `Smart Contract Revert: "${revertMatch[1].trim()}"`;
    }
    return raw;
}

function App() {
    const [web3, setWeb3] = useState(null);
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState("");
    const [chainId, setChainId] = useState(null);
    const [merchantAddress, setMerchantAddress] = useState("");

    // State cho 4 Summary Cards
    const [poolBalance, setPoolBalance] = useState("0");
    const [myPurchase, setMyPurchase] = useState("0");
    const [myCashback, setMyCashback] = useState("0");
    const [isClaimed, setIsClaimed] = useState(false);

    // Inputs cho 3 chuc nang chinh
    const [fundAmount, setFundAmount] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [purchaseAmount, setPurchaseAmount] = useState("");

    // Box tra cuu nhanh danh cho Merchant
    const [lookupAddress, setLookupAddress] = useState("");
    const [lookupResult, setLookupResult] = useState(null);

    // Che do cho phep gui thang giao dich loi xuong Smart Contract de chup anh Test Case
    const [bypassUiValidation, setBypassUiValidation] = useState(false);

    // Trang thai xu ly giao dich & Receipt
    const [isProcessing, setIsProcessing] = useState(false);
    const [pendingTxHash, setPendingTxHash] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [latestTx, setLatestTx] = useState(null);
    const [eventHistory, setEventHistory] = useState([]);

    const isSepolia = Number(chainId) === SEPOLIA_CHAIN_ID;
    const isMerchant =
        account &&
        merchantAddress &&
        account.toLowerCase() === merchantAddress.toLowerCase();

    // Tinh nham Live Preview tien hoan 5% (ap tran 0.02 ETH) ngay khi go phim
    const cashbackPreview = useMemo(() => {
        const num = Number(purchaseAmount);
        if (!purchaseAmount || isNaN(num) || num <= 0) return null;
        const rawFivePercent = num * 0.05;
        const isCapped = rawFivePercent > 0.02;
        const finalCashback = isCapped ? 0.02 : rawFivePercent;
        return {
            raw: rawFivePercent.toFixed(4),
            final: finalCashback.toFixed(4),
            isCapped
        };
    }, [purchaseAmount]);

    // Ham lam moi toan bo du lieu Blockchain (Summary Cards + Past Events)
    const refreshBlockchainState = useCallback(
        async (web3Instance, contractInstance, currentAccount) => {
            const w3 = web3Instance || web3;
            const ctr = contractInstance || contract;
            const acc = currentAccount || account;

            if (!w3 || !ctr || !acc) return;

            try {
                const currentChainId = await w3.eth.getChainId();
                setChainId(Number(currentChainId));
                if (Number(currentChainId) !== SEPOLIA_CHAIN_ID) return;

                // 1. Doc thong tin hop dong & getMyCashback() bang .call({ from: account })
                const [merchantAddr, rawPoolBalance, myData] = await Promise.all([
                    ctr.methods.merchant().call({ from: acc }),
                    w3.eth.getBalance(CONTRACT_ADDRESS),
                    ctr.methods.getMyCashback().call({ from: acc })
                ]);

                setMerchantAddress(merchantAddr);
                setPoolBalance(w3.utils.fromWei(rawPoolBalance, "ether"));
                setMyPurchase(w3.utils.fromWei(myData.purchaseAmount, "ether"));
                setMyCashback(w3.utils.fromWei(myData.cashbackAmount, "ether"));
                setIsClaimed(Boolean(myData.claimed));

                // 2. Doc lich su su kien tu DEPLOYMENT_BLOCK den "latest"
                const [fundedEvs, purchaseEvs, claimedEvs] = await Promise.all([
                    ctr.getPastEvents("CashbackFunded", {
                        fromBlock: DEPLOYMENT_BLOCK,
                        toBlock: "latest"
                    }),
                    ctr.getPastEvents("PurchaseRecorded", {
                        fromBlock: DEPLOYMENT_BLOCK,
                        toBlock: "latest"
                    }),
                    ctr.getPastEvents("CashbackClaimed", {
                        fromBlock: DEPLOYMENT_BLOCK,
                        toBlock: "latest"
                    })
                ]);

                const mergedEvents = [
                    ...fundedEvs.map((e) => ({
                        type: "FUND POOL",
                        badgeClass: "ev-fund",
                        detail: `Nạp quỹ +${w3.utils.fromWei(e.returnValues.amount, "ether")} ETH`,
                        actor: e.returnValues.sender,
                        blockNumber: Number(e.blockNumber),
                        txHash: e.transactionHash
                    })),
                    ...purchaseEvs.map((e) => ({
                        type: "RECORD ORDER",
                        badgeClass: "ev-order",
                        detail: `Đơn mua: ${w3.utils.fromWei(e.returnValues.purchaseAmount, "ether")} ETH → Hoàn: ${w3.utils.fromWei(e.returnValues.cashbackAmount, "ether")} ETH`,
                        actor: e.returnValues.customer,
                        blockNumber: Number(e.blockNumber),
                        txHash: e.transactionHash
                    })),
                    ...claimedEvs.map((e) => ({
                        type: "CLAIM CASHBACK",
                        badgeClass: "ev-claim",
                        detail: `Rút hoàn tiền: ${w3.utils.fromWei(e.returnValues.cashbackAmount, "ether")} ETH`,
                        actor: e.returnValues.customer,
                        blockNumber: Number(e.blockNumber),
                        txHash: e.transactionHash
                    }))
                ].sort((a, b) => b.blockNumber - a.blockNumber);

                setEventHistory(mergedEvents);
            } catch (err) {
                console.error("Error reading state:", err);
                setErrorMessage(
                    "Không thể đọc dữ liệu từ hợp đồng. Hãy kiểm tra lại CONTRACT_ADDRESS trong src/contract.js và đảm bảo hợp đồng đã được deploy trên mạng Sepolia."
                );
            }
        },
        [web3, contract, account]
    );

    // Ket noi vi MetaMask qua eth_requestAccounts
    const connectWallet = async () => {
        setErrorMessage("");
        setStatusMessage("");

        if (!window.ethereum) {
            setErrorMessage("Không tìm thấy ví MetaMask! Vui lòng cài đặt tiện ích MetaMask.");
            return;
        }

        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            const w3 = new Web3(window.ethereum);
            const currentChain = await w3.eth.getChainId();
            const ctr = new w3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

            setWeb3(w3);
            setContract(ctr);
            setAccount(accounts[0]);
            setChainId(Number(currentChain));

            if (Number(currentChain) === SEPOLIA_CHAIN_ID) {
                await refreshBlockchainState(w3, ctr, accounts[0]);
                setStatusMessage("Đã kết nối ví MetaMask và đồng bộ dữ liệu Sepolia thành công!");
            }
        } catch (err) {
            setErrorMessage(parseWeb3Error(err));
        }
    };

    // Chuyen mang tu dong sang Sepolia
    const switchToSepolia = async () => {
        if (!window.ethereum) return;
        try {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }]
            });
        } catch (err) {
            setErrorMessage(parseWeb3Error(err));
        }
    };

    // Lang nghe su kien accountsChanged va chainChanged tren window.ethereum
    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = async (accounts) => {
            // Xoa du lieu cu ngay khi doi qua lai giua vi Cua hang va vi Khach hang
            setMyPurchase("0");
            setMyCashback("0");
            setIsClaimed(false);
            setLookupResult(null);
            setErrorMessage("");

            if (accounts.length === 0) {
                setAccount("");
                setStatusMessage("Đã ngắt kết nối ví MetaMask.");
            } else {
                const nextAccount = accounts[0];
                setAccount(nextAccount);
                setStatusMessage(`Đã chuyển sang ví ${nextAccount.slice(0, 8)}... Đang làm mới dữ liệu...`);
                if (web3 && contract) {
                    await refreshBlockchainState(web3, contract, nextAccount);
                }
            }
        };

        const handleChainChanged = async () => {
            setMyPurchase("0");
            setMyCashback("0");
            setIsClaimed(false);
            setErrorMessage("");

            if (web3 && account) {
                const updatedChainId = await web3.eth.getChainId();
                setChainId(Number(updatedChainId));
                if (Number(updatedChainId) === SEPOLIA_CHAIN_ID && contract) {
                    await refreshBlockchainState(web3, contract, account);
                    setStatusMessage("Đã chuyển về mạng Sepolia Testnet!");
                }
            } else {
                window.location.reload();
            }
        };

        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);

        return () => {
            if (window.ethereum.removeListener) {
                window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
                window.ethereum.removeListener("chainChanged", handleChainChanged);
            }
        };
    }, [web3, contract, account, refreshBlockchainState]);

    // 1. Goi ham fundCashback()
    const handleFundCashback = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setStatusMessage("");
        setPendingTxHash("");

        if (!bypassUiValidation && (!fundAmount || Number(fundAmount) <= 0)) {
            setErrorMessage("Lỗi kiểm tra dữ liệu: Số tiền ETH nạp quỹ phải lớn hơn 0 (Amount must be > 0)!");
            return;
        }

        try {
            setIsProcessing(true);
            setStatusMessage("Đang chờ xác nhận giao dịch fundCashback() trên ví MetaMask...");
            const safeAmount = !fundAmount || Number(fundAmount) <= 0 ? "0" : fundAmount;
            const valueInWei = web3.utils.toWei(safeAmount, "ether");

            const receipt = await contract.methods
                .fundCashback()
                .send({ from: account, value: valueInWei })
                .on("transactionHash", (hash) => {
                    setPendingTxHash(hash);
                    setStatusMessage("Giao dịch đã được broadcast lên mạng Sepolia! Đang chờ đóng block...");
                });

            setLatestTx({
                action: "fundCashback()",
                hash: receipt.transactionHash,
                blockNumber: Number(receipt.blockNumber),
                gasUsed: Number(receipt.gasUsed)
            });
            setStatusMessage(`Nạp thành công ${safeAmount} ETH vào quỹ hoàn tiền!`);
            setFundAmount("");
            await refreshBlockchainState();
        } catch (err) {
            setErrorMessage(parseWeb3Error(err));
        } finally {
            setIsProcessing(false);
        }
    };

    // 2. Goi ham recordPurchase(customer, purchaseAmount)
    const handleRecordPurchase = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setStatusMessage("");
        setPendingTxHash("");

        if (!web3.utils.isAddress(customerAddress)) {
            setErrorMessage("Lỗi kiểm tra dữ liệu: Địa chỉ ví khách hàng không đúng định dạng chuẩn Ethereum!");
            return;
        }

        if (!bypassUiValidation && (!purchaseAmount || Number(purchaseAmount) <= 0)) {
            setErrorMessage("Lỗi kiểm tra dữ liệu: Giá trị đơn hàng phải lớn hơn 0 ETH (Purchase amount must be > 0)!");
            return;
        }

        try {
            setIsProcessing(true);
            setStatusMessage("Đang chờ xác nhận giao dịch recordPurchase() trên ví MetaMask...");
            const safePurchase =
                !purchaseAmount || Number(purchaseAmount) <= 0 ? "0" : purchaseAmount;
            const amountInWei = web3.utils.toWei(safePurchase, "ether");

            const receipt = await contract.methods
                .recordPurchase(customerAddress, amountInWei)
                .send({ from: account })
                .on("transactionHash", (hash) => {
                    setPendingTxHash(hash);
                    setStatusMessage("Giao dịch recordPurchase đang chờ xác nhận trên Sepolia...");
                });

            setLatestTx({
                action: "recordPurchase()",
                hash: receipt.transactionHash,
                blockNumber: Number(receipt.blockNumber),
                gasUsed: Number(receipt.gasUsed)
            });
            setStatusMessage(`Đã ghi nhận đơn hàng ${safePurchase} ETH cho khách hàng ${customerAddress}!`);
            setPurchaseAmount("");
            await refreshBlockchainState();
        } catch (err) {
            setErrorMessage(parseWeb3Error(err));
        } finally {
            setIsProcessing(false);
        }
    };

    // 3. Goi ham claimCashback()
    const handleClaimCashback = async () => {
        setErrorMessage("");
        setStatusMessage("");
        setPendingTxHash("");

        try {
            setIsProcessing(true);
            setStatusMessage("Đang chờ xác nhận giao dịch claimCashback() trên ví MetaMask...");

            const receipt = await contract.methods
                .claimCashback()
                .send({ from: account })
                .on("transactionHash", (hash) => {
                    setPendingTxHash(hash);
                    setStatusMessage("Yêu cầu rút tiền hoàn đã gửi lên Sepolia! Đang chờ xác nhận...");
                });

            setLatestTx({
                action: "claimCashback()",
                hash: receipt.transactionHash,
                blockNumber: Number(receipt.blockNumber),
                gasUsed: Number(receipt.gasUsed)
            });
            setStatusMessage("Rút tiền hoàn (Cashback) về ví thành công!");
            await refreshBlockchainState();
        } catch (err) {
            setErrorMessage(parseWeb3Error(err));
        } finally {
            setIsProcessing(false);
        }
    };

    // Tra cuu nhanh thong tin bat ky vi khach hang nao
    const handleLookupCustomer = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        if (!web3 || !contract) return;
        if (!web3.utils.isAddress(lookupAddress)) {
            setErrorMessage("Địa chỉ ví cần tra cứu không hợp lệ!");
            return;
        }
        try {
            const data = await contract.methods
                .getCustomerRecord(lookupAddress)
                .call({ from: account });
            setLookupResult({
                address: lookupAddress,
                purchase: web3.utils.fromWei(data.purchaseAmount, "ether"),
                cashback: web3.utils.fromWei(data.cashbackAmount, "ether"),
                claimed: Boolean(data.claimed)
            });
        } catch (err) {
            setErrorMessage(parseWeb3Error(err));
        }
    };

    return (
        <div className="container">
            {/* HEADER */}
            <header className="header">
                <div>
                    <div className="title-row">
                        <h1>Merchant Cashback DApp</h1>
                        <span className="topic-tag">Đề 2 • Sepolia Testnet</span>
                    </div>
                    <p className="subtitle">
                        Hoàn tiền tự động <strong>5%</strong> giá trị đơn hàng bằng ETH • Áp trần tối đa{" "}
                        <strong>0.02 ETH / đơn</strong>
                    </p>
                </div>

                <div className="wallet-box">
                    {!account ? (
                        <button className="btn btn-primary" onClick={connectWallet}>
                            Kết nối Ví MetaMask
                        </button>
                    ) : (
                        <div className="connected-info">
                            <div className="role-row">
                                <span className={`badge ${isMerchant ? "badge-merchant" : "badge-customer"}`}>
                                    {isMerchant ? "CỬA HÀNG (MERCHANT)" : "KHÁCH HÀNG (CUSTOMER)"}
                                </span>
                                <span className={`badge ${isSepolia ? "badge-network-ok" : "badge-network-err"}`}>
                                    Chain ID: {chainId} {isSepolia ? "(Sepolia)" : "(Sai mạng!)"}
                                </span>
                            </div>
                            <p className="mono">
                                <strong>Ví hiện tại:</strong> {account}
                            </p>
                            <p className="mono">
                                <strong>Ví Merchant:</strong> {merchantAddress || "Đang tải..."}
                            </p>
                        </div>
                    )}
                </div>
            </header>

            {/* CANH BAO DO NEU KHONG PHAI MANG SEPOLIA (11155111) */}
            {account && !isSepolia && (
                <div className="alert alert-danger alert-flex">
                    <div>
                        <strong>CẢNH BÁO SAI MẠNG BLOCKCHAIN!</strong> DApp yêu cầu mạng{" "}
                        <strong>Sepolia Testnet (Chain ID: 11155111)</strong>. Mạng hiện tại của bạn có Chain ID là{" "}
                        <code>{chainId}</code>.
                    </div>
                    <button className="btn btn-danger-outline" onClick={switchToSepolia}>
                        Chuyển sang Sepolia ngay
                    </button>
                </div>
            )}

            {/* KHUNG HIEN THI LOI VA TRANG THAI */}
            {errorMessage && (
                <div className="alert alert-danger">
                    <strong>Thông báo lỗi / Chặn nghiệp vụ: </strong>
                    {errorMessage}
                </div>
            )}

            {statusMessage && (
                <div className="alert alert-info">
                    <strong>Trạng thái: </strong>
                    {statusMessage}
                    {pendingTxHash && (
                        <div className="mono" style={{ marginTop: "6px" }}>
                            Pending Tx:{" "}
                            <a
                                href={`https://sepolia.etherscan.io/tx/${pendingTxHash}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {pendingTxHash}
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* 4 THE THONG KE (SUMMARY CARDS) */}
            <section className="section">
                <div className="section-header">
                    <div>
                        <h2>Thống kê Dữ liệu Hợp đồng (Summary Cards)</h2>
                        <p className="hint">
                            Đọc trực tiếp từ hàm <code>getMyCashback().call(&#123; from: account &#125;)</code>
                        </p>
                    </div>
                    <button
                        className="btn btn-outline"
                        onClick={() => refreshBlockchainState()}
                        disabled={!account || isProcessing}
                    >
                        Refresh Blockchain State
                    </button>
                </div>

                <div className="cards-grid">
                    <div className="card">
                        <span className="card-label">1. Số tiền mua của ví hiện tại</span>
                        <strong className="card-value">{myPurchase} ETH</strong>
                        <span className="card-sub">Purchase Amount</span>
                    </div>

                    <div className="card">
                        <span className="card-label">2. Tiền hoàn dự kiến (5%, trần 0.02)</span>
                        <strong className="card-value highlight">{myCashback} ETH</strong>
                        <span className="card-sub">Expected Cashback</span>
                    </div>

                    <div className="card">
                        <span className="card-label">3. Trạng thái nhận hoàn tiền</span>
                        <strong
                            className={`card-value ${Number(myPurchase) === 0
                                    ? ""
                                    : isClaimed
                                        ? "text-success"
                                        : "text-warning"
                                }`}
                        >
                            {Number(myPurchase) === 0
                                ? "Chưa có đơn hàng"
                                : isClaimed
                                    ? "Đã nhận hoàn tiền"
                                    : "Chưa nhận (Sẵn sàng rút)"}
                        </strong>
                        <span className="card-sub">Claim Status (`claimed`: {String(isClaimed)})</span>
                    </div>

                    <div className="card">
                        <span className="card-label">4. Số dư quỹ Cashback hợp đồng</span>
                        <strong className="card-value">{poolBalance} ETH</strong>
                        <span className="card-sub">Contract Pool Balance</span>
                    </div>
                </div>
            </section>

            {/* THANH CONG CU HO TRO KIEM THU (TEST MODE TOGGLE) */}
            <div className="test-mode-bar">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={bypassUiValidation}
                        onChange={(e) => setBypassUiValidation(e.target.checked)}
                    />
                    <span>
                        <strong>Chế độ Test Revert On-Chain (TC08):</strong> Bỏ qua chặn lỗi số tiền{" "}
                        <code>&lt;= 0</code> ở Frontend để gửi thẳng vào Smart Contract và bắt lỗi Revert từ EVM.
                    </span>
                </label>
            </div>

            {/* 3 BANG CHUC NANG GHI GIAO DICH (WRITE STATE) */}
            <div className="actions-grid">
                {/* Panel 1: fundCashback */}
                <div className="panel">
                    <div className="panel-header">
                        <h3>1. Nạp Quỹ Thưởng</h3>
                        <code className="fn-tag">fundCashback()</code>
                    </div>
                    <p className="hint">
                        Hàm <code>payable</code> nạp Sepolia ETH vào hợp đồng để làm quỹ chi trả hoàn tiền.
                    </p>
                    <form onSubmit={handleFundCashback}>
                        <label>Số lượng ETH nạp vào quỹ:</label>
                        <input
                            type="number"
                            step="any"
                            placeholder="Ví dụ: 0.05"
                            value={fundAmount}
                            onChange={(e) => setFundAmount(e.target.value)}
                            disabled={isProcessing || !account || !isSepolia}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary full-width"
                            disabled={isProcessing || !account || !isSepolia}
                        >
                            {isProcessing ? "Đang chờ ví xác nhận..." : "Fund Cashback Pool"}
                        </button>
                    </form>
                </div>

                {/* Panel 2: recordPurchase */}
                <div className="panel">
                    <div className="panel-header">
                        <h3>2. Ghi Nhận Đơn Mua</h3>
                        <code className="fn-tag">recordPurchase()</code>
                    </div>
                    <p className="hint">
                        Chỉ ví <strong>Cửa hàng (Merchant)</strong> được phép gọi. Ví khách gọi sẽ bị Smart
                        Contract chặn (TC07).
                    </p>
                    <form onSubmit={handleRecordPurchase}>
                        <label>Địa chỉ ví Khách hàng (Customer Address):</label>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            disabled={isProcessing || !account || !isSepolia}
                        />

                        <label>Giá trị đơn mua (ETH):</label>
                        <input
                            type="number"
                            step="any"
                            placeholder="VD: 0.1 (Hoàn 0.005) hoặc 1.0 (Trần 0.02)"
                            value={purchaseAmount}
                            onChange={(e) => setPurchaseAmount(e.target.value)}
                            disabled={isProcessing || !account || !isSepolia}
                        />

                        {/* Hien thi Live Preview 5% & Tran 0.02 ETH */}
                        {cashbackPreview && (
                            <div className="preview-box">
                                <span>5% giá trị đơn: {cashbackPreview.raw} ETH</span>
                                <strong>
                                    Hoàn thực tế: {cashbackPreview.final} ETH{" "}
                                    {cashbackPreview.isCapped && "(Đã áp trần tối đa 0.02 ETH)"}
                                </strong>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary full-width"
                            disabled={isProcessing || !account || !isSepolia}
                        >
                            {isProcessing ? "Đang chờ ví xác nhận..." : "Record Purchase"}
                        </button>
                    </form>
                </div>

                {/* Panel 3: claimCashback */}
                <div className="panel">
                    <div className="panel-header">
                        <h3>3. Rút Tiền Hoàn Về Ví</h3>
                        <code className="fn-tag">claimCashback()</code>
                    </div>
                    <p className="hint">
                        Khách hàng rút tiền hoàn về ví. Áp dụng mẫu <strong>Checks-Effects-Interactions</strong>,
                        mỗi đơn chỉ nhận 1 lần (TC05, TC06).
                    </p>

                    <div className="claim-summary">
                        <div className="claim-row">
                            <span>Đơn hàng ghi nhận:</span>
                            <strong>{myPurchase} ETH</strong>
                        </div>
                        <div className="claim-row">
                            <span>Khoản hoàn được nhận:</span>
                            <strong className="highlight">{myCashback} ETH</strong>
                        </div>
                        <div className="claim-row">
                            <span>Trạng thái hiện tại:</span>
                            <strong>
                                {Number(myPurchase) === 0
                                    ? "Chưa có đơn"
                                    : isClaimed
                                        ? "Đã rút (Không thể rút lần 2)"
                                        : "Chưa rút (Khả dụng)"}
                            </strong>
                        </div>
                    </div>

                    <button
                        className="btn btn-success full-width"
                        onClick={handleClaimCashback}
                        disabled={isProcessing || !account || !isSepolia}
                    >
                        {isProcessing ? "Đang chờ ví xác nhận..." : "Claim My Cashback"}
                    </button>
                </div>
            </div>

            {/* KHUNG HIEN THI LATEST TRANSACTION RECEIPT */}
            {latestTx && (
                <section className="section receipt-box">
                    <div className="section-header">
                        <h3>Latest Transaction Receipt ({latestTx.action})</h3>
                        <span className="badge badge-customer">CONFIRMED ON SEPOLIA</span>
                    </div>
                    <div className="receipt-grid">
                        <div>
                            <span className="card-label">Transaction Hash:</span>
                            <p className="mono">
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${latestTx.hash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {latestTx.hash} ↗
                                </a>
                            </p>
                        </div>
                        <div>
                            <span className="card-label">Block Number:</span>
                            <p className="mono">
                                <strong>#{latestTx.blockNumber}</strong>
                            </p>
                        </div>
                        <div>
                            <span className="card-label">Gas Used:</span>
                            <p className="mono">
                                <strong>{latestTx.gasUsed.toLocaleString()} gas</strong>
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* CONG CU TRA CUU NHANH CHO CUA HANG */}
            <section className="section">
                <h3>Tra cứu nhanh Trạng thái Khách hàng (`getCustomerRecord`)</h3>
                <p className="hint" style={{ marginBottom: "12px" }}>
                    Giúp Cửa hàng kiểm tra ngay đơn vừa nhập cho Khách hàng mà không cần chuyển đổi ví trên
                    MetaMask.
                </p>
                <form className="lookup-form" onSubmit={handleLookupCustomer}>
                    <input
                        type="text"
                        placeholder="Nhập địa chỉ ví Khách hàng (0x...) để tra cứu..."
                        value={lookupAddress}
                        onChange={(e) => setLookupAddress(e.target.value)}
                        disabled={!account || !isSepolia}
                    />
                    <button type="submit" className="btn btn-outline" disabled={!account || !isSepolia}>
                        Tra cứu ví
                    </button>
                </form>
                {lookupResult && (
                    <div className="lookup-result mono">
                        <span>Ví: {lookupResult.address}</span> |{" "}
                        <span>Đơn mua: <strong>{lookupResult.purchase} ETH</strong></span> |{" "}
                        <span>Tiền hoàn: <strong>{lookupResult.cashback} ETH</strong></span> |{" "}
                        <span>Trạng thái: <strong>{lookupResult.claimed ? "Đã nhận" : "Chưa nhận"}</strong></span>
                    </div>
                )}
            </section>

            {/* BANG LICH SU SU KIEN TU GETPASTEVENTS */}
            <section className="section">
                <div className="section-header">
                    <div>
                        <h3>Lịch sử Giao dịch On-Chain (`contract.getPastEvents`)</h3>
                        <p className="hint">
                            Truy vấn từ <code>fromBlock: {DEPLOYMENT_BLOCK}</code> đến <code>"latest"</code>
                        </p>
                    </div>
                    <span className="badge">Tổng: {eventHistory.length} sự kiện</span>
                </div>

                {eventHistory.length === 0 ? (
                    <p className="hint">Chưa có sự kiện nào được ghi nhận trên hợp đồng này.</p>
                ) : (
                    <div className="table-wrapper">
                        <table className="events-table">
                            <thead>
                                <tr>
                                    <th>Sự kiện (Event)</th>
                                    <th>Chi tiết nghiệp vụ</th>
                                    <th>Địa chỉ ví</th>
                                    <th>Block</th>
                                    <th>Etherscan Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eventHistory.map((ev, index) => (
                                    <tr key={`${ev.txHash}-${index}`}>
                                        <td>
                                            <span className={`badge ${ev.badgeClass}`}>{ev.type}</span>
                                        </td>
                                        <td>{ev.detail}</td>
                                        <td className="mono">
                                            {ev.actor.slice(0, 8)}...{ev.actor.slice(-6)}
                                        </td>
                                        <td className="mono">#{ev.blockNumber}</td>
                                        <td className="mono">
                                            <a
                                                href={`https://sepolia.etherscan.io/tx/${ev.txHash}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {ev.txHash.slice(0, 12)}... ↗
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default App;