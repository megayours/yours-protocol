import { encryption } from 'postchain-client';
import { createAccount } from './utils/ft4';
import { getTestEnvironment, teardown, TestEnvironment } from './utils/setup';
import { TIMEOUT_SETUP, TIMEOUT_TEST } from './utils/constants';
import { op } from '@chromia/ft4';
import { createErc1155Properties, createProjectMetadata, createTokenMetadata } from './utils/metadata';
import { expect } from '@jest/globals';
import { randomCollectionName } from './utils/random';
import { serializeTokenMetadata } from '@megayours/sdk';

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
  }, TIMEOUT_SETUP);

  afterAll(async () => {
    await teardown(environment.network, environment.chromiaNode, environment.postgres);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }, TIMEOUT_SETUP);

  it(
    'NFT has correct metadata',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenMetadata = createTokenMetadata(project, collection);
      const erc1155Properties = createErc1155Properties();

      const tokenId = 1;

      const serializedMetadata = serializeTokenMetadata(tokenMetadata);

      await session
        .transactionBuilder()
        .add(
          op('importer.nft', serializedMetadata, tokenId, [
            erc1155Properties.description,
            erc1155Properties.image,
            erc1155Properties.animation_url,
          ])
        )
        .buildAndSend();

      const metadata = await session.query<ERC1155Metadata>('erc1155.metadata', {
        project: project.name,
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
          op('importer.sft', serializeTokenMetadata(tokenMetadata), [
            erc1155Properties.description,
            erc1155Properties.image,
            erc1155Properties.animation_url,
          ])
        )
        .add(op('importer.mint', project.name, collection, 0, 1))
        .buildAndSend();

      const metadata = await session.query<ERC1155Metadata>('erc1155.metadata', {
        project: project.name,
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
