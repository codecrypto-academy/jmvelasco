import {
    BOOTNODE_IP,
    BOOTNODE_NAME,
    BOOTNODE_PORT,
    CHAIN_ID,
    NETWORK_GATEWAY,
    NETWORK_NAME,
    NETWORK_SUBNET,
    RPC_PORT_NODE_LIST,
    SIGNERNODE_IP,
    SIGNERNODE_NAME,
    SIGNERNODE_PORT,
} from "./constants";
import { generateIpAddress } from "./services/generateIpAddress";
import { startBlockchain } from "./startBlockchain";

(async () => {
  await startBlockchain({
    chainId: CHAIN_ID,
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
})();
