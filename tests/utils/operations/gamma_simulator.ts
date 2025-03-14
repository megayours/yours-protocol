import { op } from "@chromia/ft4";

export function emitErc721Mint(chain: string, contract: Buffer, tokenId: bigint, properties: string, to: Buffer, amount: bigint) {
  return op('gamma_simulator.emit_erc721_mint', chain, contract, tokenId, properties, to, amount);
}

export function emitErc721Transfer(chain: string, contract: Buffer, tokenId: bigint, from: Buffer, to: Buffer, amount: bigint) {
  return op('gamma_simulator.emit_erc721_transfer', chain, contract, tokenId, from, to, amount);
}

export function emitErc20Mint(chain: string, contract: Buffer, name: string, symbol: string, decimals: number, to: Buffer, amount: bigint) {
  return op('gamma_simulator.emit_erc20_mint', chain, contract, name, symbol, decimals, to, amount);
}

export function emitErc20Transfer(chain: string, contract: Buffer, from: Buffer, to: Buffer, amount: bigint) {
  return op('gamma_simulator.emit_erc20_transfer', chain, contract, from, to, amount);
}