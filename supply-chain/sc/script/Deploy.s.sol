// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {SupplyChain} from "../src/SupplyChain.sol";

contract DeploySupplyChain is Script {
    function run() public returns (SupplyChain) {
        // Start broadcasting transactions
        vm.startBroadcast();

        // Deploy the contract
        SupplyChain supplyChain = new SupplyChain();

        // Stop broadcasting transactions
        vm.stopBroadcast();

        return supplyChain;
    }
}