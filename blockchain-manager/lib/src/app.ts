import Docker from "dockerode";
import {
    BOOTNODE_IP,
    BOOTNODE_NAME,
    BOOTNODE_PORT,
    CHAIN_ID,
    SIGNERNODE_IP,
    SIGNERNODE_NAME,
    SIGNERNODE_PORT,
    NETWORK_GATEWAY,
    NETWORK_NAME,
    NETWORK_SUBNET,
    RPC_PORT_NODE_LIST,
} from "./constants";
import { createBesuNode } from "./services/createBesuNode";
import { BesuNodeConfig, BesuNodeType } from "./types";
import { generateIpAddress } from "./services/generateIpAddress";
import { generateNodeIdentity, initializeBlockchainNetwork } from "./services/initializeBlockchain";
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
                signerIp: SIGNERNODE_IP,
            }
        );

        if (bootnode) {
            const bootnodeNodeConfig = {
                name: BOOTNODE_NAME,
                configPath: `${blockchainDataPath}/${BOOTNODE_NAME}/config`,
                network: { name: NETWORK_NAME, ip: BOOTNODE_IP },
                hostPort: BOOTNODE_PORT,
                type: BesuNodeType.BOOTNODE,
                options: {
                    dataPath: `${blockchainDataPath}/${BOOTNODE_NAME}`,
                    genesisPath: genesisFilePath,
                    keyPath: `${blockchainDataPath}/${BOOTNODE_NAME}/keys`,
                    maxMemory: '1g',
                    logLevel: 'INFO'
                }
            }
            const bootnodeNodeConfigFiles = createNodeConfigurationFiles(bootnodeNodeConfig, bootnode);
            await createBesuNode(docker, bootnodeNodeConfig, bootnodeNodeConfigFiles);

            const signerNodeConfig = {
                name: SIGNERNODE_NAME,
                configPath: `${blockchainDataPath}/${SIGNERNODE_NAME}/config`,
                network: { name: NETWORK_NAME, ip: SIGNERNODE_IP },
                hostPort: SIGNERNODE_PORT,
                type: BesuNodeType.SIGNER,
                options: {
                    minerEnabled: true,
                    minerCoinbase: signer.address,
                    minGasPrice: 0,
                    bootnodes: bootnode ? bootnode.enode : '',
                    dataPath: `${blockchainDataPath}/${SIGNERNODE_NAME}`,
                    genesisPath: genesisFilePath,
                    keyPath: `${blockchainDataPath}/${SIGNERNODE_NAME}/keys`,
                    maxMemory: '4g',
                    logLevel: 'INFO'
                }
            }

            const signerNodeConfigFiles = createNodeConfigurationFiles(signerNodeConfig, signer);
            await createBesuNode(docker, signerNodeConfig, signerNodeConfigFiles);

            if (RPC_PORT_NODE_LIST?.length > 0) {
                for (const [index, rpcNodePort] of RPC_PORT_NODE_LIST.entries()) {
                    const ip = generateIpAddress(NETWORK_SUBNET, index);
                    const rpcNodeIdentity = generateNodeIdentity(ip);

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
                            logLevel: 'INFO'
                        }
                    };

                    const rpcNodeConfigFiles = createNodeConfigurationFiles(rpcnodeConfig, rpcNodeIdentity);
                    await createBesuNode(docker, rpcnodeConfig, rpcNodeConfigFiles);
                }
            }
        }
    } catch (error) {
        throw error;
    }
})();



