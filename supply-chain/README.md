# Supply Chain Tracker

Proyecto educativo de trazabilidad en la cadena de suministro sobre blockchain. Permite registrar, transferir y auditar productos desde el productor hasta el consumidor, garantizando transparencia y control de permisos en cada etapa.

## Demo

[Link a Loom](https://www.loom.com/share/71acccce3d9a49368e3ccd5135c76610)

Si encuentras algún problema para visualizar el video ponte en contacto conmigo.

## Características principales

- Contrato inteligente único (Solidity) para la gestión de roles, tokens y transferencias.
- Frontend moderno en React + TypeScript, con diseño responsivo y validaciones de usuario.
- Flujos tokenizados: Productor → Fábrica → Minorista → Consumidor, con aprobación requerida.
- Paginación eficiente y gestión de transferencias pendientes.
- Validación estricta de roles y permisos en cada acción.
- Eventos y auditoría en tiempo real.

## Estructura del proyecto

```
├── supply-chain-tracker/
    ├── sc/           # Contratos inteligentes (Foundry, Solidity)
    └── web/          # Frontend (React, Vite, TypeScript)

```

## Requisitos previos

- Node.js >= 18
- npm >= 10
- Git >= 2.50
- Foundry (Solidity toolkit)
- MetaMask (extensión navegador)

## Instalación y puesta en marcha

1. **Clona el repositorio:**

   ```bash
   git clone https://github.com/codecrypto-academy/jmvelasco.git
   cd supply-chain/
   ```

2. **Instala dependencias de contratos:**

Si foundry no está instalado, ejecutar:

   ```bash
   # Descargar e instalar foundryup
   curl -L https://foundry.paradigm.xyz | bash

   # Instalar las herramientas de Foundry
   foundryup
   ```

   ```bash
   cd sc
   forge install
   forge build
   forge test
   ```

3. **Instala dependencias del frontend:**

   ```bash
   cd ../web
   npm install
   ```

4. **Inicia la blockchain local (Anvil):**

   ```bash
   cd ../sc
   anvil
   ```

   (Mantén este terminal abierto)

5. **Despliega el contrato inteligente:**
   En otro terminal:

   ```bash
   cd sc
   forge script script/Deploy.s.sol:DeploySupplyChain \
     --rpc-url http://localhost:8545 \
     --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
     --broadcast
   ```

6. **Sincroniza la configuración del contrato en el frontend:**

   ```bash
   cd ../web
   npm run regen:contracts
   ```

7. **Inicia el servidor de desarrollo del frontend:**

   ```bash
   npm run dev
   ```

   Accede a `http://localhost:5173` en tu navegador.

8. **Configura MetaMask:**
   - Red: `Anvil Local` (RPC: `http://localhost:8545`, Chain ID: `31337`)
   - Importa las claves privadas de las cuentas de prueba (Admin, Productor, Fábrica, Minorista, Consumidor).

## Flujo de uso básico

1. **Conecta tu wallet y selecciona tu rol.**
2. **Solicita aprobación al administrador.**
3. **Crea tokens y realiza transferencias según tu rol:**
   - Productor → Fábrica
   - Fábrica → Minorista
   - Minorista → Consumidor
4. **Administra y audita transferencias desde el panel de administración.**

## Roles y permisos

- **Admin:** Aprueba usuarios y gestiona el sistema.
- **Productor:** Crea materias primas y transfiere a fábricas.
- **Fábrica:** Recibe materias primas, produce derivados y transfiere a minoristas.
- **Minorista:** Recibe productos y transfiere a consumidores.
- **Consumidor:** Recibe productos finales.

## Solución de problemas comunes

- **Error de conexión:** Verifica que Anvil esté corriendo y MetaMask esté en la red local.
- **No se muestra el dashboard correcto:** Sincroniza la configuración del contrato (`npm run regen:contracts`).
- **No puedes crear tokens o transferir:** Asegúrate de estar aprobado por el administrador y tener el rol correcto.

## Mantenimiento y desarrollo diario

1. Inicia Anvil: `cd sc && anvil`
2. Despliega el contrato si hay cambios: `forge script ...`
3. Sincroniza el frontend: `cd ../web && npm run regen:contracts`
4. Inicia el frontend: `npm run dev`
