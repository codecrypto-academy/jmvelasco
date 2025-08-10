import { JsonRpcProvider, Wallet, formatEther, parseEther } from "ethers";
import fs from "fs";
import path from "path";
import { removeBlockchain } from "../removeBlockchain";
import { startBlockchain } from "../startBlockchain";

import {
    BOOTNODE_IP,
    BOOTNODE_NAME,
    BOOTNODE_PORT,
    NETWORK_GATEWAY,
    NETWORK_NAME,
    NETWORK_SUBNET,
    RPC_PORT_NODE_LIST,
    SIGNERNODE_IP,
    SIGNERNODE_NAME,
    SIGNERNODE_PORT
} from "../constants";
import { generateIpAddress } from "../services/generateIpAddress";

const getProvider = (port: number) => {
    return new JsonRpcProvider(`http://localhost:${port}`);
};

const getSigner = (privateKey: string, provider: JsonRpcProvider) => {
    return new Wallet(privateKey, provider);
};

const checkAccountBalance = async (provider: JsonRpcProvider, address: string, nodeName: string) => {
    const balance = await provider.getBalance(address);
    console.log(`Balance of ${address} on ${nodeName}: ${formatEther(balance)} ETH`);
    return balance;
};

const getBlockNumber = async (provider: JsonRpcProvider, nodeName: string) => {
    const blockNumber = await provider.getBlockNumber();
    console.log(`Current block number on ${nodeName}: ${blockNumber}`);
    return blockNumber;
};

const sendTransaction = async (
    signer: Wallet,
    toAddress: string,
    amount: string,
    nodeName: string
) => {
    console.log(`Attempting to send ${amount} ETH from ${signer.address} to ${toAddress} on ${nodeName}...`);

    // Get current network state for better transaction configuration
    const provider = signer.provider as JsonRpcProvider;
    if (!provider) {
        throw new Error('Provider is not available');
    }
    const nonce = await provider.getTransactionCount(signer.address, 'pending');
    // Use a higher gas price for PoA networks - many require minimum 20 Gwei
    const suggestedGasPrice = parseEther("0.000000020"); // 20 Gwei - higher for PoA reliability

    console.log(`Transaction details: nonce=${nonce}, gasPrice=${suggestedGasPrice.toString()}, gasLimit=21000`);

    const tx = {
        to: toAddress,
        value: parseEther(amount),
        gasLimit: 21000,
        gasPrice: suggestedGasPrice,
        nonce: nonce,
        type: 0 // Use legacy transaction type for better compatibility
    };

    const response = await signer.sendTransaction(tx);
    console.log(`Transaction submitted. Hash: ${response.hash}`);
    console.log(`Waiting for confirmation...`);

    try {
        const receipt = await response.wait(1, 60000); // Increased to 60 seconds
        console.log(`Transaction successful on ${nodeName}. Tx Hash: ${response.hash}`);
        if (receipt) {
            console.log(`Block number: ${receipt.blockNumber}, Gas used: ${receipt.gasUsed}`);
        }
        return response;
    } catch (error) {
        console.error(`Transaction failed to be mined:`, error);
        // Check if transaction is still pending
        try {
            const pendingTx = await provider.getTransaction(response.hash);
            if (pendingTx) {
                console.log(`Transaction is still pending in mempool`);
            } else {
                console.log(`Transaction not found in mempool`);
            }
        } catch (e) {
            console.log(`Could not check transaction status`);
        }
        throw error;
    }
};

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    try {

        await startBlockchain({
                network: {
                    name: NETWORK_NAME,
                    subnet: NETWORK_SUBNET,
                    gateway: NETWORK_GATEWAY,
                },
                bootnode: {
                    ip: BOOTNODE_IP,
                    name: BOOTNODE_NAME,
                    hostPort: BOOTNODE_PORT,
                },
                signer: {
                    ip: SIGNERNODE_IP,
                    name: SIGNERNODE_NAME,
                    hostPort: SIGNERNODE_PORT,
                },
                rpcNodes: RPC_PORT_NODE_LIST.map((port, index) => ({
                    ip: `${generateIpAddress(NETWORK_SUBNET, index)}`,
                    name: `rpc-node-${index + 1}`,
                    hostPort: port,
                })),
            });
        console.log("\n");
        console.log("➡️ La red blockchain se está inicializando...");
        await sleep(30000); // Pausa la ejecución por 10 segundos (10000 milisegundos)

        const blockchainDataPath = path.join(process.cwd(), NETWORK_NAME); // Assuming blockchain-manager is the network name

        // --- Configuration and Initialization ---
        const rpcNodeProviders = RPC_PORT_NODE_LIST.map(port => {
            return getProvider(port + 1000);
        });

        const minernodeAddress = fs.readFileSync(path.join(blockchainDataPath, "signer", "keys", "address"), { encoding: 'utf-8' });
        const minernodePrivateKey = fs.readFileSync(path.join(blockchainDataPath, "signer", "keys", "key.priv"), { encoding: 'utf-8' });
        // Use RPC node provider - signer node may have RPC disabled for security
        const minernodeSigner = getSigner(minernodePrivateKey, rpcNodeProviders[0]);

        // --- Validation Steps ---
        console.log("\n");
        console.log("➡️ Checking Account Balances");
        await checkAccountBalance(rpcNodeProviders[1], `0x${minernodeAddress}`, "Signer Node");

        // Example: Check balance of a dummy RPC node address (replace with actual RPC node address if needed)
        // For simplicity, we'll check the miner's balance again on an RPC node, assuming all nodes can access the same state.
        if (rpcNodeProviders.length > 0) {
            await checkAccountBalance(rpcNodeProviders[0], `0x${minernodeAddress}`, `RPC Node ${RPC_PORT_NODE_LIST[0]}`);
        } else {
            console.warn("⚠️ No RPC nodes configured to check balances.");
        }

        console.log("\n");
        console.log("➡️ Checking Node Synchronization");
        const blockNumberChecker = await getBlockNumber(rpcNodeProviders[0], "Block number reference");

        for (const [index, rpcProvider] of rpcNodeProviders.entries()) {
            const rpcBlockNumber = await getBlockNumber(rpcProvider, `RPC Node ${RPC_PORT_NODE_LIST[index]}`);
            console.log(`➡️ RPC Node ${RPC_PORT_NODE_LIST[index]} block number: ${rpcBlockNumber}`);

            if (rpcBlockNumber === blockNumberChecker || rpcBlockNumber + 1 === blockNumberChecker) {
                console.log(`✅ RPC Node ${RPC_PORT_NODE_LIST[index]} is synchronized.`);
            } else {
                console.warn(`⚠️ RPC Node ${RPC_PORT_NODE_LIST[index]} is NOT synchronized.`);
            }
        }

        console.log("\n");
        console.log("➡️ Network Health Check");
        // Check if nodes are mining

        // Wait for a new block to ensure mining is active
        console.log("- Waiting for new block to confirm mining is active...");
        const currentBlock = await rpcNodeProviders[0].getBlockNumber();
        let newBlock = currentBlock;
        let attempts = 0;
        while (newBlock === currentBlock && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            newBlock = await rpcNodeProviders[0].getBlockNumber();
            attempts++;
        }

        if (newBlock > currentBlock) {
            console.log(`✅ Mining is active. New block: ${newBlock}`);
        } else {
            console.error("❌ Mining appears to be inactive!");
            return;
        }

        console.log("\n");
        console.log("➡️ Performing Transaction Test");
        if (rpcNodeProviders.length > 0) {
            const recipientAddress = Wallet.createRandom().address; // Generate a random address for the recipient
            const initialMinerBalance = await checkAccountBalance(rpcNodeProviders[0], minernodeSigner.address, "Signer Node (Pre-Tx)");
            const initialRecipientBalance = await checkAccountBalance(rpcNodeProviders[0], recipientAddress, "Recipient (Pre-Tx)");

            const amountToSend = "0.0001"; // Amount in ETH
            await sendTransaction(minernodeSigner, recipientAddress, amountToSend, "Signer Node");

            const finalMinerBalance = await checkAccountBalance(rpcNodeProviders[0], minernodeSigner.address, "Signer Node (Post-Tx)");
            const finalRecipientBalance = await checkAccountBalance(rpcNodeProviders[0], recipientAddress, "Recipient (Post-Tx)");

            if (finalMinerBalance < initialMinerBalance && finalRecipientBalance > initialRecipientBalance) {
                console.log("✅ Transaction successful: Balances updated as expected.");
            } else {
                console.error("❌ Transaction failed: Balances did NOT update as expected.");
            }

        } else {
            console.warn(" ❌Cannot perform transaction test: No RPC nodes available.");
        }

        console.log("\n");
        removeBlockchain();
        if (fs.existsSync(blockchainDataPath)) {
            try {
                fs.rmSync(blockchainDataPath, { recursive: true, force: true });
                if (fs.existsSync(blockchainDataPath)) {
                    console.error(`❌ Failed to remove blockchain data at: ${blockchainDataPath}`);
                } else {
                    console.log(`✅ Successfully removed blockchain`);
                }
            } catch (err) {
                console.error(`❌ Error removing blockchain data at ${blockchainDataPath}:`, err);
            }
        }

    } catch (error) {
        console.error("❌ Network validation failed:", error);
        removeBlockchain();
    }
})(); 