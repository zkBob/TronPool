// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.8.0;

import "../../../lib/@openzeppelin/contracts/contracts/token/ERC20/IERC20.sol";

interface IAToken is IERC20 {
    // solhint-disable-next-line func-name-mixedcase
    function UNDERLYING_ASSET_ADDRESS() external returns (address);
}
