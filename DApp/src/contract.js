// ============================================================================
// CẬP NHẬT 2 THÔNG SỐ NÀY SAU KHI DEPLOY TRÊN REMIX IDE (MẠNG SEPOLIA):
// ============================================================================
export const CONTRACT_ADDRESS = "0xBB5A744C232A50ad05326d9D3bb18f6f5D0d1B50";
export const DEPLOYMENT_BLOCK = 12146776; // Điền số Block lúc deploy trên Sepolia Etherscan

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export const CONTRACT_ABI = [
    {
        inputs: [],
        stateMutability: "nonpayable",
        type: "constructor"
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "customer", type: "address" },
            { indexed: false, internalType: "uint256", name: "cashbackAmount", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "remainingPoolBalance", type: "uint256" }
        ],
        name: "CashbackClaimed",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "sender", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "newPoolBalance", type: "uint256" }
        ],
        name: "CashbackFunded",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "merchant", type: "address" },
            { indexed: true, internalType: "address", name: "customer", type: "address" },
            { indexed: false, internalType: "uint256", name: "purchaseAmount", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "cashbackAmount", type: "uint256" }
        ],
        name: "PurchaseRecorded",
        type: "event"
    },
    {
        inputs: [],
        name: "CASHBACK_RATE",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "MAX_CASHBACK",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "claimCashback",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [],
        name: "fundCashback",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [{ internalType: "address", name: "customer", type: "address" }],
        name: "getCustomerRecord",
        outputs: [
            { internalType: "uint256", name: "purchaseAmount", type: "uint256" },
            { internalType: "uint256", name: "cashbackAmount", type: "uint256" },
            { internalType: "bool", name: "claimed", type: "bool" }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "getMyCashback",
        outputs: [
            { internalType: "uint256", name: "purchaseAmount", type: "uint256" },
            { internalType: "uint256", name: "cashbackAmount", type: "uint256" },
            { internalType: "bool", name: "claimed", type: "bool" }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "merchant",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            { internalType: "address", name: "customer", type: "address" },
            { internalType: "uint256", name: "purchaseAmount", type: "uint256" }
        ],
        name: "recordPurchase",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        stateMutability: "payable",
        type: "receive"
    }
];
