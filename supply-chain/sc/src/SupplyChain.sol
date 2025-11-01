// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SupplyChain {
    // -----------------------------------------------------------
    // ESTRUCTURAS DE DATOS
    // -----------------------------------------------------------

    enum UserStatus {
        Pending,
        Approved,
        Rejected,
        Canceled
    }
    enum TransferStatus {
        Pending,
        Accepted,
        Rejected
    }

    struct Token {
        uint256 id;
        address creator;
        string name;
        uint256 totalSupply;
        string features; // JSON string para metadatos
        uint256 parentId;
        uint256 dateCreated;
        // struct no puede contener mappings, el balance se maneja externamente en tokenBalances
    }

    struct Transfer {
        uint256 id;
        address from;
        address to;
        uint256 tokenId;
        uint256 dateCreated;
        uint256 amount;
        TransferStatus status;
    }

    struct User {
        uint256 id;
        address userAddress;
        string role; // "Producer", "Factory", "Retailer", "Consumer", "Admin"
        UserStatus status;
    }

    // -----------------------------------------------------------
    // VARIABLES DE ESTADO
    // -----------------------------------------------------------

    address public admin;

    uint256 public nextTokenId = 1;
    uint256 public nextTransferId = 1;
    uint256 public nextUserId = 1;

    // Mapping: Token ID => Token
    mapping(uint256 => Token) public tokens;
    // Mapping: Transfer ID => Transfer
    mapping(uint256 => Transfer) public transfers;
    // Mapping: User ID => User
    mapping(uint256 => User) public users;
    // Mapping: User Address => User ID (Para búsqueda rápida)
    mapping(address => uint256) public addressToUserId;
    // Mapping: Token ID => User Address => Balance
    mapping(uint256 => mapping(address => uint256)) internal tokenBalances;
    // Mapping: User Address => List of Token IDs owned
    mapping(address => uint256[]) private userTokensList;

    // -----------------------------------------------------------
    // Pending transfers indexing for efficient pagination
    // -----------------------------------------------------------
    // Address-scoped arrays of pending transfer IDs
    mapping(address => uint256[]) private pendingBySender;
    mapping(address => uint256[]) private pendingByRecipient;
    // Position of a transferId within a sender/recipient array (index+1; 0 means absent)
    mapping(uint256 => uint256) private senderPos;
    mapping(uint256 => uint256) private recipientPos;
    // Fast guard to check if a transfer is currently pending
    mapping(uint256 => bool) private isPending;

    // -----------------------------------------------------------
    // EVENTOS
    // -----------------------------------------------------------

    event TokenCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string name,
        uint256 totalSupply
    );
    event TransferRequested(
        uint256 indexed transferId,
        address indexed from,
        address indexed to,
        uint256 tokenId,
        uint256 amount
    );
    event TransferAccepted(uint256 indexed transferId);
    event TransferRejected(uint256 indexed transferId);
    event UserRoleRequested(address indexed user, string role);
    event UserStatusChanged(address indexed user, UserStatus status);

    // -----------------------------------------------------------
    // CONSTRUCTOR
    // -----------------------------------------------------------

    constructor() {
        admin = msg.sender;
        // Auto-registro del admin como un usuario aprobado
        users[nextUserId] = User(
            nextUserId,
            msg.sender,
            "Admin",
            UserStatus.Approved
        );
        addressToUserId[msg.sender] = nextUserId;
        nextUserId++;
    }

    // -----------------------------------------------------------
    // MODIFICADORES
    // -----------------------------------------------------------

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "SupplyChain: Only admin can call this function."
        );
        _;
    }

    modifier onlyApprovedUser() {
        uint256 userId = addressToUserId[msg.sender];
        require(userId != 0, "SupplyChain: User not registered.");
        require(
            users[userId].status == UserStatus.Approved,
            "SupplyChain: User not approved."
        );
        _;
    }

    // -----------------------------------------------------------
    // Gestión de Usuarios
    // -----------------------------------------------------------

    /**
     * @notice Solicita un rol de usuario en el sistema de cadena de suministro
     * @dev Permite a una dirección solicitar uno de los roles válidos: Producer, Factory, Retailer, Consumer
     * @param _role El rol solicitado como string ("Producer", "Factory", "Retailer", "Consumer")
     * @custom:emits UserRoleRequested Emitido cuando se solicita un rol
     * @custom:require El rol debe ser válido (Producer, Factory, Retailer, Consumer)
     * @custom:require El admin no puede solicitar roles
     * @custom:require Un usuario aprobado no puede volver a solicitar un rol
     */
    function requestUserRole(string memory _role) public {
        // Validar que el rol sea válido
        require(
            keccak256(abi.encodePacked(_role)) ==
                keccak256(abi.encodePacked("Producer")) ||
                keccak256(abi.encodePacked(_role)) ==
                keccak256(abi.encodePacked("Factory")) ||
                keccak256(abi.encodePacked(_role)) ==
                keccak256(abi.encodePacked("Retailer")) ||
                keccak256(abi.encodePacked(_role)) ==
                keccak256(abi.encodePacked("Consumer")),
            "SupplyChain: Invalid role specified."
        );

        // Restringir que Admin cambie su rol
        if (msg.sender == admin) {
            revert("SupplyChain: Admin role cannot be requested.");
        }

        // Crear o actualizar la solicitud
        uint256 userId = addressToUserId[msg.sender];

        if (userId == 0) {
            // Nuevo usuario
            userId = nextUserId;
            addressToUserId[msg.sender] = userId;
            nextUserId++;
        } else {
            // Usuario existente que cambia de rol o vuelve a solicitar
            User memory existingUser = users[userId];
            // No permitir si ya está Aprobado
            require(
                existingUser.status != UserStatus.Approved,
                "SupplyChain: User is already approved."
            );
        }

        // Registrar o actualizar el usuario  
        users[userId] = User(
            userId,
            msg.sender,
            _role,
            UserStatus.Pending // Siempre inicia en estado Pending
        );

        // Emitir evento
        emit UserRoleRequested(msg.sender, _role);
    }

    /**
     * @notice Cambia el estado de un usuario en el sistema (solo Admin)
     * @dev Permite al administrador aprobar, rechazar o cancelar solicitudes de usuarios
     * @param userAddress La dirección del usuario cuyo estado se va a cambiar
     * @param newStatus El nuevo estado del usuario (Pending, Approved, Rejected, Canceled)
     * @custom:emits UserStatusChanged Emitido cuando se cambia el estado de un usuario
     * @custom:require Solo el administrador puede llamar esta función
     * @custom:require El administrador no puede cambiar su propio estado
     * @custom:require El usuario debe estar registrado en el sistema
     * @custom:require No se puede cambiar el estado del administrador principal
     */
    function changeStatusUser(
        address userAddress,
        UserStatus newStatus
    ) public onlyAdmin {

        // El administrador no puede cambiar su propio estado
        require(
            msg.sender != userAddress,
            "SupplyChain: Admin cannot change own status."
        );

        uint256 userId = addressToUserId[userAddress];

        // El usuario debe existir
        require(userId != 0, "SupplyChain: User not registered.");

        // No permitir cambiar el estado del Admin
        require(
            userAddress != admin,
            "SupplyChain: Cannot change Admin status."
        );

        // Actualizar el estado
        users[userId].status = newStatus;

        // Emitir evento
        emit UserStatusChanged(userAddress, newStatus);
    }

    /**
     * @notice Obtiene la información completa de un usuario por su dirección
     * @dev Retorna los datos del usuario incluyendo ID, dirección, rol y estado
     * @param userAddress La dirección del usuario a consultar
     * @return User struct con la información del usuario (id, userAddress, role, status)
     * @custom:return Si el usuario no existe, retorna un struct vacío con valores por defecto
     */
    function getUserInfo(
        address userAddress
    ) public view returns (User memory) {
        uint256 userId = addressToUserId[userAddress];
        if (userId == 0) {
            // Retorna un struct vacío si no existe
            return User(0, address(0), "", UserStatus.Pending);
        }
        return users[userId];
    }

    /**
     * @notice Verifica si una dirección corresponde al administrador del sistema
     * @dev Compara la dirección proporcionada con la dirección del administrador
     * @param userAddress La dirección a verificar
     * @return bool true si la dirección es del administrador, false en caso contrario
     */
    function isAdmin(address userAddress) public view returns (bool) {
        return userAddress == admin;
    }

    // -----------------------------------------------------------
    // Gestión de Tokens
    // -----------------------------------------------------------

    /**
     * @notice Crea un nuevo token en el sistema de cadena de suministro
     * @dev Permite a usuarios aprobados crear tokens según su rol y consume stock de tokens padre si aplica
     * @param name Nombre del token a crear
     * @param totalSupply Cantidad total del token (para materias primas) o cantidad a consumir (para productos derivados)
     * @param features Metadatos del token en formato JSON string
     * @param parentId ID del token padre (0 para materias primas, >0 para productos derivados)
     * @custom:emits TokenCreated Emitido cuando se crea un token exitosamente
     * @custom:require Solo usuarios aprobados pueden crear tokens
     * @custom:require Solo Producers pueden crear materias primas (parentId = 0)
     * @custom:require Solo Factory y Retailer pueden crear productos derivados (parentId > 0)
     * @custom:require El token padre debe existir para productos derivados
     * @custom:require El creador debe tener suficiente stock del token padre para productos derivados
     * @custom:effect Consume stock del token padre si es un producto derivado
     * @custom:effect Asigna el totalSupply del nuevo token al creador
     */
    function createToken(
        string memory name,
        uint256 totalSupply,
        string memory features,
        uint256 parentId
    ) public onlyApprovedUser {
        uint256 userId = addressToUserId[msg.sender];
        string memory userRole = users[userId].role;

        // Validaciones de Rol y Origen
        if (parentId == 0) {
            // Una materia prima solo puede ser creada el Producer
            require(
                keccak256(abi.encodePacked(userRole)) ==
                    keccak256(abi.encodePacked("Producer")),
                "SupplyChain: Only Producer can create raw material (parentId must be 0)."
            );
        } else {
            // Productos derivados no pueden ser creados por Producers
            require(
                keccak256(abi.encodePacked(userRole)) !=
                    keccak256(abi.encodePacked("Producer")),
                "SupplyChain: Producer cannot create derived products (parentId > 0)."
            );

            // 2b. Productos derivados solo pueden ser creados por Factory o Retailer
            bytes32 factoryHash = keccak256(abi.encodePacked("Factory"));
            bytes32 retailerHash = keccak256(abi.encodePacked("Retailer"));
            require(
                keccak256(abi.encodePacked(userRole)) == factoryHash ||
                    keccak256(abi.encodePacked(userRole)) == retailerHash,
                "SupplyChain: Only Factory or Retailer can create derived products (parentId > 0)."
            );

            // El token padre debe existir
            require(
                tokens[parentId].id != 0,
                "SupplyChain: Parent token does not exist."
            );

            // Lógica de Consumo de Stock:
            // 1. Validar que el creador tiene suficiente stock del token padre.
            require(
                tokenBalances[parentId][msg.sender] >= totalSupply, // totalSupply es la cantidad a CONSUMIR
                "SupplyChain: Insufficient parent token balance to create derived product."
            );

            // 2. Deducir la cantidad consumida del balance del creador
            tokenBalances[parentId][msg.sender] -= totalSupply;
        }

        // Se han pasado todas las validaciones: Creación del Token
        uint256 newId = nextTokenId;
        Token storage newToken = tokens[newId];
        newToken.id = newId;
        newToken.creator = msg.sender;
        newToken.name = name;
        newToken.totalSupply = totalSupply;
        newToken.features = features;
        newToken.parentId = parentId;
        newToken.dateCreated = block.timestamp;

        // Asignar Balance al creador del nuevo token
        tokenBalances[newId][msg.sender] = totalSupply;

        // Actualizar estado
        nextTokenId++;

        // Emitir evento
        emit TokenCreated(newId, msg.sender, name, totalSupply);
        
        // Añadir a la lista de tokens del usuario
        userTokensList[msg.sender].push(newId);
    }

    /**
     * @notice Obtiene la información completa de un token por su ID
     * @dev Retorna todos los datos del token incluyendo metadatos y información de creación
     * @param tokenId El ID del token a consultar
     * @return id ID del token
     * @return creator Dirección del creador del token
     * @return name Nombre del token
     * @return totalSupply Suministro total del token
     * @return features Metadatos del token en formato JSON
     * @return parentId ID del token padre (0 si es materia prima)
     * @return dateCreated Timestamp de creación del token
     * @custom:require El token debe existir en el sistema
     */
    function getToken(
        uint tokenId
    )
        public
        view
        returns (
            uint256 id,
            address creator,
            string memory name,
            uint256 totalSupply,
            string memory features,
            uint256 parentId,
            uint256 dateCreated
        )
    {
        require(tokens[tokenId].id != 0, "SupplyChain: Token does not exist.");
        Token storage token = tokens[tokenId];
        return (
            token.id,
            token.creator,
            token.name,
            token.totalSupply,
            token.features,
            token.parentId,
            token.dateCreated
        );
    }

    /**
     * @notice Obtiene el balance de un token específico para una dirección de usuario
     * @dev Consulta cuántas unidades de un token posee una dirección específica
     * @param tokenId El ID del token a consultar
     * @param userAddress La dirección del usuario cuyo balance se consulta
     * @return uint Cantidad de tokens que posee la dirección especificada
     */
    function getTokenBalance(
        uint tokenId,
        address userAddress
    ) public view returns (uint) {
        return tokenBalances[tokenId][userAddress];
    }

    /**
     * @notice Ajusta el balance de un token para un usuario específico (solo Admin)
     * @dev Función administrativa para simular transferencias o ajustar balances en pruebas
     * @param tokenId El ID del token cuyo balance se va a ajustar
     * @param user La dirección del usuario cuyo balance se va a modificar
     * @param amount La nueva cantidad del token para el usuario
     * @custom:require Solo el administrador puede llamar esta función
     * @custom:warning Esta función debe usarse con precaución ya que puede modificar balances arbitrariamente
     */
    function setTokenBalance(
        uint256 tokenId,
        address user,
        uint256 amount
    ) public onlyAdmin {
        tokenBalances[tokenId][user] = amount;
    }
    
    // -----------------------------------------------------------
    // Gestión de Transferencias
    // -----------------------------------------------------------

    /**
     * @notice Solicita una transferencia de tokens a otro usuario
     * @dev Crea una solicitud de transferencia que debe ser aceptada por el receptor
     * @param tokenId El ID del token a transferir
     * @param to La dirección del usuario receptor
     * @param amount La cantidad de tokens a transferir
     * @custom:emits TransferRequested Emitido cuando se solicita una transferencia
     * @custom:require Solo usuarios aprobados pueden solicitar transferencias
     * @custom:require Los Producers no pueden transferir productos derivados (parentId > 0)
     * @custom:require El receptor debe ser un usuario aprobado
     * @custom:require El solicitante debe tener suficiente balance del token
     * @custom:effect Crea una transferencia en estado Pending
     */
    function requestTransfer(uint256 tokenId, address to, uint256 amount) public onlyApprovedUser {        
        // Restricción de Rol para Transferencias
        uint256 parentId = tokens[tokenId].parentId;
        if (parentId > 0) {
            uint256 userId = addressToUserId[msg.sender];
            string memory userRole = users[userId].role;
            require(
                keccak256(abi.encodePacked(userRole)) != keccak256(abi.encodePacked("Producer")),
                "SupplyChain: Producer role cannot transfer derived products (parentId > 0)."
            );
        }
        
        // Validación del estado del receptor
        uint256 recipientId = addressToUserId[to];
        require(
            users[recipientId].status == SupplyChain.UserStatus.Approved,
            "SupplyChain: Recipient must be an approved user."
        );
        
        // Verificación de Balance
        uint256 balance = getTokenBalance(tokenId, msg.sender);
        require(balance >= amount, "SupplyChain: Insufficient balance.");
        
        // Registro de la solicitud de transferencia
        transfers[nextTransferId] = Transfer({
            id: nextTransferId,
            from: msg.sender,
            to: to,
            tokenId: tokenId,
            dateCreated: block.timestamp,
            amount: amount,
            status: TransferStatus.Pending // Estado inicial: Pendiente (0)
        });

    // Index as pending for paginated listing
    _indexPending(nextTransferId);

    // Emitir evento
        emit TransferRequested(nextTransferId, msg.sender, to, tokenId, amount);

        // Actualizar el id de la siguiente transferencia
        nextTransferId++;
    }

    /**
     * @notice Permite al receptor aceptar una transferencia pendiente, moviendo los balances
     * @dev Ejecuta la transferencia moviendo tokens del remitente al receptor
     * @param transferId El ID de la transferencia a aceptar
     * @custom:emits TransferAccepted Emitido cuando se acepta una transferencia
     * @custom:require Solo usuarios aprobados pueden aceptar transferencias
     * @custom:require La transferencia debe existir
     * @custom:require Solo el receptor puede aceptar la transferencia
     * @custom:require La transferencia debe estar en estado Pending
     * @custom:require El remitente debe tener suficiente balance
     * @custom:effect Transfiere tokens del remitente al receptor
     * @custom:effect Cambia el estado de la transferencia a Accepted
     */
    function acceptTransfer(uint256 transferId) public onlyApprovedUser {
        Transfer storage t = transfers[transferId];

        // Validaciones
        require(t.id != 0, "SupplyChain: Transfer does not exist.");
        require(t.to == msg.sender, "SupplyChain: Only the recipient can accept this transfer.");
        require(t.status == TransferStatus.Pending, "SupplyChain: Transfer is not Pending.");
        
        // Verificación de balance
        uint256 senderBalance = getTokenBalance(t.tokenId, t.from);
        require(senderBalance >= t.amount, "SupplyChain: Insufficient balance on sender side.");
        
        // Ejecución de la transferencia (movimiento de balances)
        tokenBalances[t.tokenId][t.from] -= t.amount;
        tokenBalances[t.tokenId][t.to] += t.amount;

    // Actualizar estado de la transferencia
    t.status = TransferStatus.Accepted;

    // Remove from pending indices
    _unindexPending(transferId);

    // Emitir evento
        emit TransferAccepted(transferId);
    }

    /**
     * @notice Permite al receptor rechazar una transferencia pendiente
     * @dev Cancela la transferencia sin mover tokens
     * @param transferId El ID de la transferencia a rechazar
     * @custom:emits TransferRejected Emitido cuando se rechaza una transferencia
     * @custom:require Solo usuarios aprobados pueden rechazar transferencias
     * @custom:require La transferencia debe existir
     * @custom:require Solo el receptor puede rechazar la transferencia
     * @custom:require La transferencia debe estar en estado Pending
     * @custom:effect Cambia el estado de la transferencia a Rejected
     * @custom:note No se mueven tokens al rechazar una transferencia
     */
    function rejectTransfer(uint256 transferId) public onlyApprovedUser {
        Transfer storage t = transfers[transferId];

        // Validaciones
        require(t.id != 0, "SupplyChain: Transfer does not exist.");
        require(t.to == msg.sender, "SupplyChain: Only the recipient can reject this transfer.");
        require(t.status == TransferStatus.Pending, "SupplyChain: Transfer is not Pending.");
        
    // // Actualizar estado de la transferencia
    t.status = TransferStatus.Rejected;

    // Remove from pending indices
    _unindexPending(transferId);

    // Emitir evento
        emit TransferRejected(transferId);
    }

    // -----------------------------------------------------------
    // Internal helpers for index maintenance
    // -----------------------------------------------------------

    function _indexPending(uint256 transferId) internal {
        Transfer storage t = transfers[transferId];
        isPending[transferId] = true;

        // Sender side
        pendingBySender[t.from].push(transferId);
        senderPos[transferId] = pendingBySender[t.from].length; // index+1

        // Recipient side
        pendingByRecipient[t.to].push(transferId);
        recipientPos[transferId] = pendingByRecipient[t.to].length; // index+1
    }

    function _unindexPending(uint256 transferId) internal {
        if (!isPending[transferId]) return;
        Transfer storage t = transfers[transferId];

        // Sender side removal
        uint256 sPos = senderPos[transferId];
        if (sPos != 0) {
            uint256 sIdx = sPos - 1;
            uint256[] storage arrS = pendingBySender[t.from];
            uint256 lastSIdx = arrS.length - 1;
            if (sIdx != lastSIdx) {
                uint256 movedIdS = arrS[lastSIdx];
                arrS[sIdx] = movedIdS;
                senderPos[movedIdS] = sIdx + 1;
            }
            arrS.pop();
            senderPos[transferId] = 0;
        }

        // Recipient side removal
        uint256 rPos = recipientPos[transferId];
        if (rPos != 0) {
            uint256 rIdx = rPos - 1;
            uint256[] storage arrR = pendingByRecipient[t.to];
            uint256 lastRIdx = arrR.length - 1;
            if (rIdx != lastRIdx) {
                uint256 movedIdR = arrR[lastRIdx];
                arrR[rIdx] = movedIdR;
                recipientPos[movedIdR] = rIdx + 1;
            }
            arrR.pop();
            recipientPos[transferId] = 0;
        }

        isPending[transferId] = false;
    }

    /**
     * @notice Obtiene la información completa de una transferencia por su ID
     * @dev Retorna todos los datos de la transferencia incluyendo estado y participantes
     * @param transferId El ID de la transferencia a consultar
     * @return Transfer struct con la información completa de la transferencia
     * @custom:require La transferencia debe existir en el sistema
     */
    function getTransfer(
        uint transferId
    ) public view returns (Transfer memory) {
        Transfer storage t = transfers[transferId];

        // Validación de existencia
        require(t.id != 0, "SupplyChain: Transfer does not exist.");

        return t;
    }

    // -----------------------------------------------------------
    // Pending transfers pagination (sender/recipient)
    // -----------------------------------------------------------

    function getPendingBySender(
        address sender,
        uint256 offset,
        uint256 limit
    ) public view returns (Transfer[] memory items, uint256 total) {
        uint256[] storage ids = pendingBySender[sender];
        total = ids.length;
        if (offset >= total) {
            return (new Transfer[](0), total);
        }
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        uint256 sliceLen = end - offset;
        Transfer[] memory temp = new Transfer[](sliceLen);
        uint256 count = 0;
        for (uint256 i = offset; i < end; i++) {
            uint256 id = ids[i];
            Transfer storage t2 = transfers[id];
            if (isPending[id] && t2.status == TransferStatus.Pending) {
                temp[count] = t2;
                count++;
            }
        }
        items = new Transfer[](count);
        for (uint256 j = 0; j < count; j++) {
            items[j] = temp[j];
        }
        return (items, total);
    }

    function getPendingByRecipient(
        address recipient,
        uint256 offset,
        uint256 limit
    ) public view returns (Transfer[] memory items, uint256 total) {
        uint256[] storage ids = pendingByRecipient[recipient];
        total = ids.length;
        if (offset >= total) {
            return (new Transfer[](0), total);
        }
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        uint256 sliceLen = end - offset;
        Transfer[] memory temp = new Transfer[](sliceLen);
        uint256 count = 0;
        for (uint256 i = offset; i < end; i++) {
            uint256 id = ids[i];
            Transfer storage t2 = transfers[id];
            if (isPending[id] && t2.status == TransferStatus.Pending) {
                temp[count] = t2;
                count++;
            }
        }
        items = new Transfer[](count);
        for (uint256 j = 0; j < count; j++) {
            items[j] = temp[j];
        }
        return (items, total);
    }

    // -----------------------------------------------------------
    // Historial del Token
    // -----------------------------------------------------------

    /**
     * @notice Devuelve el linaje (árbol genealógico) de un token, rastreando los IDs de sus padres hasta el origen
     * @dev Recorre la cadena de tokens padre hasta encontrar la materia prima original (parentId = 0)
     * @param tokenId El ID del token a consultar
     * @return uint256[] Array con los IDs de los tokens padre, empezando por el padre inmediato hasta la materia prima
     * @custom:return Array vacío si el token es una materia prima (parentId = 0)
     * @custom:return Array ordenado desde el padre inmediato hasta el origen de la cadena
     */
    function getTokenLineage(uint256 tokenId) public view returns (uint256[] memory) {
        // La lista de linaje se construirá aquí. Inicialmente, no sabemos su tamaño.
        uint256[] memory lineage; 
        
        // TODO: Mejorar la eficiencia
        // En Solidity, es más eficiente usar un array temporal con un tamaño máximo conocido 
        // o determinar la longitud primero. Pero lo haremos iterativamente para mayor claridad.
        
        uint256 currentId = tokenId;
        uint256 currentParentId = tokens[currentId].parentId;

        // Primero, contamos el número de padres para dimensionar el array de forma eficiente.
        uint256 lineageCount = 0;
        uint256 tempId = tokenId;
        while (tokens[tempId].parentId != 0) {
            lineageCount++;
            tempId = tokens[tempId].parentId;
        }

        // Si no hay padres (es un token raw), devolvemos un array vacío.
        if (lineageCount == 0) {
            return new uint256[](0);
        }
        
        // Creamos el array de linaje con el tamaño exacto.
        lineage = new uint256[](lineageCount);
        uint256 index = 0;

        // Volvemos al token original e iteramos para llenar el array.
        currentId = tokenId;
        currentParentId = tokens[currentId].parentId;

        while (currentParentId != 0) {
            // El padre actual es el ID que rastreamos
            lineage[index] = currentParentId;
            
            // Movemos el puntero al padre del padre (siguiente eslabón de la cadena)
            currentId = currentParentId;
            currentParentId = tokens[currentId].parentId;
            
            index++;
        }

        // Devolver linaje completo desde el padre inmediato hasta el origen.        
        return lineage;
    }

    // -----------------------------------------------------------
    // Funciones auxiliares
    // -----------------------------------------------------------
    
    /**
     * @notice Obtiene la lista de tokens creados por un usuario
     * @dev Retorna los IDs de todos los tokens que ha creado la dirección especificada
     * @param userAddress La dirección del usuario cuyos tokens se consultan
     * @return uint256[] Array con los IDs de los tokens creados por el usuario
     * @custom:note Esta función rastrea tokens creados, no tokens poseídos (balance)
     */
    function getUserTokens(
        address userAddress
    ) public view returns (uint256[] memory) {
        return userTokensList[userAddress];
    }

    /**
     * @notice Obtiene la lista completa de todos los usuarios registrados en el sistema (solo Admin)
     * @dev Retorna un array con todos los usuarios incluyendo sus roles y estados
     * @return User[] Array con todos los usuarios registrados en el sistema
     * @custom:require Solo el administrador puede llamar esta función
     * @custom:return Incluye todos los usuarios desde el ID 1 hasta el último registrado
     */
    function getAllUsers() public onlyAdmin view returns (User[] memory) {
        User[] memory allUsers = new User[](nextUserId - 1);
        for (uint256 i = 1; i < nextUserId; i++) {
            allUsers[i - 1] = users[i];
        }
        return allUsers;
    }

    
}
