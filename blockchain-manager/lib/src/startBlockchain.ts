import Docker from "dockerode";
import fs from "fs";
import path from "path";
import {
    CHAIN_ID
} from "./constants";
import { createBesuNode } from "./services/createBesuNode";
import { createNodeConfigurationFiles } from "./services/generateTomlFile";
import {
    generateNodeIdentity,
    initializeBlockchainNetwork,
} from "./services/initializeBlockchain";
import { BesuNodeConfig, BesuNodeType } from "./types";

const docker = new Docker();
export async function startBlockchain({
  network,
  bootnode,
  signer,
  rpcNodes,
}: {
  network: {
    name: string;
    subnet: string;
    gateway: string;
  };
  bootnode: {
    ip: string;
    hostPort: number;
    name: string;
  };
  signer: {
    ip: string;
    hostPort: number;
    name: string;
  };
  rpcNodes?: {
    ip: string;
    hostPort: number;
    name: string;
  }[];
}) {
  try {
    const {
      blockchainDataPath,
      genesisFilePath,
      signer: _signer,
      bootnode: _bootnode,
    } = await initializeBlockchainNetwork(docker, CHAIN_ID, {
      name: network.name,
      subnet: network.subnet,
      gateway: network.gateway,
      bootnodeIp: bootnode.ip,
      signerIp: signer.ip,
    });

    if (_bootnode) {
      await addBootNode(
        bootnode,
        blockchainDataPath,
        network,
        genesisFilePath,
        _bootnode,
        docker
      );
      await addSignerNode(
        signer,
        blockchainDataPath,
        network,
        _signer,
        _bootnode,
        genesisFilePath
      );

      if (rpcNodes && rpcNodes.length > 0) {
        for (const [index, rpcNode] of rpcNodes.entries()) {
          await addRPCNode(
            rpcNode,
            blockchainDataPath,
            network,
            _bootnode,
            genesisFilePath
          );
        }
      }
    }
  } catch (error) {
    throw error;
  }
}

async function addRPCNode(
  rpcNode: { ip: string; hostPort: number; name: string },
  blockchainDataPath: string,
  network: { name: string; subnet: string; gateway: string },
  _bootnode: {
    publicKey: string;
    privateKey: string;
    address: string;
    enode: string;
  },
  genesisFilePath: string
) {
  const rpcNodeIdentity = generateNodeIdentity(rpcNode.ip);

  const rpcnodeConfig: BesuNodeConfig = {
    name: rpcNode.name,
    configPath: `${blockchainDataPath}/${rpcNode.name}/config`,
    network: {
      name: network.name,
      ip: rpcNode.ip,
    },
    hostPort: rpcNode.hostPort,
    type: BesuNodeType.RPC,
    options: {
      minerEnabled: false,
      bootnodes: _bootnode.enode,
      dataPath: `${blockchainDataPath}/${rpcNode}`,
      genesisPath: genesisFilePath,
      keyPath: `${blockchainDataPath}/${rpcNode}/keys`,
      maxMemory: "6g",
      logLevel: "INFO",
    },
  };

  const rpcNodeConfigFiles = createNodeConfigurationFiles(
    rpcnodeConfig,
    rpcNodeIdentity
  );
  await createBesuNode(docker, rpcnodeConfig, rpcNodeConfigFiles);
}

async function addSignerNode(
  signer: { ip: string; hostPort: number; name: string },
  blockchainDataPath: string,
  network: { name: string; subnet: string; gateway: string },
  _signer: {
    publicKey: string;
    privateKey: string;
    address: string;
    enode: string;
  },
  _bootnode: {
    publicKey: string;
    privateKey: string;
    address: string;
    enode: string;
  },
  genesisFilePath: string
) {
  const signerNodeConfig = {
    name: signer.name,
    configPath: `${blockchainDataPath}/${signer.name}/config`,
    network: { name: network.name, ip: signer.ip },
    hostPort: signer.hostPort,
    type: BesuNodeType.SIGNER,
    options: {
      minerEnabled: true,
      minerCoinbase: _signer.address,
      minGasPrice: 0,
      bootnodes: _bootnode.enode,
      dataPath: `${blockchainDataPath}/${signer.name}`,
      genesisPath: genesisFilePath,
      keyPath: `${blockchainDataPath}/${signer.name}/keys`,
      maxMemory: "4g",
      logLevel: "INFO",
    },
  };

  const signerNodeConfigFiles = createNodeConfigurationFiles(
    signerNodeConfig,
    _signer
  );
  await createBesuNode(docker, signerNodeConfig, signerNodeConfigFiles);
}

async function addBootNode(
  bootnode: { ip: string; hostPort: number; name: string },
  blockchainDataPath: string,
  network: { name: string; subnet: string; gateway: string },
  genesisFilePath: string,
  _bootnode: {
    publicKey: string;
    privateKey: string;
    address: string;
    enode: string;
  },
  docker: Docker
) {
  const bootnodeNodeConfig = {
    name: bootnode.name,
    configPath: `${blockchainDataPath}/${bootnode.name}/config`,
    network: { name: network.name, ip: bootnode.ip },
    hostPort: bootnode.hostPort,
    type: BesuNodeType.BOOTNODE,
    options: {
      dataPath: `${blockchainDataPath}/${bootnode.name}`,
      genesisPath: genesisFilePath,
      keyPath: `${blockchainDataPath}/${bootnode.name}/keys`,
      maxMemory: "1g",
      logLevel: "INFO",
    },
  };
  const bootnodeNodeConfigFiles = createNodeConfigurationFiles(
    bootnodeNodeConfig,
    _bootnode
  );
  await createBesuNode(docker, bootnodeNodeConfig, bootnodeNodeConfigFiles);
}

async function addNode2({
  networkName,
  hostPort,
  nodeName,
  nodeIp,
  nodeType,
  nodeKeys,
}: {
  networkName: string;
  hostPort: number;
  nodeName: string;
  nodeIp: string;
  nodeType: BesuNodeType;
  nodeKeys: {
    publicKey: string;
    privateKey: string;
    address: string;
    enode: string;
  };
}) {
  const networkFinder = await docker.listNetworks({
    filters: {
      name: [networkName],
    },
  });
  if (networkFinder.length === 0) {
    throw new Error(`Network ${networkName} does not exist.`);
  }
  const blockchainDataPath = path.join(process.cwd(), networkName);
  if (!fs.existsSync(blockchainDataPath)) {
    throw new Error(`Network data path ${blockchainDataPath} does not exist.`);
  }
  const config = {
    name: nodeName,
    configPath: `${blockchainDataPath}/${nodeName}/config`,
    network: { name: networkName, ip: nodeIp },
    hostPort: hostPort,
    type: nodeType,
    options: {
      dataPath: `${blockchainDataPath}/${nodeName}`,
      genesisPath: path.join(blockchainDataPath, "genesis.json"),
      keyPath: `${blockchainDataPath}/${nodeName}/keys`,
      maxMemory: "1g",
      logLevel: "INFO",
    },
  };
  const configFiles = createNodeConfigurationFiles(config, nodeKeys);
  await createBesuNode(docker, config, configFiles);
}
