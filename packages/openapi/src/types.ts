import type { OpenAPIV3_1 as OpenAPI } from "openapi-types";

export type { OpenAPI };

export interface RouteDocumentation {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  deprecated?: boolean;
  security?: OpenAPI.SecurityRequirementObject[];
}

export interface OpenAPIOptions {
  info: OpenAPI.InfoObject;
  servers?: OpenAPI.ServerObject[];
  tags?: OpenAPI.TagObject[];
  security?: OpenAPI.SecurityRequirementObject[];
  components?: OpenAPI.ComponentsObject;
  externalDocs?: OpenAPI.ExternalDocumentationObject;
}
