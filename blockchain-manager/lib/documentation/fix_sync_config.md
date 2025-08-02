# Fix para Problema de Peer Discovery en Red Besu PoA

## Problema Identificado
El signer está configurado con `sync-mode="SNAP"` que requiere al menos 5 peers válidos, pero la red solo tiene 4 nodos totales.

## Solución
Cambiar el sync-mode del signer a "FULL" para redes PoA pequeñas.

## Comandos para Aplicar el Fix

### 1. Detener los contenedores
```bash
docker stop signer bootnode RPC_8590_NODE RPC_8592_NODE RPC_8593_NODE
```

### 2. Modificar configuración del signer
```bash
# Backup de la configuración actual
cp besu-network/signer/config/config-signer.toml besu-network/signer/config/config-signer.toml.backup

# Cambiar SNAP a FULL
sed -i 's/sync-mode="SNAP"/sync-mode="FULL"/' besu-network/signer/config/config-signer.toml
```

### 3. Verificar el cambio
```bash
grep sync-mode besu-network/signer/config/config-signer.toml
```

### 4. Reiniciar los contenedores en orden correcto
```bash
# Primero bootnode
docker start bootnode
sleep 5

# Luego signer
docker start signer
sleep 5

# Finalmente nodos RPC
docker start RPC_8590_NODE RPC_8592_NODE RPC_8593_NODE
```

### 5. Verificar que funciona
```bash
# Ver logs del signer - debería empezar a sincronizar
docker logs --tail 20 signer

# Verificar que encuentra peers
docker logs signer | grep -i peer
```

## Explicación Técnica
- **SNAP sync**: Requiere múltiples peers para descargar snapshots del estado
- **FULL sync**: Sincroniza desde el genesis, adecuado para redes pequeñas
- En redes PoA con pocos nodos, FULL sync es más confiable que SNAP sync
