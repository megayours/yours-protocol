import { Session, transactionBuilder } from '@chromia/ft4';
import { noopAuthenticator, op } from '@chromia/ft4';
import { IClient } from 'postchain-client';
import { createErc1155Properties } from './metadata';
import { CrosschainTestParams } from './types';
import { serializeTokenMetadata, TokenMetadata } from '@megayours/sdk';

export const testCrossChainTransfer = async (params: CrosschainTestParams) => {
  const erc1155Properties = createErc1155Properties();
  if (params.tokenType === 'nft') {
    await params.dapp1Session
      .transactionBuilder()
      .add(
        op(
          'importer.nft',
          params.project.name,
          params.collection,
          params.tokenMetadata.name,
          params.tokenId,
          JSON.stringify(params.tokenMetadata.properties),
          [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
          'yours'
        )
      )
      .buildAndSend();
  } else {
    await params.dapp1Session
      .transactionBuilder()
      .add(
        op(
          'importer.sft',
          params.project.name,
          params.collection,
          params.tokenMetadata.name,
          JSON.stringify(params.tokenMetadata.properties),
          [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
          'yours'
        )
      )
      .add(op('importer.mint', params.project.name, params.collection, params.tokenId, params.mintAmount))
      .buildAndSend();
  }

  const metadata = await params.dapp1Session.query<TokenMetadata>('yours.metadata', {
    project_name: params.project.name,
    project_blockchain_rid: params.project.blockchain_rid,
    collection: params.collection,
    token_id: params.tokenId,
  });

  await performCrossChainTransfer(
    params.dapp1Session,
    params.dapp2Session.client,
    params.dapp2Session.account.id,
    params.tokenId,
    params.transferAmount,
    metadata
  );

  const dapp1Balance = await params.dapp1Session.query<number>('yours.balance', {
    account_id: params.dapp1Session.account.id,
    project_name: params.project.name,
    project_blockchain_rid: params.project.blockchain_rid,
    collection: params.collection,
    token_id: params.tokenId,
  });
  expect(dapp1Balance).toBe(params.mintAmount - params.transferAmount);

  const dapp2Balance = await params.dapp2Session.query<number>('yours.balance', {
    account_id: params.dapp2Session.account.id,
    project_name: params.project.name,
    project_blockchain_rid: params.project.blockchain_rid,
    collection: params.collection,
    token_id: params.tokenId,
  });
  expect(dapp2Balance).toBe(params.transferAmount);
};

export async function performCrossChainTransfer(
  fromSession: Session,
  toChain: IClient,
  toAccountId: Buffer,
  tokenId: bigint,
  amount: bigint,
  metadata: TokenMetadata
): Promise<void> {
  return new Promise((resolve, reject) => {
    fromSession
      .transactionBuilder()
      .add(op('yours.init_transfer', toAccountId, tokenId, amount, serializeTokenMetadata(metadata)), {
        onAnchoredHandler: (initData: any) => {
          if (!initData) {
            reject(new Error('No data provided after init_transfer'));
            return;
          }

          initData
            .createProof(toChain.config.blockchainRid)
            .then((iccfProofOperation: any) => {
              return transactionBuilder(noopAuthenticator, toChain)
                .add(iccfProofOperation, {
                  authenticator: noopAuthenticator,
                })
                .add(op('yours.apply_transfer', initData.tx, initData.opIndex), {
                  authenticator: noopAuthenticator,
                  onAnchoredHandler: (applyData: any) => {
                    if (!applyData) {
                      reject(new Error('No data provided after apply_transfer'));
                      return;
                    }

                    applyData
                      .createProof(fromSession.blockchainRid)
                      .then((iccfProofOperation: any) => {
                        return fromSession
                          .transactionBuilder()
                          .add(iccfProofOperation, {
                            authenticator: noopAuthenticator,
                          })
                          .add(op('yours.complete_transfer', applyData.tx, applyData.opIndex), {
                            authenticator: noopAuthenticator,
                          })
                          .buildAndSend();
                      })
                      .then(() => {
                        resolve();
                      })
                      .catch((error) => {
                        console.error('Error in complete_transfer:', error);
                        reject(error);
                      });
                  },
                })
                .buildAndSendWithAnchoring();
            })
            .catch((error) => {
              console.error('Error in apply_transfer:', error);
              reject(error);
            });
        },
      })
      .buildAndSendWithAnchoring()
      .catch((error) => {
        console.error('Error in performCrossChainTransfer:', error);
        reject(error);
      });
  });
}
