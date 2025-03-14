import { ERC1155BaseMetadata, TokenMetadata, YoursMetadata } from '@megayours/sdk';

export const createTokenMetadata = (blockchainRid: Buffer, name: string = 'A Test Token'): TokenMetadata => ({
  properties: {
    info: {
      name: name,
    },
    noModuleAssigned: createNoModuleAssignedProperties(),
  },
  yours: createYoursMetadata(blockchainRid),
});

export const createERC721TokenMetadata = (blockchainRid: Buffer, name: string = 'A Test Token'): TokenMetadata => ({
  properties: {
    erc721: createERC721Metadata(name),
  },
  yours: createYoursMetadata(blockchainRid),
});

const createERC721Metadata = (name: string = 'A Test Token') => ({
  name: name,
  properties: createNoModuleAssignedProperties(),
});

const createNoModuleAssignedProperties = () => ({
  simple_property: 'example value',
  rich_property: {
    name: 'Name',
    value: '123',
    display_value: '123 Example Value',
    class: 'emphasis',
    css: {
      color: '#ffffff',
      'font-weight': 'bold',
      'text-decoration': 'underline',
    },
  },
  array_property: {
    name: 'Name',
    value: [1, 2, 3, 4],
    class: 'emphasis',
  },
});

const createYoursMetadata = (blockchainRid: Buffer): YoursMetadata => ({
  issuing_chain: blockchainRid,
  modules: [],
  type: 'yours',
  blockchains: [],
});

const createErc1155Properties = (): ERC1155BaseMetadata => ({
  description: 'A Test Description',
  image: 'A Test Image',
  animation_url: 'A Test Animation',
});
