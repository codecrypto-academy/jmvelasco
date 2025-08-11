import { Buffer } from "buffer";
import type Docker from "dockerode";
import pkg from "elliptic";
import fs from "fs";
import keccak256 from "keccak256";
import path from "path";
import { P2P_PORT } from "../constants";
import { createCliqueGenesisFile } from "./cliqueGenesisFile";
import { ensureNetworkExists } from "./ensureNetworkExists";
const { ec: EC } = pkg;

export async function initializeBlockchainNetwork(
  docker: Docker,
  chainId: number,
  networkOptions: {
    name: string;
    subnet: string;
    gateway: string;
    bootnodeIp: string;
    signerIp: string;
    preAllocatedAccounts?: {
      address: string;
      balance: string;
    }[];
  }
) {
  const { name, subnet, gateway, bootnodeIp, signerIp } = networkOptions;
  const dockerNetworkId = await ensureNetworkExists(docker, {
    name,
    subnet,
    gateway,
  });

  const blockchainDataPath = path.join(process.cwd(), name);
  if (fs.existsSync(blockchainDataPath)) {
    try {
      fs.rmSync(blockchainDataPath, { recursive: true, force: true });
      if (fs.existsSync(blockchainDataPath)) {
        console.error(
          `Failed to remove blockchain data at: ${blockchainDataPath}`
        );
      } else {
        console.log(
          `Successfully removed existing blockchain data at: ${blockchainDataPath}`
        );
      }
    } catch (err) {
      console.error(
        `Error removing blockchain data at ${blockchainDataPath}:`,
        err
      );
    }
  }

  const bootnode = bootnodeIp ? generateBootnodeAccount(bootnodeIp) : null;
  const signer = generateSignerAccount(signerIp);
  const genesisFilePath = createCliqueGenesisFile(blockchainDataPath, {
    chainId,
    initialValidators: [`0x${signer.address}`],
    preAllocatedAccounts: [
      { address: `0x${signer.address}`, balance: "0xad78ebc5ac6200000" },
      ...(networkOptions.preAllocatedAccounts || []),
    ],
  });

  return {
    blockchainDataPath,
    dockerNetworkId,
    genesisFilePath,
    signer,
    bootnode,
  };
}

export function generateNodeIdentity(ip: string) {
  const { publicKey, privateKey } = generateKeyPair();
  const publicKeyHash = publicKey.slice(2);
  const pubKeyBuffer = keccak256(Buffer.from(publicKeyHash, "hex"));
  return {
    privateKey,
    publicKey,
    address: pubKeyBuffer.toString("hex").slice(-40),
    enode: `enode://${publicKeyHash}@${ip}:${P2P_PORT}`,
  };
}

function generateKeyPair() {
  const ec = new EC("secp256k1");
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate("hex");
  const publicKey = keyPair.getPublic("hex");
  return { publicKey, privateKey };
}

function generateUserAccounts(count: number) {
  return Array.from({ length: count }, () => {
    const identity = generateNodeIdentity("0.0.0.0"); // IP dummy
    return {
      privateKey: identity.privateKey,
      address: identity.address,
    };
  });
}

function generateSignerAccount(signerIp: string) {
  const identity = generateNodeIdentity(signerIp); // IP dummy
  return {
    publicKey: identity.publicKey,
    privateKey: identity.privateKey,
    address: identity.address,
    enode: identity.enode,
  };
}

function generateBootnodeAccount(ip: string) {
  const identity = generateNodeIdentity(ip);
  return {
    publicKey: identity.publicKey,
    privateKey: identity.privateKey,
    address: identity.address,
    enode: identity.enode,
  };
}
