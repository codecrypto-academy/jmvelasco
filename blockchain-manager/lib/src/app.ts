import Docker from "dockerode";
import fs from "fs";
import path from "path";
import {
    BOOTNODE_IP,
    BOOTNODE_NAME,
    P2P_BOOTNODE_PORT,
    CHAIN_ID,
    MINERNODE_IP,
    MINERNODE_NAME,
    P2P_MINERNODE_PORT,
    NETWORK_GATEWAY,
    NETWORK_NAME,
    NETWORK_SUBNET,
    P2P_RPC_PORT,
    RPC_PORT_NODE_LIST,
} from "./constants";
// import { createBesuNodeConfigFile } from "./services/besuNodeConfigFile";
import { createCliqueGenesisFile } from "./services/cliqueGenesisFile";
import { createBesuNode } from "./services/createBesuNode";
import { createNodeIdentityFiles } from "./services/createNodeIdentityFiles";
import { BesuNodeConfig, BesuNodeType } from "./types";
import { generateIpAddress } from "./services/generateIpAddress";
import { initializeBlockchainNetwork } from "./services/initializeBlockchain";
import { createNodeConfigurationFiles } from "./services/generateTomlFile";

const docker = new Docker();

(async () => {
    try {

        const { blockchainDataPath, genesisFilePath, signer, bootnode } = await initializeBlockchainNetwork(
            docker,
            CHAIN_ID,
            {
                name: NETWORK_NAME,
                subnet: NETWORK_SUBNET,
                gateway: NETWORK_GATEWAY,
                bootnodeIp: BOOTNODE_IP,
            }
        );

        const signerNodeConfig = {
            name: MINERNODE_NAME,
            configPath: `${blockchainDataPath}/${MINERNODE_NAME}/config`,
            network: { name: NETWORK_NAME, ip: MINERNODE_IP },
            hostPort: P2P_MINERNODE_PORT,
            type: BesuNodeType.SIGNER,
            options: {
                minerEnabled: true,
                minerCoinbase: signer.address,
                minGasPrice: 0,
                bootnodes: bootnode ? bootnode.enode : '',
                dataPath: `${blockchainDataPath}/${MINERNODE_NAME}`,
                genesisPath: genesisFilePath,
                keyPath: `${blockchainDataPath}/${MINERNODE_NAME}/keys`,
                maxMemory: '4g',
                logLevel: 'INFO'
            }
        }

        const signerNodeConfigFiles = createNodeConfigurationFiles(signerNodeConfig, signer);
        await createBesuNode(docker, signerNodeConfig, signerNodeConfigFiles);

        if (bootnode) {
            const bootnodeNodeConfig = {
                name: BOOTNODE_NAME,
                configPath: `${blockchainDataPath}/${BOOTNODE_NAME}/config`,
                network: { name: NETWORK_NAME, ip: BOOTNODE_IP },
                hostPort: P2P_BOOTNODE_PORT,
                type: BesuNodeType.BOOTNODE,
                options: {
                    bootnodes: bootnode.enode,
                    dataPath: `${blockchainDataPath}/${BOOTNODE_NAME}`,
                    genesisPath: genesisFilePath,
                    keyPath: `${blockchainDataPath}/${BOOTNODE_NAME}/keys`,
                    maxMemory: '1g',
                    logLevel: 'INFO'
                }
            }
            const bootnodeNodeConfigFiles = createNodeConfigurationFiles(bootnodeNodeConfig, bootnode);
            await createBesuNode(docker, bootnodeNodeConfig, bootnodeNodeConfigFiles);

            if (RPC_PORT_NODE_LIST?.length > 0) {
                for (const [index, rpcNodePort] of RPC_PORT_NODE_LIST.entries()) {
                    const ip = generateIpAddress(NETWORK_SUBNET, index);
        
                    const rpcnodeConfig: BesuNodeConfig = {
                        name: `RPC_${rpcNodePort}_NODE`,
                        configPath: `${blockchainDataPath}/RPC_${rpcNodePort}_NODE/config`,
                        network: {
                            name: NETWORK_NAME,
                            ip
                        },
                        hostPort: rpcNodePort,
                        type: BesuNodeType.RPC,
                        options: {
                            minerEnabled: false,
                            bootnodes: bootnode.enode,
                            dataPath: `${blockchainDataPath}/RPC_${rpcNodePort}_NODE`,
                            genesisPath: genesisFilePath,
                            keyPath: `${blockchainDataPath}/RPC_${rpcNodePort}_NODE/keys`,
                            maxMemory: '6g',
                            logLevel: 'WARN'
                        }
                    };
                    const rpcNodeConfigFiles = createNodeConfigurationFiles(rpcnodeConfig, bootnode);
        
                    await createBesuNode(docker, rpcnodeConfig, rpcNodeConfigFiles);
                }
            }
            

        }


  



        // const bootnodeConfig: BesuNodeConfig = {
        //     name: BOOTNODE_NAME,
        //     network: {
        //         name: NETWORK_NAME,
        //         ip: BOOTNODE_IP
        //     },
        //     hostPort: BOOTNODE_PORT,
        //     type: BesuNodeType.BOOTNODE,

        // };
        // const bootnodeIdentityFiles = createNodeIdentityFiles(bootnodeConfig);

        // const minernodeConfig: BesuNodeConfig = {
        //     name: MINERNODE_NAME,
        //     network: {
        //         name: NETWORK_NAME,
        //         ip: MINERNODE_IP
        //     },
        //     hostPort: MINERNODE_PORT,
        //     type: BesuNodeType.MINER,
        // };
        // const minernodeIdentityFiles = createNodeIdentityFiles(minernodeConfig);

        // const validatorAddress = fs.readFileSync(path.join(blockchainDataPath, minernodeIdentityFiles.addressFile), { encoding: 'utf-8' });
        // createCliqueGenesisFile(blockchainDataPath, {
        //     chainId: CHAIN_ID,
        //     initialValidators: [`0x${validatorAddress}`],
        //     preAllocatedAccounts: [
        //         {
        //             address: `0x${validatorAddress}`,
        //             balance: '0xad78ebc5ac6200000'
        //         }
        //     ],
        // });

        // createBesuNodeConfigFile(blockchainDataPath);

        // await createBesuNode(docker, bootnodeConfig, bootnodeIdentityFiles);

        // const bootnodeEnode = fs.readFileSync(path.join(blockchainDataPath, bootnodeIdentityFiles.enodeFile), { encoding: 'utf-8' });
        // await createBesuNode(docker, {
        //     ...minernodeConfig,
        //     options: {
        //         minerEnabled: true,
        //         minerCoinbase: validatorAddress,
        //         minGasPrice: 0,
        //         bootnodes: bootnodeEnode
        //     }
        // }, minernodeIdentityFiles);

        // for (const [index, rpcNodePort] of RPC_PORT_NODE_LIST.entries()) {
        //     const ip = generateIpAddress(NETWORK_SUBNET, index);

        //     const rpcnodeConfig: BesuNodeConfig = {
        //         name: `RPC_${rpcNodePort}_NODE`,
        //         network: {
        //             name: NETWORK_NAME,
        //             ip
        //         },
        //         hostPort: rpcNodePort,
        //         type: BesuNodeType.RPC,
        //         options: {
        //             bootnodes: bootnodeEnode
        //         }
        //     };
        //     const rpcNodeIdentityFiles = createNodeIdentityFiles(rpcnodeConfig);

        //     await createBesuNode(docker, rpcnodeConfig, rpcNodeIdentityFiles);
        // }

    } catch (error) {
        throw error;
    }
})();



