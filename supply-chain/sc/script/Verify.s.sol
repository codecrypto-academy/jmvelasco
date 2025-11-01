// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {SupplyChain} from "../src/SupplyChain.sol";

contract VerifyDeployment is Script {
    function run() public {
        // Address of our deployed contract
        address deployedContract = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
        
        // Create an instance of our contract
        SupplyChain supplyChain = SupplyChain(deployedContract);
        
        // Start broadcast for any state-changing calls
        vm.startBroadcast();
        
        // First, let's verify we're the admin
        address admin = supplyChain.admin();
        console2.log("Contract admin:", admin);
        console2.log("Our address:", msg.sender);

        // Get our user info to verify our status
        SupplyChain.User memory ourUser = supplyChain.getUserInfo(msg.sender);
        console2.log("Our role:", ourUser.role);
        console2.log("Our status:", uint256(ourUser.status));

        // Try to get all users to verify the addition
        SupplyChain.User[] memory users = supplyChain.getAllUsers();
        console2.log("Number of users:", users.length);
        
        // Log the first user's details
        if (users.length > 0) {
            console2.log("First user address:", users[0].userAddress);
            console2.log("First user role:", users[0].role);
            console2.log("First user status:", uint256(users[0].status));
        }
        
        vm.stopBroadcast();
    }
}