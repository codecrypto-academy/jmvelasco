import Docker from "dockerode";
import path from "path";
import { P2P_PORT, PROJECT_LABEL } from "../constants";
import { createBesuNode } from "../services/createBesuNode";
import { BesuNodeConfig, BesuNodeType } from "../types";

const CONTAINER_ID = "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567";

describe('createNode', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const nodeConfigStub: BesuNodeConfig = {
        name: "mocknode",
        configPath: "config",
        network: {
            name: "mocknetwork",
            ip: "127.0.0.1"
        },
        hostPort: 8888,
        type: BesuNodeType.SIGNER
    };
    const nodeIdentityPath = `${process.cwd()}/${nodeConfigStub.network.name}`;
    const nodeIdentityFilesStub = {
        privateKeyFile: `${nodeIdentityPath}/keys/privateKey`,
        publicKeyFile: `${nodeIdentityPath}/keys/publicKey`,
        addressFile: `${nodeIdentityPath}/keys/address`,
        enodeFile: `${nodeIdentityPath}/keys/enode`,
        configFile: `${nodeIdentityPath}/config/config.toml`,
    }


    it('should create a node container successfully', async () => {
        const docker = new Docker();
        const mockContainer = {
            id: CONTAINER_ID,
            start: jest.fn().mockResolvedValue(undefined)
        } as Partial<Docker.Container> as Docker.Container;
        jest.spyOn(docker, 'createContainer').mockResolvedValue(mockContainer);

        const containerId = await createBesuNode(docker, nodeConfigStub, nodeIdentityFilesStub);

        expect(containerId).toBe(CONTAINER_ID);
        expect(docker.createContainer).toHaveBeenCalledWith({
            Image: "hyperledger/besu:latest",
            name: nodeConfigStub.name,
            Cmd: [
                `--config-file=/data/${nodeIdentityFilesStub.configFile}`,
            ],
            Labels: {
                "node": nodeConfigStub.name,
                "network": nodeConfigStub.network.name,
                "project": PROJECT_LABEL,
            },
            HostConfig: {
                PortBindings: {
                    [`${P2P_PORT}/tcp`]: [{ HostPort: nodeConfigStub.hostPort.toString() }],
                    [`9545/tcp`]: [{ HostPort: (nodeConfigStub.hostPort + 1000).toString() }]
                },
                Binds: [`${nodeIdentityPath}:/data`]
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [nodeConfigStub.network.name]: {
                        IPAMConfig: {
                            IPv4Address: nodeConfigStub.network.ip
                        }
                    }
                }
            }
        });
        expect(mockContainer.start).toHaveBeenCalled();
    });

    it('should create a miner node container successfully', async () => {
        const docker = new Docker();
        const mockContainer = {
            id: CONTAINER_ID,
            start: jest.fn().mockResolvedValue(undefined)
        } as Partial<Docker.Container> as Docker.Container;
        jest.spyOn(docker, 'createContainer').mockResolvedValue(mockContainer);

        const containerId = await createBesuNode(docker, {
            ...nodeConfigStub,
            options: {
                minerEnabled: true,
                minerCoinbase: nodeIdentityFilesStub.addressFile,
                minGasPrice: 0,
                bootnodes: nodeIdentityFilesStub.enodeFile
            }
        }, nodeIdentityFilesStub);

        expect(containerId).toBe(CONTAINER_ID);
        expect(docker.createContainer).toHaveBeenCalledWith({
            Image: "hyperledger/besu:latest",
            name: nodeConfigStub.name,
            Cmd: [
                `--config-file=/data/${nodeIdentityFilesStub.configFile}`,
            ],
            Labels: {
                "node": nodeConfigStub.name,
                "network": nodeConfigStub.network.name,
                "project": PROJECT_LABEL,
            },
            HostConfig: {
                PortBindings: {
                    [`${P2P_PORT}/tcp`]: [{ HostPort: nodeConfigStub.hostPort.toString() }],
                    [`9545/tcp`]: [{ HostPort: (nodeConfigStub.hostPort + 1000).toString() }]
                },
                Binds: [`${nodeIdentityPath}:/data`]
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [nodeConfigStub.network.name]: {
                        IPAMConfig: {
                            IPv4Address: nodeConfigStub.network.ip
                        }
                    }
                }
            }
        });
        expect(mockContainer.start).toHaveBeenCalled();
    });


    it('should remove the container if already exists before create a new one', async () => {
        const docker = new Docker();
        const existingContainerInfo = { Id: CONTAINER_ID, State: 'running' } as Docker.ContainerInfo;
        const mockExistingContainer = {
            start: jest.fn().mockResolvedValue(undefined),
            remove: jest.fn().mockResolvedValue(undefined)
        } as Partial<Docker.Container> as Docker.Container;
        jest.spyOn(docker, 'listContainers').mockResolvedValue([existingContainerInfo]);
        jest.spyOn(docker, 'getContainer').mockReturnValue(mockExistingContainer);
        jest.spyOn(docker, 'createContainer').mockResolvedValue(mockExistingContainer);

        await createBesuNode(docker, nodeConfigStub, nodeIdentityFilesStub);

        expect(docker.getContainer).toHaveBeenCalledWith(CONTAINER_ID);
        expect(mockExistingContainer.remove).toHaveBeenCalledWith({ force: true });
        expect(mockExistingContainer.start).toHaveBeenCalled();
    })

    it('should throw error when createContainer fails', async () => {
        const docker = new Docker();
        jest.spyOn(docker, 'createContainer').mockRejectedValue(new Error('Docker API error'));

        await expect(createBesuNode(docker, nodeConfigStub, nodeIdentityFilesStub)).rejects.toThrow('Docker API error');
    });

    it('should throw error when container start fails', async () => {
        const docker = new Docker();
        const mockContainer = {
            id: CONTAINER_ID,
            start: jest.fn().mockRejectedValue(new Error('Container start failed'))
        } as Partial<Docker.Container> as Docker.Container;
        jest.spyOn(docker, 'createContainer').mockResolvedValue(mockContainer);

        await expect(createBesuNode(docker, nodeConfigStub, nodeIdentityFilesStub)).rejects.toThrow('Container start failed');
    });
});

