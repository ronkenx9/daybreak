// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC4626 is IERC20 {
    function asset() external view returns (address);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function convertToAssets(uint256 shares) external view returns (uint256);
}

/// @title Daybreak Conviction Vault
/// @notice Public conviction theses on xStocks tokenized equities on X Layer. Anyone opens a
/// thesis on a supported stock; backers lock that real stock behind it until the thesis
/// expires, then withdraw exactly what they locked. There is no payout, no settlement and no
/// admin: the contract cannot move anyone's stock and nobody can change its rules.
/// @dev Rebasing xStocks are wrapped into their issuer's non-rebasing ERC-4626 wrapper on
/// deposit, so corporate-action rebases accrue to the backer and never break accounting.
contract DaybreakConvictionVault {
    struct Thesis {
        address creator;
        address wrapper; // ERC-4626 wrapper of the xStock, e.g. wNVDAx
        uint64 createdAt;
        uint64 expiresAt; // positions unlock at this time
        bool bullish;
        uint256 totalShares; // wrapper shares locked across all backers
        uint32 backers;
        string uri; // off-chain thesis text, e.g. the Daybreak thesis URL
    }

    uint64 public constant MIN_DURATION = 1 hours;
    uint64 public constant MAX_DURATION = 366 days;
    uint256 public constant MAX_URI_BYTES = 256;

    /// @notice ERC-4626 wrapper => its underlying xStock. Fixed at deployment.
    mapping(address => address) public stockOf;
    address[] private _wrappers;

    Thesis[] private _theses;
    /// @notice thesisId => backer => wrapper shares locked.
    mapping(uint256 => mapping(address => uint256)) public sharesOf;

    uint256 private _lock = 1;

    event StockListed(address indexed wrapper, address indexed stock);
    event ThesisOpened(uint256 indexed thesisId, address indexed creator, address indexed wrapper, bool bullish, uint64 expiresAt, string uri);
    event Backed(uint256 indexed thesisId, address indexed backer, uint256 shares, uint256 stockAmount, bool wrapped);
    event Withdrawn(uint256 indexed thesisId, address indexed backer, uint256 shares, uint256 stockAmount, bool unwrapped);

    error UnsupportedStock();
    error BadDuration();
    error BadUri();
    error UnknownThesis();
    error ThesisExpired();
    error StillLocked();
    error NothingToWithdraw();
    error ZeroAmount();
    error TransferFailed();
    error Reentrancy();

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    /// @param wrappers issuer ERC-4626 wrappers to support; each one's asset() is the xStock.
    constructor(address[] memory wrappers) {
        for (uint256 i = 0; i < wrappers.length; i++) {
            address wrapper = wrappers[i];
            address stock = IERC4626(wrapper).asset();
            if (stock == address(0) || stockOf[wrapper] != address(0)) revert UnsupportedStock();
            stockOf[wrapper] = stock;
            _wrappers.push(wrapper);
            emit StockListed(wrapper, stock);
        }
    }

    // ---------------------------------------------------------------- theses

    function openThesis(address wrapper, bool bullish, uint64 duration, string calldata uri) external returns (uint256 thesisId) {
        if (stockOf[wrapper] == address(0)) revert UnsupportedStock();
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert BadDuration();
        if (bytes(uri).length == 0 || bytes(uri).length > MAX_URI_BYTES) revert BadUri();
        thesisId = _theses.length;
        uint64 expiresAt = uint64(block.timestamp) + duration;
        _theses.push(Thesis(msg.sender, wrapper, uint64(block.timestamp), expiresAt, bullish, 0, 0, uri));
        emit ThesisOpened(thesisId, msg.sender, wrapper, bullish, expiresAt, uri);
    }

    // ---------------------------------------------------------------- backing

    /// @notice Lock xStock (e.g. NVDAx) behind a thesis. Approve this vault for `amount` first.
    function back(uint256 thesisId, uint256 amount) external nonReentrant returns (uint256 shares) {
        Thesis storage t = _open(thesisId);
        if (amount == 0) revert ZeroAmount();
        IERC4626 wrapper = IERC4626(t.wrapper);
        IERC20 stock = IERC20(stockOf[t.wrapper]);
        uint256 before = stock.balanceOf(address(this));
        _pull(stock, amount);
        uint256 received = stock.balanceOf(address(this)) - before;
        _approve(stock, address(wrapper), received);
        uint256 beforeShares = wrapper.balanceOf(address(this));
        wrapper.deposit(received, address(this));
        shares = wrapper.balanceOf(address(this)) - beforeShares;
        _record(thesisId, t, shares);
        emit Backed(thesisId, msg.sender, shares, received, true);
    }

    /// @notice Lock an already-wrapped xStock (e.g. wNVDAx) behind a thesis.
    function backWrapped(uint256 thesisId, uint256 shares) external nonReentrant returns (uint256 received) {
        Thesis storage t = _open(thesisId);
        if (shares == 0) revert ZeroAmount();
        IERC20 wrapper = IERC20(t.wrapper);
        uint256 before = wrapper.balanceOf(address(this));
        _pull(wrapper, shares);
        received = wrapper.balanceOf(address(this)) - before;
        _record(thesisId, t, received);
        emit Backed(thesisId, msg.sender, received, IERC4626(t.wrapper).convertToAssets(received), false);
    }

    /// @notice After expiry, withdraw your locked position. `unwrap` returns the xStock itself.
    function withdraw(uint256 thesisId, bool unwrap) external nonReentrant returns (uint256 amount) {
        Thesis storage t = _thesis(thesisId);
        if (block.timestamp < t.expiresAt) revert StillLocked();
        uint256 shares = sharesOf[thesisId][msg.sender];
        if (shares == 0) revert NothingToWithdraw();
        sharesOf[thesisId][msg.sender] = 0;
        t.totalShares -= shares;
        if (unwrap) {
            amount = IERC4626(t.wrapper).redeem(shares, msg.sender, address(this));
        } else {
            amount = shares;
            if (!_call(t.wrapper, abi.encodeCall(IERC20.transfer, (msg.sender, shares)))) revert TransferFailed();
        }
        emit Withdrawn(thesisId, msg.sender, shares, unwrap ? amount : IERC4626(t.wrapper).convertToAssets(shares), unwrap);
    }

    // ---------------------------------------------------------------- views

    function thesisCount() external view returns (uint256) { return _theses.length; }

    function getThesis(uint256 thesisId) external view returns (Thesis memory) { return _thesis(thesisId); }

    /// @notice Locked stock behind a thesis, in xStock units at the current wrapper rate.
    function lockedStock(uint256 thesisId) external view returns (uint256) {
        Thesis storage t = _thesis(thesisId);
        return IERC4626(t.wrapper).convertToAssets(t.totalShares);
    }

    function supportedWrappers() external view returns (address[] memory) { return _wrappers; }

    // ---------------------------------------------------------------- internals

    function _thesis(uint256 thesisId) private view returns (Thesis storage) {
        if (thesisId >= _theses.length) revert UnknownThesis();
        return _theses[thesisId];
    }

    function _open(uint256 thesisId) private view returns (Thesis storage t) {
        t = _thesis(thesisId);
        if (block.timestamp >= t.expiresAt) revert ThesisExpired();
    }

    function _record(uint256 thesisId, Thesis storage t, uint256 shares) private {
        if (shares == 0) revert ZeroAmount();
        if (sharesOf[thesisId][msg.sender] == 0) t.backers += 1;
        sharesOf[thesisId][msg.sender] += shares;
        t.totalShares += shares;
    }

    function _pull(IERC20 token, uint256 amount) private {
        if (!_call(address(token), abi.encodeCall(IERC20.transferFrom, (msg.sender, address(this), amount)))) revert TransferFailed();
    }

    function _approve(IERC20 token, address spender, uint256 amount) private {
        if (!_call(address(token), abi.encodeCall(IERC20.approve, (spender, amount)))) revert TransferFailed();
    }

    /// @dev Tolerates tokens that return nothing; fails on revert or an explicit `false`.
    function _call(address token, bytes memory data) private returns (bool) {
        (bool ok, bytes memory ret) = token.call(data);
        return ok && token.code.length > 0 && (ret.length == 0 || abi.decode(ret, (bool)));
    }
}
