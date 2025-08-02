import fs from "fs";
import { BesuNodeConfig, BesuNodeType } from "../types";
import { P2P_PORT, RPC_PORT } from "../constants";

export class BesuTomlConfigFactory {
    
    /**
     * Genera configuración TOML para un nodo BOOTNODE
     * Optimizado para: Disponibilidad, estabilidad, descubrimiento de peers
     */
    static generateBootnodeConfig(config: BesuNodeConfig): string {
        return `# ============================================
# BESU BOOTNODE CONFIGURATION
# Nodo: ${config.name}  
# Función: Descubrimiento de peers y estabilidad de red
# Seguridad: Media (solo descubrimiento, sin datos sensibles)
# ============================================

# === CONFIGURACIÓN DE RED ===
# Puerto P2P para descubrimiento de peers
p2p-port=${P2P_PORT}
p2p-host="${config.network.ip}"

# Máximo número de peers (alto para bootnode)
max-peers=100

# Bootnode debe ser discoverable
discovery-enabled=true
p2p-enabled=true

# === CONFIGURACIÓN DE DATOS ===
# Directorio de datos (mínimo para bootnode)
data-path="${config.options?.dataPath || './data/' + config.name}"

# Archivo génesis (requerido para validar red correcta)
genesis-file="${config.options?.genesisPath || './genesis.json'}"

# === SINCRONIZACIÓN ===
# Sincronización recomendada (SNAP en lugar de FAST deprecado)
sync-mode="SNAP"
data-storage-format="BONSAI"

# === SERVICIOS DESHABILITADOS ===
# Bootnode NO debe exponer servicios (solo descubrimiento)
rpc-http-enabled=false
rpc-ws-enabled=false
graphql-http-enabled=false

# NO minar (bootnode no participa en consenso)
miner-enabled=false

# === LOGGING Y MONITOREO ===
logging="${config.options?.logLevel || 'INFO'}"

# Métricas para monitoreo (puerto interno)
metrics-enabled=true
metrics-host="127.0.0.1"
metrics-port=9545

# === CONFIGURACIÓN DE SEGURIDAD ===
# Bootnode no guarda claves privadas sensibles
# Archivo de clave del nodo (solo para identidad P2P)
node-private-key-file="${config.options?.keyPath || './keys/' + config.name + '/key'}"

# === CONFIGURACIÓN ESPECÍFICA BOOTNODE ===
# Bootnode debe mantener conexiones estables
target-gas-limit=8000000
min-gas-price=1000000000

# NOTA: min-gas-price=0 causa warnings. Usar 1 gwei mínimo

# NOTA: Las opciones Xmx, pruning-enabled, pruning-blocks-retained, 
# p2p-peer-upper-bound, y log-include-events-enabled no son válidas en TOML.
# Xmx debe pasarse como variable de entorno BESU_OPTS="-Xmx1g"
# La poda se controla automáticamente por sync-mode y data-storage-format`;
    }

    /**
     * Genera configuración TOML para un nodo SIGNER
     * Optimizado para: Máxima seguridad, consenso confiable, sin exposición pública
     */
    static generateSignerConfig(config: BesuNodeConfig): string {
        return `# ============================================
# BESU SIGNER NODE CONFIGURATION  
# Nodo: ${config.name}
# Función: Consenso PoA, creación y firma de bloques
# Seguridad: MÁXIMA (nodo crítico para la red)
# ============================================

# === CONFIGURACIÓN DE RED ===
# Puerto P2P (solo para peers confiables)
p2p-port=${P2P_PORT}
p2p-host="${config.network.ip}"

# Conexiones limitadas (solo peers esenciales)
max-peers=15

# Descubrimiento habilitado para encontrar otros signers
discovery-enabled=true
p2p-enabled=true

# Bootnodes para conectividad inicial
bootnodes=["${config.options?.bootnodes}"]

# === CONFIGURACIÓN DE DATOS ===
# Directorio de datos (almacenamiento completo y seguro)
data-path="${config.options?.dataPath || './data/' + config.name}"

# Archivo génesis
genesis-file="${config.options?.genesisPath || './genesis.json'}"

# === CONFIGURACIÓN DE CONSENSO ===
# HABILITADO: Este nodo puede firmar bloques
miner-enabled=${config.options?.minerEnabled || true}
miner-coinbase="${config.options?.minerCoinbase}"

# Gas mínimo (configuración de red - evitar 0 para prevenir warnings)
min-gas-price=1000000000
target-gas-limit=8000000

# === SINCRONIZACIÓN Y ALMACENAMIENTO ===
# Sincronización completa con SNAP (más eficiente que FAST)
sync-mode="SNAP"
data-storage-format="BONSAI"

# === SERVICIOS - NO EXPUESTOS (SEGURIDAD CRÍTICA) ===
# DESHABILITADO: Signers NO deben exponer RPC públicamente
rpc-http-enabled=false
rpc-ws-enabled=false
graphql-http-enabled=false

# API local SOLO para mantenimiento (descomenta si necesitas administración local)
# rpc-http-enabled=true
# rpc-http-host="127.0.0.1"
# rpc-http-port=8545
# rpc-http-apis=["ADMIN","DEBUG"]

# === CONFIGURACIÓN DE SEGURIDAD ===
# Clave privada del signer (CRÍTICA - PROTEGER)
node-private-key-file="${config.options?.keyPath || './keys/' + config.name + '/key'}"

# === LOGGING Y MONITOREO ===
logging="${config.options?.logLevel || 'INFO'}"

# Métricas internas para monitoreo
metrics-enabled=true
metrics-host="127.0.0.1"
metrics-port=9545

# === CONFIGURACIÓN DE CONSENSO AVANZADA ===
# Configuración específica para PoA (si es soportada en TOML)
# block-period-seconds=15

# NOTAS IMPORTANTES:
# - Xmx debe configurarse como variable de entorno: BESU_OPTS="-Xmx4g"
# - pruning-enabled no es una opción TOML válida
# - La poda se controla por sync-mode y data-storage-format
# - Mantener este nodo en red privada con firewall estricto
# - Backup regular de claves privadas
# - Monitoreo 24/7 del estado del nodo`;
    }

    /**
     * Genera configuración TOML para un nodo RPC
     * Optimizado para: Alto rendimiento, APIs completas, manejo de carga
     */
    static generateRpcConfig(config: BesuNodeConfig): string {
        return `# ============================================
# BESU RPC NODE CONFIGURATION
# Nodo: ${config.name}  
# Función: Gateway para aplicaciones, APIs públicas
# Seguridad: Media-Alta (expuesto pero sin consenso)
# ============================================

# === CONFIGURACIÓN DE RED ===
# Puerto P2P para sincronización
p2p-port=${P2P_PORT}
p2p-host="${config.network.ip}"

# Alto número de peers para mejor sincronización
max-peers=50

# Descubrimiento habilitado
discovery-enabled=true
p2p-enabled=true

# Bootnodes para conectividad
bootnodes=["${config.options?.bootnodes}"]

# === CONFIGURACIÓN DE DATOS ===
# Directorio de datos
data-path="${config.options?.dataPath || './data/' + config.name}"

# Archivo génesis
genesis-file="${config.options?.genesisPath || './genesis.json'}"

# === CONFIGURACIÓN DE CONSENSO ===
# DESHABILITADO: RPC no participa en consenso
miner-enabled=false

# === SINCRONIZACIÓN Y ALMACENAMIENTO ===
# Sincronización SNAP (recomendada, más eficiente que FAST deprecado)
sync-mode="SNAP"
data-storage-format="BONSAI"

# === SERVICIOS RPC - HABILITADOS (FUNCIÓN PRINCIPAL) ===
# HTTP RPC habilitado para aplicaciones
rpc-http-enabled=true
# rpc-http-host="0.0.0.0"
rpc-http-host="${config.network.ip}"
rpc-http-port=${RPC_PORT}

# APIs completas para aplicaciones diversas
rpc-http-apis=["ETH","NET","WEB3","TXPOOL","DEBUG","TRACE"]

# CORS configurado para aplicaciones web
rpc-http-cors-origins=["*"]

# Límites de seguridad
rpc-http-max-active-connections=100

# === WEBSOCKET RPC ===
# WebSocket para eventos en tiempo real
rpc-ws-enabled=true
rpc-ws-host="0.0.0.0" 
rpc-ws-port=8546
rpc-ws-apis=["ETH","NET","WEB3"]

# === GRAPHQL (OPCIONAL) ===
# GraphQL para consultas avanzadas
graphql-http-enabled=true
graphql-http-host="0.0.0.0"
graphql-http-port=8547
graphql-http-cors-origins=["*"]

# === CONFIGURACIÓN DE SEGURIDAD ===
# Clave del nodo (solo para identidad P2P)
node-private-key-file="${config.options?.keyPath || './keys/' + config.name + '/key'}"

# Para producción, habilitar TLS:
# rpc-http-tls-enabled=true
# rpc-http-tls-keystore-file="./tls/keystore.p12"
# rpc-http-tls-keystore-password-file="./tls/password"

# === LOGGING Y MONITOREO ===
logging="${config.options?.logLevel || 'WARN'}"

# Métricas públicas para monitoreo
metrics-enabled=true
metrics-host="0.0.0.0"
metrics-port=9545

# === CONFIGURACIÓN DE RENDIMIENTO ===
# Gas limit estándar  
target-gas-limit=8000000
min-gas-price=1000000000

# Configuración del pool de transacciones
tx-pool="layered"
tx-pool-layer-max-capacity=4096
tx-pool-max-prioritized=1024
tx-pool-max-future-by-sender=200

# === FILTROS Y EVENTOS ===
# Configuración para manejo eficiente de logs y eventos
rpc-max-logs-range=5000

# NOTAS IMPORTANTES:
# - Xmx debe configurarse como variable de entorno: BESU_OPTS="-Xmx6g"
# - pruning-enabled no es opción TOML válida
# - rpc-http-max-batch-size no está disponible en todas las versiones
# - Para producción considerar reverse proxy (nginx)
# - Implementar rate limiting adicional
# - Configurar firewall específico
# - Monitoreo de uso de recursos`;
    }

    /**
     * Método helper para generar configuración basada en tipo
     */
    static generateConfig(config: BesuNodeConfig): string {
        switch (config.type) {
            case BesuNodeType.BOOTNODE:
                return this.generateBootnodeConfig(config);
            case BesuNodeType.SIGNER:
                return this.generateSignerConfig(config);
            case BesuNodeType.RPC:
                return this.generateRpcConfig(config);
            default:
                throw new Error(`Tipo de nodo no soportado: ${config.type}`);
        }
    }

    /**
     * Método para validar configuración antes de generar TOML
     */
    static validateConfig(config: BesuNodeConfig): string[] {
        const errors: string[] = [];

        // Validaciones generales
        if (!config.name) errors.push("El nombre del nodo es requerido");
        if (!config.network.ip) errors.push("La IP del nodo es requerida");
        if (!config.hostPort) errors.push("El puerto del nodo es requerido");

        // Validaciones específicas por tipo
        switch (config.type) {
            case BesuNodeType.SIGNER:
                if (!config.options?.minerCoinbase) {
                    errors.push("Signer requiere minerCoinbase (dirección del validador)");
                }
                if (!config.options?.keyPath) {
                    errors.push("Signer requiere keyPath (ruta a clave privada)");
                }
                break;
            
            case BesuNodeType.RPC:
                if (!config.options?.bootnodes) {
                    errors.push("RPC requiere bootnodes para sincronización");
                }
                break;
            
            case BesuNodeType.BOOTNODE:
                // Bootnode tiene requisitos mínimos
                break;
        }

        return errors;
    }
}


// Ejemplos de uso
// export const configExamples = {
//     bootnode: {
//         name: 'bootnode-01',
//         network: { name: 'dev-network', ip: '10.0.0.1' },
//         hostPort: 30301,
//         type: BesuNodeType.BOOTNODE,
//         options: {
//             dataPath: './data/bootnode-01',
//             genesisPath: './genesis.json',
//             keyPath: './keys/bootnode-01',
//             maxMemory: '1g',
//             logLevel: 'INFO'
//         }
//     },

//     signer: {
//         name: 'signer-01',
//         network: { name: 'dev-network', ip: '10.0.0.10' },
//         hostPort: 30303,
//         type: BesuNodeType.SIGNER,
//         options: {
//             minerEnabled: true,
//             minerCoinbase: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
//             minGasPrice: 0,
//             bootnodes: 'enode://bootnode@10.0.0.1:30301',
//             dataPath: './data/signer-01',
//             genesisPath: './genesis.json', 
//             keyPath: './keys/signer-01',
//             maxMemory: '4g',
//             logLevel: 'INFO'
//         }
//     },

//     rpc: {
//         name: 'rpc-gateway',
//         network: { name: 'dev-network', ip: '10.0.0.20' },
//         hostPort: 30303,
//         type: BesuNodeType.RPC,
//         options: {
//             minerEnabled: false,
//             bootnodes: 'enode://bootnode@10.0.0.1:30301',
//             dataPath: './data/rpc-gateway',
//             genesisPath: './genesis.json',
//             keyPath: './keys/rpc-gateway', 
//             maxMemory: '6g',
//             logLevel: 'WARN'
//         }
//     }
// };


export function createNodeConfigurationFiles(nodeConfig: BesuNodeConfig, nodeIdentity: {
    publicKey: string;
    privateKey: string;
    address: string;
    enode?: string;
}) {

    if (!nodeConfig.configPath) {
        throw new Error('Path to store the node configuration is not defined');
    }
    if (!nodeConfig.options?.keyPath) {
        throw new Error('Path to store the keys is not defined');
    }

    if (!fs.existsSync(nodeConfig.options?.keyPath)) {
        fs.mkdirSync(nodeConfig.options?.keyPath, { recursive: true });
    }

    fs.writeFileSync(`${nodeConfig.options?.keyPath}/key.priv`, nodeIdentity.privateKey);
    fs.writeFileSync(`${nodeConfig.options?.keyPath}/address`, nodeIdentity.address);
    if (nodeIdentity.enode) {
        fs.writeFileSync(`${nodeConfig.options?.keyPath}/enode`, nodeIdentity.enode);
    }

    const { filename, content } = generateTomlFile({
        name: nodeConfig.name,
        network: { name: nodeConfig.network.name, ip: nodeConfig.network.ip },
        hostPort: nodeConfig.hostPort,
        type: nodeConfig.type,
        options: {
            minerEnabled: nodeConfig.options?.minerEnabled,
            minerCoinbase: nodeIdentity.address,
            minGasPrice: nodeConfig.options?.minGasPrice,
            bootnodes: nodeConfig.options?.bootnodes,
            dataPath: nodeConfig.options?.dataPath,
            genesisPath: nodeConfig.options?.genesisPath,
            keyPath: nodeConfig.options?.keyPath,
            maxMemory: nodeConfig.options?.maxMemory,
            logLevel: nodeConfig.options?.logLevel,
        }
    });

    if (!fs.existsSync(nodeConfig.configPath)) {
        fs.mkdirSync(nodeConfig.configPath, { recursive: true });
    }
    fs.writeFileSync(`${nodeConfig.configPath}/${filename}`, content);

    return {
        privateKeyFile: `${nodeConfig.name}/keys/key.priv`,
        publicKeyFile: `${nodeConfig.name}/keys/key.pub`,
        addressFile: `${nodeConfig.name}/keys/address`,
        enodeFile: `${nodeConfig.name}/keys/enode`,
        configFile: `${nodeConfig.name}/config/${filename}`,
    }

}

// Función helper para generar y guardar configs
export function generateTomlFile(config: BesuNodeConfig): { content: string, filename: string, errors: string[] } {
    const errors = BesuTomlConfigFactory.validateConfig(config);
    
    if (errors.length > 0) {
        return { content: '', filename: '', errors };
    }

    const content = BesuTomlConfigFactory.generateConfig(config);
    const filename = `config-${config.name}.toml`;
    
    return { content, filename, errors: []};
}

