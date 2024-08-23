import { RawGtv } from "postchain-client";

export type Attribute = {
  trait_type: string;
  value: string;
};

export type YoursMetadata = {
  modules: string[];
  project: ProjectMetadata;
  collection: string;
};

export type ProjectMetadata = {
  name: string;
  owner_id: Buffer;
};

export type Property = {
  name?: string;
  value: RawGtv;
  display_value?: string;
  class?: string;
  css?: {
    [key: string]: RawGtv;
  };
};

export type TokenMetadata = {
  name: string;
  description: string;
  image: string;
  animation_url: string;
  yours: YoursMetadata;
  decimals?: number;
  properties: {
    [key: string]: string | number | boolean | Property;
  };
};