// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SupplyChain} from "../src/SupplyChain.sol";

contract SupplyChainTest is Test {
    SupplyChain public supplyChain;

    // Cuentas de prueba predefinidas por Anvil
    address constant ADMIN =
        address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    address constant PRODUCER_ADDRESS =
        address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
    address constant FACTORY_ADDRESS =
        address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
    address constant RETAILER_ADDRESS =
        address(0x90F79bf6EB2c4f870365E785982E1f101E93b906);
    address constant CONSUMER_ADDRESS =
        address(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);

    function setUp() public {
        // 1. Decirle a Foundry que el próximo msg.sender será el ADMIN predefinido (0xf39...)
        vm.startPrank(ADMIN);

        // 2. Inicializa el contrato. Ahora msg.sender es ADMIN.
        supplyChain = new SupplyChain();

        // 3. Detener la suplantación de identidad.
        vm.stopPrank();
        // Verificar que el constructor haya configurado correctamente el admin
        assertEq(supplyChain.admin(), ADMIN, "Setup: Admin address mismatch.");
    }

    event TransferAccepted(uint256 indexed transferId);

    // Tests de gestión de usuarios
    function testUserRegistration() public {
        // 1. Arrange: Cambiamos el remitente a una dirección de prueba (Producer).
        vm.prank(PRODUCER_ADDRESS);

        // 2. Act: Llamamos a la función que aún no está implementada.
        supplyChain.requestUserRole("Producer");

        // 3. Assert
        // Verificamos que el usuario ahora esté en estado Pending.
        SupplyChain.User memory user = supplyChain.getUserInfo(
            PRODUCER_ADDRESS
        );

        assertEq(
            user.userAddress,
            PRODUCER_ADDRESS,
            "User address must match."
        );
        assertEq(
            uint8(user.status),
            uint8(SupplyChain.UserStatus.Pending),
            "User status must be Pending after request."
        );
        assertEq(
            keccak256(abi.encodePacked(user.role)),
            keccak256(abi.encodePacked("Producer")),
            "User role must be Producer."
        );
    }

    function testAdminApproveUser() public {
        address userToApprove = PRODUCER_ADDRESS;

        // 1. Arrange: El usuario solicita el rol.
        vm.prank(userToApprove);
        supplyChain.requestUserRole("Producer");

        // Verificamos que esté en Pending.
        SupplyChain.User memory userBefore = supplyChain.getUserInfo(
            userToApprove
        );
        assertEq(
            uint8(userBefore.status),
            uint8(SupplyChain.UserStatus.Pending),
            "Pre-condition: User must be Pending."
        );

        // 2. Act: El Admin aprueba la solicitud.
        vm.prank(ADMIN);
        supplyChain.changeStatusUser(
            userToApprove,
            SupplyChain.UserStatus.Approved
        );

        // 3. Assert: Verificamos que el estado del usuario haya cambiado a Approved.
        SupplyChain.User memory userAfter = supplyChain.getUserInfo(
            userToApprove
        );
        assertEq(
            uint8(userAfter.status),
            uint8(SupplyChain.UserStatus.Approved),
            "Post-condition: User status must be Approved."
        );
    }

    function testOnlyAdminCanChangeStatus() public {
        address nonAdmin = PRODUCER_ADDRESS;
        address userToChange = FACTORY_ADDRESS;

        // 1. Arrange: Factory solicita rol.
        vm.prank(userToChange);
        supplyChain.requestUserRole("Factory");

        // 2. Act & Assert (Revert esperado): Intentar cambiar el estado como un usuario NO-Admin
        vm.prank(nonAdmin);

        // Assert que la transacción revierta con el mensaje esperado del modificador 'onlyAdmin'.
        // Nota: Foundry revierte automáticamente si se usa 'expectRevert' con una llamada.
        vm.expectRevert("SupplyChain: Only admin can call this function.");
        supplyChain.changeStatusUser(
            userToChange,
            SupplyChain.UserStatus.Approved
        );
    }

    function testAdminRejectUser() public {
        address userToReject = RETAILER_ADDRESS;

        // 1. Arrange: Retailer solicita rol.
        vm.prank(userToReject);
        supplyChain.requestUserRole("Retailer");

        // Verificamos que esté en Pending.
        SupplyChain.User memory userBefore = supplyChain.getUserInfo(
            userToReject
        );
        assertEq(
            uint8(userBefore.status),
            uint8(SupplyChain.UserStatus.Pending),
            "Pre-condition: User must be Pending."
        );

        // 2. Act: El Admin rechaza la solicitud.
        vm.prank(ADMIN);
        supplyChain.changeStatusUser(
            userToReject,
            SupplyChain.UserStatus.Rejected
        );

        // 3. Assert: Verificamos que el estado del usuario haya cambiado a Rejected.
        SupplyChain.User memory userAfter = supplyChain.getUserInfo(
            userToReject
        );
        assertEq(
            uint8(userAfter.status),
            uint8(SupplyChain.UserStatus.Rejected),
            "Post-condition: User status must be Rejected."
        );
    }

    function testOnlyApprovedUsersCanOperate() public {
        address producer = PRODUCER_ADDRESS;

        // 1. Caso 1: Usuario No Registrado (ROJO esperado)
        vm.prank(producer);
        vm.expectRevert("SupplyChain: User not registered.");
        supplyChain.createToken("TokenName", 100, "{}", 0);

        // 2. Arrange: Registrar al usuario. Ahora está en PENDING.
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");

        // 3. Caso 2: Usuario PENDIENTE (ROJO esperado)
        vm.prank(producer);
        vm.expectRevert("SupplyChain: User not approved.");
        supplyChain.createToken("TokenName", 100, "{}", 0);

        // 4. Arrange: Admin aprueba al usuario.
        vm.prank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);

        // 5. Caso 3: Usuario APROBADO (VERDE esperado)
        vm.prank(producer);
        // We don't expect a revert, just a successful call
        supplyChain.createToken("TokenName", 100, "{}", 0);
        // Assert on a meaningful state change if the function returns void or something else
        // For example, check if the token count increased or if the token exists.
        assertTrue(
            supplyChain.nextTokenId() > 1,
            "Token should have been created."
        );
        /*
        // Original assertion - remove if createToken returns void
        assertTrue(
            supplyChain.createToken(),
            "Approved user must be able to operate."
        );
        */
    }

    function testCreateTokenByProducer() public {
        address producer = PRODUCER_ADDRESS;
        string memory tokenName = "Wheat Grain";
        uint256 initialSupply = 1000;
        string memory tokenFeatures = '{"country": "Spain", "year": 2025}';

        // 1. Arrange: El Producer solicita y es aprobado (Pre-condición de 'onlyApprovedUser').
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);

        // 2. Act: El Producer crea el token de materia prima (parentId = 0).
        vm.prank(producer);
        // La función aún no está implementada, por lo que este test debería fallar.
        supplyChain.createToken(tokenName, initialSupply, tokenFeatures, 0);

        // 3. Assert (ROJO esperado inicialmente)
        uint256 tokenId = 1; // Primer token, id = 1

        // Verificamos el balance del creador y los detalles del token.
        assertEq(
            supplyChain.getTokenBalance(tokenId, producer),
            initialSupply,
            "Producer balance must equal initial supply."
        );

        // Verificamos los datos básicos del token usando getToken (que aún debemos implementar).
        (
            uint256 id,
            address creator,
            string memory name,
            uint256 totalSupply,
            string memory features,
            uint256 parentId,

        ) = supplyChain.getToken(tokenId);

        assertEq(id, tokenId, "Token ID must be 1.");
        assertEq(creator, producer, "Creator must be Producer.");
        assertEq(totalSupply, initialSupply, "Total supply must match.");
        assertEq(parentId, 0, "Parent ID must be 0 for raw material.");
        assertEq(
            keccak256(abi.encodePacked(name)),
            keccak256(abi.encodePacked(tokenName)),
            "Token name must match."
        );
        assertEq(
            keccak256(abi.encodePacked(features)),
            keccak256(abi.encodePacked(tokenFeatures)),
            "Features must match."
        );
    }

    function testOnlyProducerCanCreateRawMaterial() public {
        address factory = FACTORY_ADDRESS;

        // 1. Arrange: Factory solicita y es aprobado.
        vm.prank(factory);
        supplyChain.requestUserRole("Factory");
        vm.prank(ADMIN);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);

        // 2. Act & Assert (Revert esperado): Intentar crear materia prima (parentId = 0) como Factory.
        vm.prank(factory);
        vm.expectRevert(
            "SupplyChain: Only Producer can create raw material (parentId must be 0)."
        );
        supplyChain.createToken("Flour", 500, "{}", 0);
    }

    function testCreateTokenByFactory() public {
        address producer = PRODUCER_ADDRESS;
        address factory = FACTORY_ADDRESS;
        uint256 rawMaterialId = 1;
        uint256 rawSupply = 1000;
        uint256 derivedProductSupply = 500; // La Factory consumirá 500 para producir
        string memory derivedName = "Processed Flour";

        // 1. Arrange (Pre-condición de la Cadena de Suministro)

        // A. Aprobar Producer y Factory
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(factory);
        supplyChain.requestUserRole("Factory");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        // B. El Producer crea la materia prima (Raw Material)
        vm.prank(producer);
        supplyChain.createToken("Wheat", rawSupply, "{}", 0); // Token #1 creado con 1000 stock

        // 🟢 INYECCIÓN DE LA SOLUCIÓN: SIMULACIÓN DE TRANSFERENCIA DE STOCK
        // Para que la Factory pueda consumir 500, primero debe tener el stock de Token #1.
        vm.startPrank(ADMIN);
        // Transferir el stock del Producer (1000) al Factory.
        supplyChain.setTokenBalance(rawMaterialId, producer, 0); // Producer pierde 1000
        supplyChain.setTokenBalance(rawMaterialId, factory, rawSupply); // Factory gana 1000
        vm.stopPrank();

        // 2. Act: El Factory crea el producto derivado (parentId = 1).
        vm.prank(factory);
        supplyChain.createToken(
            derivedName,
            derivedProductSupply, // Consume 500 del stock que acaba de recibir
            "{}",
            rawMaterialId
        );

        // 3. Assert (VERDE esperado)
        uint256 derivedTokenId = 2; // Segundo token creado

        // Verificamos los datos básicos del token derivado
        (
            uint256 id,
            address creator,
            string memory name,
            uint256 totalSupply,
            ,
            uint256 parentId,

        ) = supplyChain.getToken(derivedTokenId);

        assertEq(id, derivedTokenId, "Token ID must be 2.");
        assertEq(creator, factory, "Creator must be Factory.");
        assertEq(totalSupply, derivedProductSupply, "Total supply must match.");
        assertEq(parentId, rawMaterialId, "Parent ID must be 1.");
        assertEq(
            keccak256(abi.encodePacked(name)),
            keccak256(abi.encodePacked(derivedName)),
            "Token name must match."
        );

        // Verificamos el balance del token derivado
        assertEq(
            supplyChain.getTokenBalance(derivedTokenId, factory),
            derivedProductSupply,
            "Factory must own the derived supply."
        );

        // 🟢 NUEVO ASSERT DE LIMPIEZA: Verificar que el balance del token padre fue deducido
        // Balance esperado: 1000 (inicial) - 500 (consumido) = 500
        uint256 expectedRemainingRawSupply = rawSupply - derivedProductSupply;
        assertEq(
            supplyChain.getTokenBalance(rawMaterialId, factory),
            expectedRemainingRawSupply,
            "Raw material balance must be correctly deducted after production."
        );
    }

    function testCreateTokenByRetailer() public {
        address producer = PRODUCER_ADDRESS;
        address retailer = RETAILER_ADDRESS;
        uint256 rawMaterialId = 1;
        uint256 rawSupply = 1000;
        uint256 derivedProductSupply = 500; // El Retailer consumirá 500 para producir
        string memory derivedName = "Packaged Goods";

        // 1. Arrange: Configurar roles y crear token padre.

        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(retailer);
        supplyChain.requestUserRole("Retailer");

        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(retailer, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        // Aseguramos que el Producer ya tiene un token que transferir
        vm.prank(producer);
        supplyChain.createToken("Raw Plastic", rawSupply, "{}", 0); // Token #1 creado con 1000 stock

        // 🟢 INYECCIÓN DE LA SOLUCIÓN: SIMULACIÓN DE TRANSFERENCIA DE STOCK
        // El Retailer debe tener el balance del token padre (Token #1) para poder consumirlo.
        vm.startPrank(ADMIN);
        // Transferir el stock del Producer (1000) al Retailer.
        supplyChain.setTokenBalance(rawMaterialId, producer, 0); // Producer pierde 1000
        supplyChain.setTokenBalance(rawMaterialId, retailer, rawSupply); // Retailer gana 1000
        vm.stopPrank();

        // 2. Act: El Retailer crea el producto derivado (parentId = 1).
        vm.prank(retailer);
        supplyChain.createToken(
            derivedName,
            derivedProductSupply, // Consume 500 del stock que acaba de recibir
            "{}",
            rawMaterialId
        );

        // 3. Assert (VERDE esperado)
        uint256 derivedTokenId = 2; // Token derivado

        // Verificamos los datos básicos del token derivado
        (
            uint256 id,
            address creator,
            string memory name,
            uint256 totalSupply,
            ,
            uint256 parentId,

        ) = supplyChain.getToken(derivedTokenId);

        assertEq(id, derivedTokenId, "Token ID must be 2.");
        assertEq(creator, retailer, "Creator must be Retailer.");
        assertEq(
            keccak256(abi.encodePacked(name)),
            keccak256(abi.encodePacked(derivedName)),
            "Token name must match."
        );
        assertEq(totalSupply, derivedProductSupply, "Total supply must match.");
        assertEq(parentId, rawMaterialId, "Parent ID must be 1.");

        // 🟢 NUEVO ASSERT DE LIMPIEZA: Verificar que el balance del token padre fue deducido
        // Balance esperado: 1000 (inicial) - 500 (consumido) = 500
        uint256 expectedRemainingRawSupply = rawSupply - derivedProductSupply;
        assertEq(
            supplyChain.getTokenBalance(rawMaterialId, retailer),
            expectedRemainingRawSupply,
            "Raw material balance must be correctly deducted after production."
        );
    }

    function testOnlyFactoryAndRetailerCanCreateDerivedTokens() public {
        address consumer = CONSUMER_ADDRESS;
        address producer = PRODUCER_ADDRESS;
        uint256 rawMaterialId = 1;

        // 1. Arrange: Aprobar Consumer, Producer.
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(consumer);
        supplyChain.requestUserRole("Consumer");

        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(consumer, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        // 2. Arrange: Crear token padre.
        vm.prank(producer);
        supplyChain.createToken("Raw Plastic", 1000, "{}", 0); // Token #1

        // 3. Act & Assert (ROJO esperado/fallo deseado): Intentar crear un token derivado como Consumer.
        vm.prank(consumer);

        // El Consumer NO es Producer, por lo que el require(rol != Producer) PASA.
        // Pero el test debe REVERTIR para forzar la implementación restrictiva.
        vm.expectRevert(
            "SupplyChain: Only Factory or Retailer can create derived products (parentId > 0)."
        );
        supplyChain.createToken("Consumer Item", 10, "{}", rawMaterialId);

        // 4. Verificación Implícita: Factory y Retailer (ya probados) deben seguir funcionando.
    }

    function testFactoryConsumesParentToken() public {
        address producer = PRODUCER_ADDRESS;
        address factory = FACTORY_ADDRESS;
        uint256 rawSupply = 1000;
        uint256 derivedSupply = 300;

        // 1. Arrange: Configuración de roles y aprobación
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(factory);
        supplyChain.requestUserRole("Factory");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        // A. Producer crea la materia prima (Token #1)
        vm.prank(producer);
        supplyChain.createToken("Wood", rawSupply, "{}", 0);
        uint256 rawTokenId = 1;

        // B. SIMULACIÓN DE TRANSFERENCIA: La Factory recibe la materia prima del Producer.
        // 🚨 PRE-CONDICIÓN: Esto requiere la función auxiliar 'setTokenBalance(..)'
        // y que 'tokenBalances' sea 'internal'/'public' para poder testear el consumo.
        vm.startPrank(ADMIN);
        // Transferir el balance del Producer al Factory
        supplyChain.setTokenBalance(rawTokenId, producer, 0); // Producer pierde 1000
        supplyChain.setTokenBalance(rawTokenId, factory, rawSupply); // Factory gana 1000
        vm.stopPrank();

        // 2. Arrange: Verificar balance ANTES del consumo
        uint256 balanceBefore = supplyChain.getTokenBalance(
            rawTokenId,
            factory
        );
        assertEq(
            balanceBefore,
            rawSupply,
            "Pre-condition: Factory must have full raw supply before consumption."
        );

        // 3. Act: Factory crea el producto derivado (Token #2), que consume 300 del Token #1.
        vm.prank(factory);
        supplyChain.createToken("Table", derivedSupply, "{}", rawTokenId); // Token #2

        // 4. Assert (FALLO ESPERADO): Verificar la deducción de balance.
        // Esperamos 700 (1000 - 300), pero el contrato dará 1000 (porque no hay lógica de consumo aún).
        uint256 expectedBalanceAfter = rawSupply - derivedSupply; // 1000 - 300 = 700
        uint256 actualBalanceAfter = supplyChain.getTokenBalance(
            rawTokenId,
            factory
        );

        // ESTE ASSERT FALLARÁ (ROJO) hasta que implementes la deducción en createToken.
        assertEq(
            actualBalanceAfter,
            expectedBalanceAfter,
            "Post-condition: Balance of parent token must be consumed (Deduction logic missing)."
        );

        // 5. Assert de Restricción (ROJO ESPERADO): Intentar consumir más de lo que se tiene.
        uint256 excessiveSupply = 800; // El balance restante es 700.
        vm.prank(factory);
        // ESTE REVERT FALLARÁ (ROJO) si aún no tienes la validación de balance en createToken.
        vm.expectRevert(
            "SupplyChain: Insufficient parent token balance to create derived product."
        );
        supplyChain.createToken(
            "Large Table",
            excessiveSupply,
            "{}",
            rawTokenId
        );
    }

    // Obosleto por ahora, ya que transferToken fue renombrado a requestTransfer
    // function testTokenTransferSuccess() public {
    //     address producer = PRODUCER_ADDRESS; // Remitente (Sender)
    //     address retailer = RETAILER_ADDRESS; // Receptor (Receiver)
    //     uint256 tokenId = 1;
    //     uint256 initialSupply = 1000;
    //     uint256 transferAmount = 300;

    //     // 1. Arrange: Configuración de roles y creación del token.
    //     // A. Aprobar Producer y Retailer
    //     vm.prank(producer);
    //     supplyChain.requestUserRole("Producer");
    //     vm.prank(retailer);
    //     supplyChain.requestUserRole("Retailer");
    //     vm.startPrank(ADMIN);
    //     supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
    //     supplyChain.changeStatusUser(retailer, SupplyChain.UserStatus.Approved);
    //     vm.stopPrank();

    //     // B. El Producer crea la materia prima (Raw Material).
    //     vm.prank(producer);
    //     supplyChain.createToken("Raw Cotton", initialSupply, "{}", 0);
    //     // Producer ahora tiene 1000 unidades del Token #1.

    //     // 2.1 Act: Se revierte cuando el Producer transfiere mas unidades al Retailer de las que dispone.
    //     vm.prank(producer);
    //     vm.expectRevert("SupplyChain: Insufficient balance.");
    //     supplyChain.transferToken(
    //         tokenId,
    //         retailer, // Dirección de destino
    //         transferAmount * 100 // Cantidad a transferir
    //     );

    //     // 2.2 Act: El Producer transfiere 300 unidades al Retailer.
    //     vm.prank(producer);
    //     supplyChain.transferToken(
    //         tokenId,
    //         retailer, // Dirección de destino
    //         transferAmount // Cantidad a transferir
    //     );

    //     // Verificación de balance del Remitente (Producer)
    //     uint256 expectedProducerBalance = initialSupply - transferAmount; // 1000 - 300 = 700
    //     uint256 actualProducerBalance = supplyChain.getTokenBalance(
    //         tokenId,
    //         producer
    //     );
    //     assertEq(
    //         actualProducerBalance,
    //         expectedProducerBalance,
    //         "Post-condition: Sender balance must be reduced by the transfer amount."
    //     );

    //     // Verificación de balance del Receptor (Retailer)
    //     uint256 expectedRetailerBalance = transferAmount; // 0 + 300 = 300
    //     uint256 actualRetailerBalance = supplyChain.getTokenBalance(
    //         tokenId,
    //         retailer
    //     );
    //     assertEq(
    //         actualRetailerBalance,
    //         expectedRetailerBalance,
    //         "Post-condition: Receiver balance must be increased by the transfer amount."
    //     );
    // }

    function testProducerCannotTransferDerivedToken() public {
        address producer = PRODUCER_ADDRESS; // Intentará transferir el derivado
        address factory = FACTORY_ADDRESS; // Crea el derivado (lo posee inicialmente)
        address retailer = RETAILER_ADDRESS; // Receptor (no importa mucho en este test)

        uint256 rawTokenId = 1;
        uint256 derivedTokenId = 2;
        uint256 rawSupply = 1000;
        uint256 derivedSupply = 500;
        uint256 transferAmount = 100;

        // 1. Arrange: Configuración de roles y creación de tokens.
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(factory);
        supplyChain.requestUserRole("Factory");
        vm.prank(retailer);
        supplyChain.requestUserRole("Retailer");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(retailer, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        // A. Producer crea la Materia Prima (Token #1)
        vm.prank(producer);
        supplyChain.createToken("Raw Metal", rawSupply, "{}", 0);

        // B. Factory compra/recibe el stock (simulación de transferencia)
        vm.startPrank(ADMIN);
        supplyChain.setTokenBalance(rawTokenId, producer, 0);
        supplyChain.setTokenBalance(rawTokenId, factory, rawSupply);
        vm.stopPrank();

        // C. Factory crea el Producto Derivado (Token #2) consumiendo Materia Prima
        vm.prank(factory);
        supplyChain.createToken("Metal Parts", derivedSupply, "{}", rawTokenId);

        // D. SIMULACIÓN: El Factory transfiere el Producto Derivado al Producer (para que lo tenga e intente enviarlo)
        vm.startPrank(factory);
        // requestTransfer previously transferToken
        supplyChain.requestTransfer(derivedTokenId, producer, derivedSupply);
        vm.stopPrank();

        // 2. Act & Assert: El Producer intenta transferir el token derivado (Token #2)
        // 🚨 ROJO ESPERADO: Esto fallará si la restricción de rol no existe.
        vm.prank(producer);
        vm.expectRevert(
            "SupplyChain: Producer role cannot transfer derived products (parentId > 0)."
        );
        // requestTransfer previously transferToken
        supplyChain.requestTransfer(derivedTokenId, retailer, transferAmount);
    }

    function testTransferFailsInsufficientBalance() public {
        address producer = PRODUCER_ADDRESS;
        address retailer = RETAILER_ADDRESS;
        uint256 tokenId = 1;
        uint256 initialSupply = 100;
        uint256 transferAmount = 101; // Cantidad mayor al balance inicial (100)

        // 1. Arrange: Configuración y creación del token.
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(retailer);
        supplyChain.requestUserRole("Retailer");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(retailer, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        // Producer crea el token con 100 unidades.
        vm.prank(producer);
        supplyChain.createToken("Small Batch", initialSupply, "{}", 0);

        // 2. Act & Assert: Producer intenta transferir 101 unidades (más de lo que tiene).
        vm.prank(producer);
        // 🚨 ROJO ESPERADO: Aunque la lógica ya existe, el test valida que el revert sea correcto.
        vm.expectRevert("SupplyChain: Insufficient balance.");
        // requestTransfer previously transferToken
        supplyChain.requestTransfer(
            tokenId,
            retailer,
            transferAmount
        );
    }

    function testTransferFailsToUnapprovedUser() public {
        address producer = PRODUCER_ADDRESS; // Remitente aprobado
        address malicious = address(0xAA);    // Receptor NO registrado ni aprobado
        uint256 tokenId = 1;
        uint256 initialSupply = 100;
        uint256 transferAmount = 10;

        // 1. Arrange: Configuración (solo Producer aprobado).
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        // 'malicious' NUNCA se registra ni se aprueba.
        vm.stopPrank();

        // Producer crea el token.
        vm.prank(producer);
        supplyChain.createToken("Safe Goods", initialSupply, "{}", 0);

        // 2. Act & Assert: Producer intenta transferir a un usuario no aprobado (malicious).
        vm.prank(producer);
        // 🚨 ROJO ESPERADO: Si no hay validación del estado del receptor.
        vm.expectRevert("SupplyChain: Recipient must be an approved user.");
        // requestTransfer previously transferToken
        supplyChain.requestTransfer(
            tokenId,
            malicious,
            transferAmount
        );
    }

    function testGetUserOwnedTokens() public {
        address producer = PRODUCER_ADDRESS;
        address factory = FACTORY_ADDRESS;
        uint256 rawSupply = 1000;
        uint256 derivedSupply = 500;
        uint256 rawTokenId = 1;
        uint256 derivedTokenId = 2;
        
        // 1. Arrange: Configuración y Creación de Tokens.
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(factory);
        supplyChain.requestUserRole("Factory");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        // A. Producer crea Materia Prima (Token #1)
        vm.prank(producer);
        supplyChain.createToken("Wheat", rawSupply, "{}", 0); 
        // Producer posee: Token #1 (Wheat)

        // B. Simulación de Transferencia: Factory recibe stock del Token #1
        vm.startPrank(ADMIN);
        supplyChain.setTokenBalance(rawTokenId, producer, 0);
        supplyChain.setTokenBalance(rawTokenId, factory, rawSupply);
        vm.stopPrank();

        // C. Factory crea Producto Derivado (Token #2)
        vm.prank(factory);
        supplyChain.createToken("Flour", derivedSupply, "{}", rawTokenId);
        // Factory posee: Token #2 (Flour)

        // 2. Act & Assert: Verificar los tokens que posee cada usuario.
        
        // Producer (Ahora no debería tener ninguno ya que lo transfirió)
        uint256[] memory producerTokens = supplyChain.getUserTokens(producer);
        // El test de creación ya llena userTokensList[msg.sender].
        // 🚨 Por diseño, tu `userTokensList` rastrea **CREACIÓN**, no **POSESIÓN/BALANCE**.
        // Vamos a asumir que quieres listar los que **creó** para fines de trazabilidad de su origen.
        
        // Si quieres listar los que creó (origen):
        assertEq(producerTokens.length, 1, "Producer should have 1 token in its creation list.");
        assertEq(producerTokens[0], rawTokenId, "Producer's first created token must be Token #1.");
        
        // Factory (Debería haber creado solo el Token #2)
        uint256[] memory factoryTokens = supplyChain.getUserTokens(factory);
        assertEq(factoryTokens.length, 1, "Factory should have 1 token in its creation list.");
        assertEq(factoryTokens[0], derivedTokenId, "Factory's first created token must be Token #2.");
        
    }

    function testTokenLineageTracing() public {
        address producer = PRODUCER_ADDRESS;
        address factory = FACTORY_ADDRESS;
        address retailer = RETAILER_ADDRESS;
        
        // IDs que esperamos
        uint256 rawTokenId = 1;
        uint256 intermediateId = 2;
        uint256 finalProductId = 3;
        
        uint256 supply = 1000;
        
        // 1. Arrange: Configuración de Roles
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(factory);
        supplyChain.requestUserRole("Factory");
        vm.prank(retailer);
        supplyChain.requestUserRole("Retailer");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(retailer, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        // 2. Arrange: Cadena de Producción
        
        // A. Token #1: Materia Prima (Producer)
        vm.prank(producer);
        supplyChain.createToken("Cotton", supply, "{}", 0); 

        // B. Simulación de Transferencia (Producer -> Factory)
        vm.startPrank(ADMIN);
        supplyChain.setTokenBalance(rawTokenId, producer, 0);
        supplyChain.setTokenBalance(rawTokenId, factory, supply);
        vm.stopPrank();
        
        // C. Token #2: Producto Intermedio (Factory)
        vm.prank(factory);
        uint256 consumedSupply = 500;
        supplyChain.createToken("Yarn", consumedSupply, "{}", rawTokenId);
        // Factory ahora tiene 500 de Yarn (Token #2)

        // D. Simulación de Transferencia (Factory -> Retailer)
        vm.startPrank(ADMIN);
        supplyChain.setTokenBalance(intermediateId, factory, 0);
        supplyChain.setTokenBalance(intermediateId, retailer, consumedSupply);
        vm.stopPrank();

        // E. Token #3: Producto Final (Retailer)
        vm.prank(retailer);
        uint256 finalSupply = 100;
        supplyChain.createToken("T-shirt", finalSupply, "{}", intermediateId);
        // Retailer ahora tiene 100 de T-shirt (Token #3)

        // 3. Act & Assert: Obtener el historial completo del Token #3.
        
        // 🚨 ROJO ESPERADO: Fallará porque la función 'getTokenLineage' no existe.
        uint256[] memory lineage = supplyChain.getTokenLineage(finalProductId);

        // La línea de tiempo esperada es: [Token #2 (Yarn), Token #1 (Cotton)]
        // Queremos excluir el Token #3 (el que se consulta).
        uint256[] memory expectedLineage = new uint256[](2);
        expectedLineage[0] = intermediateId; // Token #2 (Yarn)
        expectedLineage[1] = rawTokenId;     // Token #1 (Cotton)

        assertEq(lineage.length, expectedLineage.length, "Lineage must have 2 parent tokens.");
        assertEq(lineage[0], expectedLineage[0], "The immediate parent must be Token #2 (Yarn).");
        assertEq(lineage[1], expectedLineage[1], "The grandparent must be Token #1 (Cotton).");
    }

    function testAdminCannotBeDeactivatedBySelf() public {
        // 1. Act & Assert: El ADMIN intenta rechazarse a sí mismo.
        vm.startPrank(ADMIN);
        
        // 🚨 ROJO ESPERADO: Si la lógica no impide que el Admin cambie su propio estado.
        vm.expectRevert("SupplyChain: Admin cannot change own status.");
        supplyChain.changeStatusUser(ADMIN, SupplyChain.UserStatus.Rejected); // Intentar rechazar al Admin
        
        vm.stopPrank();

        // Verificación de estado (debería seguir siendo Approved)
        uint256 adminUserId = supplyChain.addressToUserId(ADMIN);
        
        // CORRECCIÓN: Desestructuramos la tupla devuelta por users()
        // Los guiones bajos '_' se usan para omitir los campos que no necesitamos (id, userAddress, role)
        ( , , , SupplyChain.UserStatus actualStatus) = supplyChain.users(adminUserId);
        
        // Asumiendo que 1 es Approved (el valor del enum UserStatus.Approved)
        assertEq(uint256(actualStatus), 1, "Admin status must remain Approved.");
    }

    // Modificaremos este test para reflejar que la transferencia AHORA SOLO SOLICITA
    function testTransferRequestCreatesPendingTransfer() public {
        address producer = PRODUCER_ADDRESS; // Remitente
        address retailer = RETAILER_ADDRESS; // Receptor
        uint256 tokenId = 1;
        uint256 initialSupply = 1000;
        uint256 transferAmount = 300;
        uint256 expectedTransferId = 1;

        // 1. Arrange: Configuración de roles y creación del token.
        // ... (Configuración de roles y creación de Token #1 por Producer, igual que antes) ...
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(retailer);
        supplyChain.requestUserRole("Retailer");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(retailer, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        vm.prank(producer);
        supplyChain.createToken("Raw Cotton", initialSupply, "{}", 0);
        // Producer tiene 1000.

        // 2. Act: El Producer solicita la transferencia de 300 unidades al Retailer.
        vm.prank(producer);
        // 🚨 Llamaremos a la función refactorizada, manteniendo el nombre por ahora.
        // Después del refactor, esta función NO DEBE CAMBIAR EL BALANCE.
        // requestTransfer previously transferToken
        supplyChain.requestTransfer(
            tokenId,
            retailer,
            transferAmount
        );

        // 3. Assert (ROJO esperado si la lógica de transferencia directa sigue):

        // A. Verificar que el balance del productor NO se ha deducido (Debe seguir siendo 1000)
        uint256 actualProducerBalance = supplyChain.getTokenBalance(tokenId, producer);
        // Debe ser el INITIAL SUPPLY, no el saldo reducido.
        assertEq(
            actualProducerBalance,
            initialSupply,
            "Post-condition: Sender balance must NOT be reduced, as it's only a request."
        );
        
        // B. Verificar que el objeto Transfer se ha creado y está en estado Pending.
        (
            uint256 id, 
            address from, 
            address to, 
            , 
            , 
            uint256 amount, 
            SupplyChain.TransferStatus status
        ) = supplyChain.transfers(expectedTransferId); // Asumo que tienes un getter público para 'transfers'

        assertEq(id, expectedTransferId, "Transfer ID must be 1.");
        assertEq(from, producer, "Transfer 'from' must be Producer.");
        assertEq(to, retailer, "Transfer 'to' must be Retailer.");
        assertEq(amount, transferAmount, "Transfer amount must match.");
        assertEq(uint256(status), uint256(SupplyChain.TransferStatus.Pending), "Transfer status must be Pending (0).");
    }

    function testAcceptTransferMovesBalance() public {
        address producer = PRODUCER_ADDRESS; // Remitente
        address retailer = RETAILER_ADDRESS; // Receptor
        uint256 tokenId = 1;
        uint256 initialSupply = 1000;
        uint256 transferAmount = 300;
        uint256 transferId = 1;

        // 1. Arrange: Configuración de roles y solicitud de transferencia.
        // ... (Configuración de roles) ...
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(retailer);
        supplyChain.requestUserRole("Retailer");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(retailer, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        vm.prank(producer);
        supplyChain.createToken("Raw Cotton", initialSupply, "{}", 0);
        // Producer tiene 1000.

        // A. Producer solicita la transferencia.
        vm.prank(producer);
        supplyChain.requestTransfer(tokenId, retailer, transferAmount);

        // 2. Act: El Retailer (receptor) acepta la transferencia.
        vm.prank(retailer); // 🚨 El Receptor debe ser quien acepta
        vm.expectEmit(true, false, false, false, address(supplyChain));
        emit TransferAccepted(transferId); 
        supplyChain.acceptTransfer(transferId);

        // 3. Assert: Verificar que el balance se ha movido y el estado es Accepted.
        uint256 producerBalance = supplyChain.getTokenBalance(tokenId, producer);
        uint256 retailerBalance = supplyChain.getTokenBalance(tokenId, retailer);
        
        // A. Balance Verificación
        assertEq(producerBalance, 700, "Producer balance must be 700 after acceptance.");
        assertEq(retailerBalance, 300, "Retailer balance must be 300 after acceptance.");

        // B. Estado de Transferencia Verificación
        ( , , , , , , SupplyChain.TransferStatus status) = supplyChain.transfers(transferId);
        assertEq(uint256(status), uint256(SupplyChain.TransferStatus.Accepted), "Transfer status must be Accepted (1).");
        
    }

    // Tests for pending transfers by sender and recipient (legacy semantics, new API)
    function testGetPendingTransfersBySender() public {
        address producer = PRODUCER_ADDRESS;
        address factory = FACTORY_ADDRESS;
        address retailer = RETAILER_ADDRESS;

        // Setup roles
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(factory);
        supplyChain.requestUserRole("Factory");
        vm.prank(retailer);
        supplyChain.requestUserRole("Retailer");

        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(retailer, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        // Create token
        vm.prank(producer);
        supplyChain.createToken("Wheat", 1000, "{}", 0);

        // Producer requests 2 transfers to factory
        vm.startPrank(producer);
        supplyChain.requestTransfer(1, factory, 100);
        supplyChain.requestTransfer(1, retailer, 50);
        vm.stopPrank();

    // Query pending transfers by sender (producer)
    (SupplyChain.Transfer[] memory pendingTransfers, uint256 total) = supplyChain.getPendingBySender(producer, 0, 10);

        // Assertions
    assertEq(total, 2, "Producer total pending transfers should be 2");
    assertEq(pendingTransfers.length, 2, "Producer should have 2 pending transfers");
        assertEq(pendingTransfers[0].from, producer, "First transfer from should be producer");
        assertEq(pendingTransfers[0].to, factory, "First transfer to should be factory");
        assertEq(pendingTransfers[0].amount, 100, "First transfer amount should be 100");
        assertEq(uint256(pendingTransfers[0].status), uint256(SupplyChain.TransferStatus.Pending), "First transfer should be pending");

        assertEq(pendingTransfers[1].from, producer, "Second transfer from should be producer");
        assertEq(pendingTransfers[1].to, retailer, "Second transfer to should be retailer");
        assertEq(pendingTransfers[1].amount, 50, "Second transfer amount should be 50");
    }

    function testGetPendingTransfersByRecipient() public {
        address producer = PRODUCER_ADDRESS;
        address factory = FACTORY_ADDRESS;
        address retailer = RETAILER_ADDRESS;

        // Setup roles
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(factory);
        supplyChain.requestUserRole("Factory");
        vm.prank(retailer);
        supplyChain.requestUserRole("Retailer");

        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(retailer, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        // Create token
        vm.prank(producer);
        supplyChain.createToken("Wheat", 1000, "{}", 0);

        // Producer requests transfers to factory
        vm.startPrank(producer);
        supplyChain.requestTransfer(1, factory, 100);
        supplyChain.requestTransfer(1, factory, 200);
        supplyChain.requestTransfer(1, retailer, 50);
        vm.stopPrank();

    // Query pending transfers by recipient (factory)
    (SupplyChain.Transfer[] memory pendingTransfers, uint256 total) = supplyChain.getPendingByRecipient(factory, 0, 10);

        // Assertions
    assertEq(total, 2, "Factory total pending transfers should be 2");
    assertEq(pendingTransfers.length, 2, "Factory should have 2 pending transfers");
        assertEq(pendingTransfers[0].to, factory, "First transfer to should be factory");
        assertEq(pendingTransfers[0].amount, 100, "First transfer amount should be 100");
        assertEq(pendingTransfers[1].to, factory, "Second transfer to should be factory");
        assertEq(pendingTransfers[1].amount, 200, "Second transfer amount should be 200");
    }

    function testGetPendingTransfersExcludesAccepted() public {
        address producer = PRODUCER_ADDRESS;
        address factory = FACTORY_ADDRESS;

        // Setup roles
        vm.prank(producer);
        supplyChain.requestUserRole("Producer");
        vm.prank(factory);
        supplyChain.requestUserRole("Factory");

        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        vm.stopPrank();

        // Create token
        vm.prank(producer);
        supplyChain.createToken("Wheat", 1000, "{}", 0);

        // Producer requests 2 transfers
        vm.startPrank(producer);
        supplyChain.requestTransfer(1, factory, 100);
        supplyChain.requestTransfer(1, factory, 200);
        vm.stopPrank();

        // Factory accepts first transfer
        vm.prank(factory);
        supplyChain.acceptTransfer(1);

    // Query pending transfers - should only have 1 now
    (SupplyChain.Transfer[] memory senderPending, uint256 totalSender) = supplyChain.getPendingBySender(producer, 0, 10);
    (SupplyChain.Transfer[] memory recipientPending, uint256 totalRecipient) = supplyChain.getPendingByRecipient(factory, 0, 10);

        // Assertions
    assertEq(totalSender, 1, "Producer total should be 1 after acceptance");
    assertEq(senderPending.length, 1, "Producer should have 1 pending transfer (one was accepted)");
        assertEq(senderPending[0].id, 2, "Remaining pending transfer should be ID 2");
        
    assertEq(totalRecipient, 1, "Factory total should be 1 after acceptance");
    assertEq(recipientPending.length, 1, "Factory should have 1 pending transfer (one was accepted)");
        assertEq(recipientPending[0].id, 2, "Remaining pending transfer should be ID 2");
    }
    // -----------------------------------------------------------
    // Pending transfers: indexed getters with pagination (tests-first)
    // -----------------------------------------------------------

    // 4.1 Indexing on Request
    function testListPendingTransfers_BySenderAndRecipient() public {
        // Arrange: Register and approve users, create token
        address producer = PRODUCER_ADDRESS;
        address factory = FACTORY_ADDRESS;
        address retailer = RETAILER_ADDRESS;
        vm.prank(producer); supplyChain.requestUserRole("Producer");
        vm.prank(factory); supplyChain.requestUserRole("Factory");
        vm.prank(retailer); supplyChain.requestUserRole("Retailer");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(retailer, SupplyChain.UserStatus.Approved);
        vm.stopPrank();
        vm.prank(producer); supplyChain.createToken("Wheat", 1000, "{}", 0);

        // Act: Producer requests transfers
        vm.startPrank(producer);
        supplyChain.requestTransfer(1, factory, 100);
        supplyChain.requestTransfer(1, retailer, 50);
        supplyChain.requestTransfer(1, factory, 25);
        vm.stopPrank();

        // Assert: Paginated getters
        (SupplyChain.Transfer[] memory sent, uint256 totalSent) = supplyChain.getPendingBySender(producer, 0, 10);
        (SupplyChain.Transfer[] memory recFactory, uint256 totalRecFactory) = supplyChain.getPendingByRecipient(factory, 0, 10);
        (SupplyChain.Transfer[] memory recRetailer, uint256 totalRecRetailer) = supplyChain.getPendingByRecipient(retailer, 0, 10);

        assertEq(sent.length, 3, "Producer should have 3 pending sent");
        assertEq(totalSent, 3, "Producer total sent should be 3");
        assertEq(recFactory.length, 2, "Factory should have 2 pending received");
        assertEq(totalRecFactory, 2, "Factory total received should be 2");
        assertEq(recRetailer.length, 1, "Retailer should have 1 pending received");
        assertEq(totalRecRetailer, 1, "Retailer total received should be 1");
    }

    // 4.2 Removal on Accept/Reject
    function testPendingTransfers_ClearedOnAcceptAndReject() public {
        // Arrange
        address producer = PRODUCER_ADDRESS;
        address factory = FACTORY_ADDRESS;
        vm.prank(producer); supplyChain.requestUserRole("Producer");
        vm.prank(factory); supplyChain.requestUserRole("Factory");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        vm.stopPrank();
        vm.prank(producer); supplyChain.createToken("Wheat", 1000, "{}", 0);
        vm.startPrank(producer);
        supplyChain.requestTransfer(1, factory, 100);
        supplyChain.requestTransfer(1, factory, 200);
        vm.stopPrank();

        // Act: Accept first, reject second
        vm.prank(factory); supplyChain.acceptTransfer(1);
        vm.prank(factory); supplyChain.rejectTransfer(2);

        // Assert
        (SupplyChain.Transfer[] memory sent, uint256 totalSent) = supplyChain.getPendingBySender(producer, 0, 10);
        (SupplyChain.Transfer[] memory recFactory, uint256 totalRecFactory) = supplyChain.getPendingByRecipient(factory, 0, 10);
        assertEq(sent.length, 0, "Producer should have 0 pending after accept/reject");
        assertEq(totalSent, 0, "Producer total sent should be 0");
        assertEq(recFactory.length, 0, "Factory should have 0 pending after accept/reject");
        assertEq(totalRecFactory, 0, "Factory total received should be 0");
    }

    // 4.3 Pagination Slices
    function testPendingTransfers_PaginationBySender() public {
        // Arrange
        address producer = PRODUCER_ADDRESS;
        address factory = FACTORY_ADDRESS;
        vm.prank(producer); supplyChain.requestUserRole("Producer");
        vm.prank(factory); supplyChain.requestUserRole("Factory");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        vm.stopPrank();
        vm.prank(producer); supplyChain.createToken("Wheat", 1000, "{}", 0);
        vm.startPrank(producer);
        for (uint256 i = 0; i < 7; i++) {
            supplyChain.requestTransfer(1, factory, 10 + i);
        }
        vm.stopPrank();

        // Assert: Pagination
        (SupplyChain.Transfer[] memory page1, uint256 total1) = supplyChain.getPendingBySender(producer, 0, 3);
        assertEq(page1.length, 3, "Page 1 should have 3 items");
        assertEq(total1, 7, "Total should be 7");
        (SupplyChain.Transfer[] memory page2, ) = supplyChain.getPendingBySender(producer, 3, 3);
        assertEq(page2.length, 3, "Page 2 should have 3 items");
        (SupplyChain.Transfer[] memory page3, ) = supplyChain.getPendingBySender(producer, 6, 3);
        assertEq(page3.length, 1, "Page 3 should have 1 item");
        (SupplyChain.Transfer[] memory pageEmpty, ) = supplyChain.getPendingBySender(producer, 10, 3);
        assertEq(pageEmpty.length, 0, "Out of range page should be empty");
    }

    // 4.4 Defensive Consistency
    function testPendingTransfers_IgnoresNonPendingTransfers() public {
        // Arrange
        address producer = PRODUCER_ADDRESS;
        address factory = FACTORY_ADDRESS;
        vm.prank(producer); supplyChain.requestUserRole("Producer");
        vm.prank(factory); supplyChain.requestUserRole("Factory");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        vm.stopPrank();
        vm.prank(producer); supplyChain.createToken("Wheat", 1000, "{}", 0);
    vm.prank(producer); supplyChain.requestTransfer(1, factory, 100);
    // Accept the transfer so it is no longer pending
    vm.prank(factory); supplyChain.acceptTransfer(1);

        // Assert: Should not be returned by paginated getter
        (SupplyChain.Transfer[] memory sent, uint256 totalSent) = supplyChain.getPendingBySender(producer, 0, 10);
        assertEq(sent.length, 0, "No pending transfers should be returned if status is not Pending");
        assertEq(totalSent, 0, "Total should be 0 if status is not Pending");
    }

    // 4.5 Backward Compatibility
    function testTransferLifecycle_AcceptMaintainsStatus() public {
        // Arrange
        address producer = PRODUCER_ADDRESS;
        address factory = FACTORY_ADDRESS;
        vm.prank(producer); supplyChain.requestUserRole("Producer");
        vm.prank(factory); supplyChain.requestUserRole("Factory");
        vm.startPrank(ADMIN);
        supplyChain.changeStatusUser(producer, SupplyChain.UserStatus.Approved);
        supplyChain.changeStatusUser(factory, SupplyChain.UserStatus.Approved);
        vm.stopPrank();
        vm.prank(producer); supplyChain.createToken("Wheat", 1000, "{}", 0);
        vm.prank(producer); supplyChain.requestTransfer(1, factory, 100);
        vm.prank(factory); supplyChain.acceptTransfer(1);
    // Assert: Should not revert, and transfer should be accepted
    SupplyChain.Transfer memory t = supplyChain.getTransfer(1);
        assertEq(uint256(t.status), uint256(SupplyChain.TransferStatus.Accepted), "Transfer should be accepted");
    }

}



