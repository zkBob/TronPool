// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IOperatorManager {
    function isOperator(address _addr) external view returns (bool);

    function isOperatorFeeReceiver(address _operator, address _addr) external view returns (bool);

    function operatorURI() external view returns (string memory);
}
