// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract Debugger {
    function call(address to, bytes calldata data) public returns (string memory result) {
        (, bytes memory returndata) = to.call(data);
        result = string(returndata);
    }
}
