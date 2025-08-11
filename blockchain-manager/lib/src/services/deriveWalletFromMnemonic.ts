import { ethers, Mnemonic } from 'ethers';


export function deriveWalletFromMnemonic() {
  const wallets: string[] = [];
  const mnemonicPhrase = "test test test test test test test test test test test junk";
  for (let index = 0; index < 5; index++) {
    const path = `m/44'/60'/0'/0/${index}`;
    const mnemonic = Mnemonic.fromPhrase(mnemonicPhrase);
    const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, path);
    wallets.push(wallet.address);
  }
  return wallets;
}
