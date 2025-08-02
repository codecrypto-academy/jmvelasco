import Docker from "dockerode";
import { PROJECT_LABEL, P2P_RPC_PORT } from "../constants";
import { BesuNodeConfig, BesuNodeType, NodeIdentityFiles } from "../types";

export async function createBesuNode(docker: Docker, nodeConfig: BesuNodeConfig, nodeIdentityFiles: NodeIdentityFiles): Promise<string> {

    const nodeIdentityPath = `${process.cwd()}/${nodeConfig.network.name}`;

    // const generatePortBindings = (config: BesuNodeConfig) => {
    //     const portBindings: { [key: string]: Array<{ HostPort: string }> } = {};
        
    //     // Puerto P2P (siempre el configurado)
    //     portBindings[`${config.hostPort}/tcp`] = [{ HostPort: config.hostPort.toString() }];
        
    //     // Para RPC: puertos específicos adicionales
    //     if (config.type === BesuNodeType.RPC) {
    //         portBindings['8545/tcp'] = [{ HostPort: '8545' }];
    //         portBindings['8546/tcp'] = [{ HostPort: '8546' }];
    //         portBindings['8547/tcp'] = [{ HostPort: '8547' }];
    //     }
        
    //     // Puerto de métricas
    //     portBindings['9545/tcp'] = [{ HostPort: '9545' }];
        
    //     return portBindings;
    // };


    const containerConfig: Docker.ContainerCreateOptions = {
        Image: "hyperledger/besu:latest",
        name: nodeConfig.name,
        Cmd: [
            `--config-file=/data/${nodeIdentityFiles.configFile}`,
            `--data-path=/data/${nodeConfig.name}/data`,
            `--node-private-key-file=/data/${nodeIdentityFiles.privateKeyFile}`,
            `--genesis-file=/data/genesis.json`            
        ],
        Labels: {
            "node": nodeConfig.name,
            "network": nodeConfig.network.name,
            "project": PROJECT_LABEL,
        },
        HostConfig: {
            PortBindings: {
                [`${P2P_RPC_PORT}/tcp`]: [{ HostPort: nodeConfig.hostPort.toString() }]
            },
            Binds: [`${nodeIdentityPath}:/data`]
        },
        NetworkingConfig: {
            EndpointsConfig: {
                [nodeConfig.network.name]: {
                    IPAMConfig: {
                        IPv4Address: nodeConfig.network.ip
                    }
                }
            }
        }
    };

    try {
        const containerFinder = await docker.listContainers({
            all: true,
            filters: {
                name: [`${nodeConfig.name}`]
            }
        });

        if (containerFinder.length > 0) {
            const existingContainer = docker.getContainer(containerFinder[0].Id);
            await existingContainer.remove({ force: true });
        }

        const container = await docker.createContainer(containerConfig);
        await container.start();

        return container.id;
    } catch (error) {
        throw error;
    }
}
// import Docker from "dockerode";
// import { PROJECT_LABEL, RPC_PORT } from "../constants";
// import { BesuNodeConfig, NodeIdentityFiles, BesuNodeType } from "../types";

// export async function createBesuNode(docker: Docker, nodeConfig: BesuNodeConfig, nodeIdentityFiles: NodeIdentityFiles): Promise<string> {

//     const nodeIdentityPath = `${process.cwd()}/${nodeConfig.network.name}`;

//     // Función helper para generar variables de entorno basadas en el tipo de nodo
//     const generateEnvironmentVariables = (config: BesuNodeConfig): string[] => {
//         const envVars: string[] = [];
        
//         // Configuración de memoria según el tipo de nodo
//         let memory: string;
//         switch (config.type) {
//             case BesuNodeType.RPC:
//                 memory = config.options?.maxMemory || '6g';
//                 break;
//             case BesuNodeType.SIGNER:
//                 memory = config.options?.maxMemory || '4g';
//                 break;
//             case BesuNodeType.BOOTNODE:
//                 memory = config.options?.maxMemory || '1g';
//                 break;
//             default:
//                 memory = '2g';
//         }

//         // BESU_OPTS con optimizaciones JVM
//         envVars.push(`BESU_OPTS=-Xmx${memory} -XX:+UseG1GC -XX:+UseStringDeduplication -XX:MaxGCPauseMillis=100`);
        
//         // Variables adicionales de optimización
//         envVars.push('JAVA_OPTS=-Djava.net.preferIPv4Stack=true');
        
//         // Variables específicas por tipo de nodo
//         if (config.type === BesuNodeType.RPC) {
//             // Para nodos RPC, optimizaciones adicionales
//             envVars.push('BESU_RPC_OPTS=--rpc-http-max-active-connections=200');
//         }
        
//         if (config.type === BesuNodeType.SIGNER) {
//             // Para signers, configuraciones de seguridad adicionales
//             envVars.push('BESU_SECURITY_OPTS=--permissions-nodes-config-file-enabled=true');
//         }

//         return envVars;
//     };

//     // Función helper para generar puertos expuestos según el tipo de nodo
//     const generatePortBindings = (config: BesuNodeConfig) => {
//         const portBindings: { [key: string]: Array<{ HostPort: string }> } = {};
        
//         // Puerto P2P (siempre necesario)
//         portBindings[`${config.hostPort}/tcp`] = [{ HostPort: config.hostPort.toString() }];
        
//         // Puertos adicionales según el tipo de nodo
//         if (config.type === BesuNodeType.RPC) {
//             // Puerto RPC HTTP
//             portBindings['8545/tcp'] = [{ HostPort: '8545' }];
//             // Puerto WebSocket
//             portBindings['8546/tcp'] = [{ HostPort: '8546' }];
//             // Puerto GraphQL
//             portBindings['8547/tcp'] = [{ HostPort: '8547' }];
//         }
        
//         // Puerto de métricas (para todos los tipos)
//         portBindings['9545/tcp'] = [{ HostPort: '9545' }];
        
//         return portBindings;
//     };

//     const containerConfig: Docker.ContainerCreateOptions = {
//         Image: "hyperledger/besu:latest",
//         name: nodeConfig.name,
        
//         // IMPORTANTE: Solo pasar el archivo de configuración TOML
//         // Las otras opciones ya están en el archivo TOML
//         Cmd: [
//             `--config-file=/data/${nodeIdentityFiles.configFile}`
//         ],
        
//         // Variables de entorno para JVM y optimizaciones
//         Env: generateEnvironmentVariables(nodeConfig),
        
//         Labels: {
//             "node": nodeConfig.name,
//             "network": nodeConfig.network.name,
//             "project": PROJECT_LABEL,
//             "type": nodeConfig.type // Añadir el tipo para identificación
//         },
        
//         HostConfig: {
//             // Puertos dinámicos según el tipo de nodo
//             PortBindings: generatePortBindings(nodeConfig),
            
//             // Volúmenes montados
//             Binds: [`${nodeIdentityPath}:/data`],
            
//             // Límites de recursos
//             Memory: getMemoryLimit(nodeConfig),
            
//             // Configuraciones de red y seguridad
//             NetworkMode: nodeConfig.network.name,
            
//             // Para signers, configuraciones de seguridad adicionales
//             ...(nodeConfig.type === BesuNodeType.SIGNER && {
//                 ReadonlyRootfs: false, // Puede necesitar escribir logs
//                 SecurityOpt: ['no-new-privileges:true']
//             })
//         },
        
//         NetworkingConfig: {
//             EndpointsConfig: {
//                 [nodeConfig.network.name]: {
//                     IPAMConfig: {
//                         IPv4Address: nodeConfig.network.ip
//                     }
//                 }
//             }
//         },
        
//         // Configuraciones adicionales para cada tipo
//         ...(nodeConfig.type === BesuNodeType.RPC && {
//             // Para RPC, exponer más puertos
//             ExposedPorts: {
//                 '8545/tcp': {},
//                 '8546/tcp': {},
//                 '8547/tcp': {},
//                 '9545/tcp': {}
//             }
//         })
//     };

//     try {
//         const containerFinder = await docker.listContainers({
//             all: true,
//             filters: {
//                 name: [`${nodeConfig.name}`]
//             }
//         });

//         if (containerFinder.length > 0) {
//             console.log(`Removing existing container: ${nodeConfig.name}`);
//             const existingContainer = docker.getContainer(containerFinder[0].Id);
//             await existingContainer.remove({ force: true });
//         }

//         console.log(`Creating ${nodeConfig.type} node: ${nodeConfig.name}`);
//         console.log(`Environment variables:`, generateEnvironmentVariables(nodeConfig));
        
//         const container = await docker.createContainer(containerConfig);
//         await container.start();

//         // Logging básico para debugging
//         console.log(`✅ ${nodeConfig.type} node '${nodeConfig.name}' started successfully`);
//         console.log(`   - Container ID: ${container.id}`);
//         console.log(`   - Network IP: ${nodeConfig.network.ip}`);
//         console.log(`   - P2P Port: ${nodeConfig.hostPort}`);
        
//         if (nodeConfig.type === BesuNodeType.RPC) {
//             console.log(`   - RPC HTTP: http://${nodeConfig.network.ip}:8545`);
//             console.log(`   - WebSocket: ws://${nodeConfig.network.ip}:8546`);
//             console.log(`   - GraphQL: http://${nodeConfig.network.ip}:8547`);
//         }

//         return container.id;
//     } catch (error) {
//         console.error(`❌ Failed to create ${nodeConfig.type} node '${nodeConfig.name}':`, error);
//         throw error;
//     }
// }

// // Función helper para convertir string de memoria a bytes
// function getMemoryLimit(config: BesuNodeConfig): number {
//     const memory = config.options?.maxMemory || 
//                   (config.type === BesuNodeType.RPC ? '6g' : 
//                    config.type === BesuNodeType.SIGNER ? '4g' : '1g');
    
//     // Convertir formato "4g" a bytes
//     const unit = memory.slice(-1).toLowerCase();
//     const value = parseInt(memory.slice(0, -1));
    
//     switch (unit) {
//         case 'g': return value * 1024 * 1024 * 1024;
//         case 'm': return value * 1024 * 1024;
//         case 'k': return value * 1024;
//         default: return 2 * 1024 * 1024 * 1024; // 2GB por defecto
//     }
// }

// // Función mejorada para integrar con tu factory TOML
// export async function createBesuNodeWithTomlConfig(
//     docker: Docker, 
//     nodeConfig: BesuNodeConfig, 
//     nodeIdentityFiles: NodeIdentityFiles
// ): Promise<{ containerId: string, envVars: string[], ports: string[] }> {
    
//     const containerId = await createBesuNode(docker, nodeConfig, nodeIdentityFiles);
//     const envVars = generateEnvironmentVariables(nodeConfig);
    
//     // Información de puertos para referencia
//     const ports: string[] = [];
//     ports.push(`P2P: ${nodeConfig.hostPort}`);
    
//     if (nodeConfig.type === BesuNodeType.RPC) {
//         ports.push('HTTP RPC: 8545', 'WebSocket: 8546', 'GraphQL: 8547');
//     }
//     ports.push('Metrics: 9545');
    
//     return { containerId, envVars, ports };
// }

// // Función helper separada para generar variables de entorno
// function generateEnvironmentVariables(config: BesuNodeConfig): string[] {
//     const envVars: string[] = [];
    
//     // Configuración de memoria según el tipo de nodo
//     let memory: string;
//     switch (config.type) {
//         case BesuNodeType.RPC:
//             memory = config.options?.maxMemory || '6g';
//             break;
//         case BesuNodeType.SIGNER:
//             memory = config.options?.maxMemory || '4g';
//             break;
//         case BesuNodeType.BOOTNODE:
//             memory = config.options?.maxMemory || '1g';
//             break;
//         default:
//             memory = '2g';
//     }

//     // BESU_OPTS con optimizaciones JVM específicas por tipo de nodo
//     let jvmOpts = `-Xmx${memory} -XX:+UseG1GC -XX:+UseStringDeduplication`;
    
//     if (config.type === BesuNodeType.RPC) {
//         // Para RPC: optimizaciones para alto throughput
//         jvmOpts += ' -XX:MaxGCPauseMillis=50 -XX:+UseCompressedOops';
//     } else if (config.type === BesuNodeType.SIGNER) {
//         // Para Signer: optimizaciones para baja latencia y estabilidad
//         jvmOpts += ' -XX:MaxGCPauseMillis=100 -XX:+UseLargePages';
//     } else {
//         // Para Bootnode: optimizaciones para bajo uso de recursos
//         jvmOpts += ' -XX:MaxGCPauseMillis=200';
//     }
    
//     envVars.push(`BESU_OPTS=${jvmOpts}`);
    
//     // Variables adicionales de optimización
//     envVars.push('JAVA_OPTS=-Djava.net.preferIPv4Stack=true');
    
//     return envVars;
// }

// // Ejemplo de uso integrado con la factory TOML
// export async function deployBesuNode(
//     docker: Docker,
//     nodeConfig: BesuNodeConfig
// ): Promise<{ containerId: string, configFile: string, envInfo: string }> {
    
//     // 1. Generar configuración TOML
//     const tomlResult = generateTomlFile(nodeConfig);
//     if (tomlResult.errors.length > 0) {
//         throw new Error(`TOML configuration errors: ${tomlResult.errors.join(', ')}`);
//     }
    
//     // 2. Guardar archivo TOML (aquí asumo que tienes una función para esto)
//     // await saveTomlFile(tomlResult.filename, tomlResult.content);
    
//     // 3. Preparar archivos de identidad del nodo
//     const nodeIdentityFiles: NodeIdentityFiles = {
//         configFile: tomlResult.filename,
//         privateKeyFile: `${nodeConfig.name}/key`,
//         // otros archivos necesarios...
//     };
    
//     // 4. Crear y arrancar el contenedor
//     const { containerId, envVars, ports } = await createBesuNodeWithTomlConfig(
//         docker, 
//         nodeConfig, 
//         nodeIdentityFiles
//     );
    
//     return {
//         containerId,
//         configFile: tomlResult.filename,
//         envInfo: `Environment: ${envVars.join(', ')} | Ports: ${ports.join(', ')}`
//     };
// }