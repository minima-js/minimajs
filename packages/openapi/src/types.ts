export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<
    string,
    {
      default: string;
      enum?: string[];
      description?: string;
    }
  >;
}

export interface OpenAPITag {
  name: string;
  description?: string;
  externalDocs?: {
    description?: string;
    url: string;
  };
}

export interface OpenAPIComponents {
  schemas?: Record<string, any>;
  responses?: Record<string, any>;
  parameters?: Record<string, any>;
  requestBodies?: Record<string, any>;
  headers?: Record<string, any>;
  securitySchemes?: Record<string, OpenAPISecurityScheme>;
}

export interface OpenAPISecurityScheme {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  description?: string;
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
  flows?: any;
  openIdConnectUrl?: string;
}

export interface OpenAPIDocument {
  openapi: string;
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  paths: Record<string, OpenAPIPath>;
  components?: OpenAPIComponents;
  security?: Array<Record<string, string[]>>;
  tags?: OpenAPITag[];
  externalDocs?: {
    description?: string;
    url: string;
  };
}

export interface OpenAPIPath {
  [method: string]: OpenAPIOperation;
}

export interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  deprecated?: boolean;
  security?: Array<Record<string, string[]>>;
}

export interface OpenAPIParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema: any;
}

export interface OpenAPIRequestBody {
  description?: string;
  content: Record<
    string,
    {
      schema: any;
      example?: any;
      examples?: Record<string, any>;
    }
  >;
  required?: boolean;
}

export interface OpenAPIResponse {
  description: string;
  headers?: Record<string, any>;
  content?: Record<
    string,
    {
      schema: any;
      example?: any;
      examples?: Record<string, any>;
    }
  >;
}

export interface RouteDocumentation {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  deprecated?: boolean;
  security?: Array<Record<string, string[]>>;
}

export interface OpenAPIOptions {
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  tags?: OpenAPITag[];
  security?: Array<Record<string, string[]>>;
  components?: OpenAPIComponents;
  externalDocs?: {
    description?: string;
    url: string;
  };
}
