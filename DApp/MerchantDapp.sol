// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MerchantCashback (De 2)
 * @notice He thong hoan tien 5% gia tri don mua bang ETH, toi da 0.02 ETH moi don.
 */
contract MerchantCashback {
    address public immutable merchant;
    uint256 public constant CASHBACK_RATE = 5; // Hoan 5%
    uint256 public constant MAX_CASHBACK = 0.02 ether; // Tran toi da 0.02 ETH

    // Bien khoa chong tan cong Reentrancy ket hop cung Checks-Effects-Interactions
    bool private locked;

    struct CashbackRecord {
        uint256 purchaseAmount;
        uint256 cashbackAmount;
        bool claimed;
    }

    mapping(address => CashbackRecord) private customerRecords;

    // Events phuc vu doc lich su giao dich qua contract.getPastEvents
    event CashbackFunded(
        address indexed sender,
        uint256 amount,
        uint256 newPoolBalance
    );
    event PurchaseRecorded(
        address indexed merchant,
        address indexed customer,
        uint256 purchaseAmount,
        uint256 cashbackAmount
    );
    event CashbackClaimed(
        address indexed customer,
        uint256 cashbackAmount,
        uint256 remainingPoolBalance
    );

    modifier onlyMerchant() {
        require(msg.sender == merchant, "Only merchant can call this function");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        _;
        locked = false;
    }

    constructor() {
        merchant = msg.sender;
    }

    // 1. Ham payable de nap ETH vao quy thuong cua hop dong
    function fundCashback() public payable {
        require(msg.value > 0, "Fund amount must be greater than 0");
        emit CashbackFunded(msg.sender, msg.value, address(this).balance);
    }

    // 2. Chi cua hang (merchant) duoc goi; kiem tra so tien mua > 0;
    // Tu dong tinh hoan tien 5% va ap dung tran toi da 0.02 ether moi don.
    function recordPurchase(
        address customer,
        uint256 purchaseAmount
    ) external onlyMerchant {
        require(customer != address(0), "Invalid customer wallet address");
        require(purchaseAmount > 0, "Purchase amount must be greater than 0");

        // Dam bao khong ghi de lam mat khoan hoan tien chua rut cua don truoc
        require(
            customerRecords[customer].purchaseAmount == 0 ||
                customerRecords[customer].claimed,
            "Customer still has an unclaimed cashback order"
        );

        // Tinh 5% va ap tran 0.02 ether
        uint256 calculatedCashback = (purchaseAmount * CASHBACK_RATE) / 100;
        if (calculatedCashback > MAX_CASHBACK) {
            calculatedCashback = MAX_CASHBACK;
        }

        customerRecords[customer] = CashbackRecord({
            purchaseAmount: purchaseAmount,
            cashbackAmount: calculatedCashback,
            claimed: false
        });

        emit PurchaseRecorded(
            msg.sender,
            customer,
            purchaseAmount,
            calculatedCashback
        );
    }

    // 3. Khach hang goi de rut tien hoan ve vi (Checks-Effects-Interactions + nonReentrant)
    function claimCashback() external nonReentrant {
        CashbackRecord storage record = customerRecords[msg.sender];

        // [CHECKS]
        require(
            record.purchaseAmount > 0,
            "No purchase recorded for this wallet"
        );
        require(!record.claimed, "Cashback already claimed for this order");
        require(record.cashbackAmount > 0, "Cashback amount is zero");
        require(
            address(this).balance >= record.cashbackAmount,
            "Insufficient ETH in contract cashback pool"
        );

        // [EFFECTS] Cap nhat trang thai da nhan truoc khi chuyen ETH
        uint256 reward = record.cashbackAmount;
        record.claimed = true;

        // [INTERACTIONS] Chuyen ETH bang .call{value: ...}("")
        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "ETH transfer failed");

        emit CashbackClaimed(msg.sender, reward, address(this).balance);
    }

    // 4. Ham view tra ve bo thong so cua khach hang dang goi (.call({ from: account }))
    function getMyCashback()
        external
        view
        returns (
            uint256 purchaseAmount,
            uint256 cashbackAmount,
            bool claimed
        )
    {
        CashbackRecord memory record = customerRecords[msg.sender];
        return (record.purchaseAmount, record.cashbackAmount, record.claimed);
    }

    // Ham view bo sung: Ho tro Cua hang tra cuu trang thai don cua bat ky vi khach hang nao
    function getCustomerRecord(
        address customer
    )
        external
        view
        returns (
            uint256 purchaseAmount,
            uint256 cashbackAmount,
            bool claimed
        )
    {
        CashbackRecord memory record = customerRecords[customer];
        return (record.purchaseAmount, record.cashbackAmount, record.claimed);
    }

    // Cho phep nap quy truc tiep khi chuyen ETH vao dia chi hop dong
    receive() external payable {
        fundCashback();
    }
}