// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../lib/@uniswap/v3-periphery/contracts/libraries/Path.sol";
import "../../lib/@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol";

contract PathDecoder {
    using Path for bytes;

    function hasMultiplePools(bytes calldata path) public pure returns (bool) {
        return path.hasMultiplePools();
    }

    function getFirstPool(bytes calldata path) public pure returns (address, address, uint24) {
        return path.decodeFirstPool();
    }

    function getPool(address factory, address tokenA, address tokenB, uint24 fee) public pure returns (address) {
        return PoolAddress.computeAddress(factory, PoolAddress.getPoolKey(tokenA, tokenB, fee));
    }
}
