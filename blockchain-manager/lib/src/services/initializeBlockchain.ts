import type Docker from "dockerode";
import { ensureNetworkExists } from "./ensureNetworkExists";
import path from "path";
import fs from "fs";
import { createCliqueGenesisFile } from "./cliqueGenesisFile";
import pkg from 'elliptic';
const { ec: EC } = pkg;
import { Buffer } from 'buffer';
import keccak256 from 'keccak256';
import { P2P_PORT } from '../constants';


export async function initializeBlockchainNetwork(docker: Docker, chainId: number, networkOptions: {
    name: string;
    subnet: string;
    gateway: string;
    bootnodeIp: string;
}) {
    const { name, subnet, gateway, bootnodeIp } = networkOptions;
    const dockerNetworkId = await ensureNetworkExists(docker,
        {
            name,
            subnet,
            gateway
        }
    );

    const blockchainDataPath = path.join(process.cwd(), name);
    if (fs.existsSync(blockchainDataPath)) {
        console.log(`Removing existing blockchain data at: ${blockchainDataPath}`);
        fs.rmSync(blockchainDataPath, { recursive: true, force: true });
    }

    const signer = generateSignerAccount();
    const bootnode = bootnodeIp ? generateBootnodeAccount(bootnodeIp) : null;
    const userAccounts = generateUserAccounts(5); 
    const genesisFilePath = createCliqueGenesisFile(blockchainDataPath, {
        chainId,
        initialValidators: [`0x${signer.address}`],
        preAllocatedAccounts: [
            { address: `0xb650c765f7E3288deBE8909D89261bD27354811C`, balance: '0xad78ebc5ac6200000' },
            { address: `0x${userAccounts[0].address}`, balance: '0xad78ebc5ac6200000' },
            { address: `0x${userAccounts[1].address}`, balance: '0xad78ebc5ac6200000' },
            { address: `0x${userAccounts[2].address}`, balance: '0xad78ebc5ac6200000' },
            { address: `0x${userAccounts[3].address}`, balance: '0xad78ebc5ac6200000' },
            { address: `0x${userAccounts[4].address}`, balance: '0xad78ebc5ac6200000' },
        ],
    });

    return {
        blockchainDataPath,
        dockerNetworkId,
        genesisFilePath,
        signer,
        bootnode
    };
}


function generateNodeIdentity(ip: string) {
    const { publicKey, privateKey } = generateKeyPair();
    const publicKeyHash = publicKey.slice(2);
    const pubKeyBuffer = keccak256(Buffer.from(publicKeyHash, 'hex'));
    return {
        privateKey,
        publicKey,
        address: pubKeyBuffer.toString("hex").slice(-40),
        enode: `enode://${publicKeyHash}@${ip}:${P2P_PORT}`
    }
}

function generateKeyPair() {
    const ec = new EC('secp256k1');
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate('hex');
    const publicKey = keyPair.getPublic('hex');
    return { publicKey, privateKey };
}

function generateUserAccounts(count: number) {
    return Array.from({ length: count }, () => {
        const identity = generateNodeIdentity('0.0.0.0'); // IP dummy
        return {
            privateKey: identity.privateKey,
            address: identity.address
        };
    });
}

function generateSignerAccount() {
    const identity = generateNodeIdentity('0.0.0.0'); // IP dummy
    return {
        publicKey: identity.publicKey,
        privateKey: identity.privateKey,
        address: identity.address
    };
}

function generateBootnodeAccount(ip: string) {
    const identity = generateNodeIdentity(ip); 
    return {
        publicKey: identity.publicKey,
        privateKey: identity.privateKey,
        address: identity.address,
        enode: identity.enode
    };
}