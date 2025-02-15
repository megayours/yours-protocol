import { encryption } from 'postchain-client';
import { createAccount } from './utils/ft4';
import { getTestEnvironment, TestEnvironment } from './utils/setup';
import { TIMEOUT_TEST } from './utils/constants';
import { op } from '@chromia/ft4';
import { createErc1155Properties, createProjectMetadata, createTokenMetadata } from './utils/metadata';
import { randomCollectionName } from './utils/random';
import { beforeAll, describe, expect, it } from 'bun:test';

type ERC1155Metadata = {
  name: string;
  properties: Record<string, any>;
  description: string;
  image: string;
  animation_url: string;
};

describe('ERC1155', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  });

  it(
    'NFT has correct metadata',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenMetadata = createTokenMetadata(project, collection);
      const erc1155Properties = createErc1155Properties();

      const tokenId = BigInt(1);

      await session
        .transactionBuilder()
        .add(
          op(
            'importer.nft',
            project.name,
            collection,
            tokenMetadata.name,
            tokenId,
            JSON.stringify(tokenMetadata.properties),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'yours'
          )
        )
        .buildAndSend();

      const metadata = await session.query<ERC1155Metadata>('erc1155.metadata', {
        project_name: project.name,
        project_blockchain_rid: session.blockchainRid,
        collection,
        token_id: tokenId,
      });
      expect(metadata.name).toBe(tokenMetadata.name);
      expect(metadata.properties['rich_property']['name']).toEqual(tokenMetadata.properties.rich_property['name']);
      expect(metadata.properties['rich_property']['value']).toEqual(tokenMetadata.properties.rich_property['value']);
      expect(metadata.properties['rich_property']['display_value']).toEqual(tokenMetadata.properties.rich_property['display_value']);
      expect(metadata.properties['rich_property']['class']).toEqual(tokenMetadata.properties.rich_property['class']);
      expect(metadata.properties['rich_property']['css']['color']).toEqual(tokenMetadata.properties.rich_property['css']['color']);
      expect(metadata.properties['rich_property']['css']['font-weight']).toEqual(
        tokenMetadata.properties.rich_property['css']['font-weight']
      );
      expect(metadata.properties['rich_property']['css']['text-decoration']).toEqual(
        tokenMetadata.properties.rich_property['css']['text-decoration']
      );

      expect(metadata.properties['image']).toBe(undefined);
      expect(metadata.properties['animation_url']).toBe(undefined);
      expect(metadata.properties['description']).toBe(undefined);

      expect(metadata.description).toBe(erc1155Properties.description);
      expect(metadata.image).toBe(erc1155Properties.image);
      expect(metadata.animation_url).toBe(erc1155Properties.animation_url);
    },
    TIMEOUT_TEST
  );

  it(
    'SFT has correct metadata',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenMetadata = createTokenMetadata(project, collection);
      const erc1155Properties = createErc1155Properties();
      await session
        .transactionBuilder()
        .add(
          op(
            'importer.sft',
            project.name,
            collection,
            tokenMetadata.name,
            JSON.stringify(tokenMetadata.properties),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'yours'
          )
        )
        .add(op('importer.mint', project.name, collection, BigInt(0), BigInt(1)))
        .buildAndSend();

      const metadata = await session.query<ERC1155Metadata>('erc1155.metadata', {
        project_name: project.name,
        project_blockchain_rid: session.blockchainRid,
        collection,
        token_id: 0,
      });
      expect(metadata.name).toBe(tokenMetadata.name);
      expect(metadata.properties['simple_property']).toEqual(tokenMetadata.properties.simple_property);
      expect(metadata.properties['rich_property']['name']).toEqual(tokenMetadata.properties.rich_property['name']);
      expect(metadata.properties['rich_property']['value']).toEqual(tokenMetadata.properties.rich_property['value']);
      expect(metadata.properties['rich_property']['display_value']).toEqual(tokenMetadata.properties.rich_property['display_value']);
      expect(metadata.properties['rich_property']['class']).toEqual(tokenMetadata.properties.rich_property['class']);
      expect(metadata.properties['rich_property']['css']['color']).toEqual(tokenMetadata.properties.rich_property['css']['color']);
      expect(metadata.properties['rich_property']['css']['font-weight']).toEqual(
        tokenMetadata.properties.rich_property['css']['font-weight']
      );
      expect(metadata.properties['rich_property']['css']['text-decoration']).toEqual(
        tokenMetadata.properties.rich_property['css']['text-decoration']
      );

      expect(metadata.properties['image']).toBe(undefined);
      expect(metadata.properties['animation_url']).toBe(undefined);
      expect(metadata.properties['description']).toBe(undefined);

      expect(metadata.description).toBe(erc1155Properties.description);
      expect(metadata.image).toBe(erc1155Properties.image);
      expect(metadata.animation_url).toBe(erc1155Properties.animation_url);
    },
    TIMEOUT_TEST
  );
});
