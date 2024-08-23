import { ProjectMetadata, TokenMetadata } from "./types";

export function serializeTokenMetadata(metadata: TokenMetadata): any[] {
  const yours: any[] = [
    metadata.yours.modules,
    [metadata.yours.project.name, metadata.yours.project.owner_id],
    metadata.yours.collection,
  ];

  const result: any[] = [
    metadata.name,
    JSON.stringify(metadata.properties),
    yours,
    metadata.description ?? null,
    metadata.image ?? null,
    metadata.animation_url ?? null,
    // metadata.decimals ?? null,
  ];

  return result;
}

export const createProjectMetadata = (owner_id: Buffer): ProjectMetadata => ({
  name: "Test Project:" + Date.now(),
  owner_id
});

export const createTokenMetadata = (project: ProjectMetadata, collection: string, name: string = "A Test Token"): TokenMetadata => ({
  name,
  properties: {
    simple_property: "example value",
    rich_property: {
      name: "Name",
      value: "123",
      display_value: "123 Example Value",
      class: "emphasis",
      css: {
        color: "#ffffff",
        "font-weight": "bold",
        "text-decoration": "underline"
      }
    },
    array_property: {
      name: "Name",
      value: [1, 2, 3, 4],
      class: "emphasis"
    }
  },
  yours: {
    modules: [],
    project,
    collection,
  },
  description: "A Test Description",
  image: "A Test Image",
  animation_url: "A Test Animation"
});