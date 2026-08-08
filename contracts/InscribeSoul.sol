// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title InscribeSoul
 * @notice Minimalist, event-based permanent blockchain timestamp contract.
 * @dev Stores no large arrays or content strings on-chain to maximize gas efficiency and immutability.
 * Schema: INSCRIBESOUL_V1
 */
contract InscribeSoul {
    string public constant PROTOCOL_VERSION = "INSCRIBESOUL_V1";

    bytes32 public constant PUBLIC_DOMAIN = keccak256(bytes("INSCRIBESOUL_PUBLIC_V1"));
    bytes32 public constant PRIVATE_DOMAIN = keccak256(bytes("INSCRIBESOUL_PRIVATE_V1"));

    uint256 public constant MAX_PROTOCOL_FEE = 0.1 ether;

    address public owner;
    uint256 public protocolFee;

    event PublicInscription(
        address indexed author,
        bytes32 indexed proofHash,
        string content,
        uint256 timestamp
    );

    event PrivateProof(
        address indexed author,
        bytes32 indexed commitmentHash,
        uint256 timestamp
    );

    event FeeUpdated(uint256 newFee);
    event FeesWithdrawn(address indexed recipient, uint256 amount);

    error InsufficientFee(uint256 required, uint256 provided);
    error InvalidCommitmentHash();
    error EmptyContent();
    error FeeExceedsMaximum(uint256 requested, uint256 maximum);
    error Unauthorized();
    error WithdrawFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(uint256 initialFee) {
        if (initialFee > MAX_PROTOCOL_FEE) revert FeeExceedsMaximum(initialFee, MAX_PROTOCOL_FEE);
        owner = msg.sender;
        protocolFee = initialFee;
    }

    /**
     * @notice Records a public inscription where the proofHash is computed on-chain.
     * @dev Calculates proofHash = keccak256(abi.encode(PUBLIC_DOMAIN, msg.sender, content))
     * @param content The original raw string content
     */
    function inscribePublic(string calldata content) external payable {
        if (msg.value < protocolFee) revert InsufficientFee(protocolFee, msg.value);
        if (bytes(content).length == 0) revert EmptyContent();

        bytes32 proofHash = keccak256(
            abi.encode(
                PUBLIC_DOMAIN,
                msg.sender,
                content
            )
        );

        emit PublicInscription(msg.sender, proofHash, content, block.timestamp);
    }

    /**
     * @notice Records a private proof where ONLY the client-computed commitmentHash is emitted.
     * @dev Commitment hash is keccak256(abi.encode(PRIVATE_DOMAIN, msg.sender, secret, content))
     * @param commitmentHash 32-byte cryptographic commitment hash
     */
    function inscribeProof(bytes32 commitmentHash) external payable {
        if (msg.value < protocolFee) revert InsufficientFee(protocolFee, msg.value);
        if (commitmentHash == bytes32(0)) revert InvalidCommitmentHash();

        emit PrivateProof(msg.sender, commitmentHash, block.timestamp);
    }

    /**
     * @notice Allows contract owner to update protocol fee with a hard cap.
     */
    function setProtocolFee(uint256 newFee) external onlyOwner {
        if (newFee > MAX_PROTOCOL_FEE) revert FeeExceedsMaximum(newFee, MAX_PROTOCOL_FEE);
        protocolFee = newFee;
        emit FeeUpdated(newFee);
    }

    /**
     * @notice Allows contract owner to withdraw collected protocol fees.
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) return;
        (bool success, ) = payable(owner).call{value: balance}("");
        if (!success) revert WithdrawFailed();
        emit FeesWithdrawn(owner, balance);
    }
}
