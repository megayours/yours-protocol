import { ProjectMetadata, TokenMetadata } from '@megayours/sdk';

export const createProjectMetadata = (
  owner_id: Buffer,
  blockchain_rid: string
): ProjectMetadata => ({
  name: 'Test Project:' + Date.now(),
  blockchain_rid: Buffer.from(blockchain_rid, 'hex'),
  owner_id,
});

export const createTokenMetadata = (
  project: ProjectMetadata,
  collection: string,
  name: string = 'A Test Token'
): TokenMetadata => ({
  name,
  properties: {
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
  },
  yours: {
    modules: [],
    project,
    collection,
  },
  description: 'A Test Description',
  image: 'A Test Image',
  animation_url: 'A Test Animation',
});
