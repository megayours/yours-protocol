import { op } from "@chromia/ft4";
import { TokenMetadata } from "@megayours/sdk";

export function define(token_id: Buffer, metadata: TokenMetadata, token_type: string) {
  return op('importer.define', token_id, JSON.stringify(metadata.properties), token_type);
}

export function mint(token_id: Buffer, amount: bigint) {
  return op('importer.mint', token_id, amount);
}
