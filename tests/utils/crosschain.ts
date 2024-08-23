import { Session, transactionBuilder } from "@chromia/ft4";
import { noopAuthenticator, op } from "@chromia/ft4";
import { TokenMetadata } from "./types";
import { IClient } from "postchain-client";
import { serializeTokenMetadata } from "./metadata";

export async function performCrossChainTransfer(
  fromSession: Session,
  toChain: IClient,
  toAccountId: Buffer,
  tokenId: number,
  amount: number,
  metadata: TokenMetadata
): Promise<void> {
  return new Promise((resolve, reject) => {
    fromSession.transactionBuilder()
      .add(op(
        "yours.init_transfer",
        toAccountId,
        tokenId,
        amount,
        serializeTokenMetadata(metadata)
      ), {
        onAnchoredHandler: (initData: any) => {
          if (!initData) {
            reject(new Error("No data provided after init_transfer"));
            return;
          }
          
          initData.createProof(toChain.config.blockchainRid)
            .then((iccfProofOperation: any) => {
              return transactionBuilder(noopAuthenticator, toChain)
                .add(iccfProofOperation, {
                  authenticator: noopAuthenticator,
                })
                .add(op(
                  "yours.apply_transfer",
                  initData.tx,
                  initData.opIndex
                ), {
                  authenticator: noopAuthenticator,
                  onAnchoredHandler: (applyData: any) => {
                    if (!applyData) {
                      reject(new Error("No data provided after apply_transfer"));
                      return;
                    }
                    
                    applyData.createProof(fromSession.blockchainRid)
                      .then((iccfProofOperation: any) => {
                        return fromSession.transactionBuilder()
                          .add(iccfProofOperation, {
                            authenticator: noopAuthenticator,
                          })
                          .add(op(
                            "yours.complete_transfer",
                            applyData.tx,
                            applyData.opIndex
                          ), {
                            authenticator: noopAuthenticator,
                          })
                          .buildAndSend();
                      })
                      .then(() => {
                        resolve();
                      })
                      .catch((error) => {
                        console.error("Error in complete_transfer:", error);
                        reject(error);
                      });
                  }
                })
                .buildAndSendWithAnchoring();
            })
            .catch((error) => {
              console.error("Error in apply_transfer:", error);
              reject(error);
            });
        }
      })
      .buildAndSendWithAnchoring()
      .catch((error) => {
        console.error("Error in performCrossChainTransfer:", error);
        reject(error);
      });
  });
}