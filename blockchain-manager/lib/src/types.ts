export enum BesuNodeType {
  SIGNER = "signer",
  RPC = "rpc",
  BOOTNODE = "bootnode",
  OBSERVER = "observer", // Nodo que mantiene una copia de la blockchain, pero no valida transacciones ni expone RPC
}

export interface BesuNodeConfig {
  name: string;
  configPath?: string;
  network: {
    name: string;
    ip: string;
  };
  hostPort: number;
  type: BesuNodeType;
  options?: {
    minerEnabled?: boolean;
    minerCoinbase?: string;
    minGasPrice?: number;
    bootnodes?: string;
    dataPath?: string;
    genesisPath?: string;
    keyPath?: string;
    maxMemory?: string;
    logLevel?: string;
  };
}

export interface NodeIdentityFiles {
  privateKeyFile: string;
  publicKeyFile: string;
  addressFile: string;
  enodeFile: string;
  configFile: string;
}
