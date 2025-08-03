import Docker from "dockerode";
import { PROJECT_LABEL } from "./constants";

export async function removeBlockchain() {
    const docker = new Docker();

    try {
        const containerFinder = await docker.listContainers({
            all: true,
            filters: {
                label: [`project=${PROJECT_LABEL}`]
            }
        });

        if (containerFinder.length > 0) {
            for (const container of containerFinder) {
                const existingContainer = docker.getContainer(container.Id);
                await existingContainer.remove({ force: true });
            }
        }

    } catch (error) {
        throw error;
    }

    try {
        const networkFinder = await docker.listNetworks({
            filters: {
                label: [`project=${PROJECT_LABEL}`]
            }
        });
        if (networkFinder.length > 0) {
            for (const network of networkFinder) {
                const dockerNetwork = docker.getNetwork(network.Id);
                await dockerNetwork.remove();
            }
        }
    } catch (error) {
        throw error;
    }
}

