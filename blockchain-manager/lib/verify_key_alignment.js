const EC = require('elliptic').ec;
const keccak256 = require('keccak256');

// Clave privada del signer
const privateKeyHex = '0fe960389c4df8de17db3f555690de77b838055a96441cb77051bf89703ee406';

// Dirección del validador en genesis.json
const validatorAddressFromGenesis = '3e96143e769c579a12ddf2f0f21943b6b6d45175';

console.log('=== VERIFICACIÓN DE ALINEACIÓN DE CLAVES ===\n');

// Calcular la dirección desde la clave privada
const ec = new EC('secp256k1');
const keyPair = ec.keyFromPrivate(privateKeyHex, 'hex');
const publicKey = keyPair.getPublic('hex');

// Calcular dirección Ethereum (igual que en generateNodeIdentity.ts)
const pubKeyBuffer = keccak256(Buffer.from(publicKey.slice(2), 'hex'));
const calculatedAddress = pubKeyBuffer.toString("hex").slice(-40);

console.log('Clave privada del signer:', privateKeyHex);
console.log('Dirección calculada desde clave privada:', calculatedAddress);
console.log('Dirección del validador en genesis.json:', validatorAddressFromGenesis);
console.log('');

if (calculatedAddress.toLowerCase() === validatorAddressFromGenesis.toLowerCase()) {
    console.log('✅ LAS CLAVES ESTÁN ALINEADAS CORRECTAMENTE');
    console.log('   El signer puede minar bloques como validador.');
} else {
    console.log('❌ LAS CLAVES NO ESTÁN ALINEADAS');
    console.log('   El signer NO puede minar bloques - este es el problema.');
}

console.log('\n=== ANÁLISIS DEL PROBLEMA DE SINCRONIZACIÓN ===');
console.log('Basado en los logs del signer:');
console.log('- El signer está esperando peers válidos para sincronizar');
console.log('- Mensaje: "Waiting for valid peers with chain height information"');
console.log('- Esto indica un problema de peer discovery, no de claves');
