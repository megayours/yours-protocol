import { op } from "@chromia/ft4";

export function transfer(token_id: Buffer, amount: bigint, to_account_id: Buffer) {
  return op('mkpl.transfer', token_id, amount, to_account_id);
}
