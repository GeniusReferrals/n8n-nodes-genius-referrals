declare module 'n8n-workflow' {
  export interface ICredentialType {
    name: string;
    displayName: string;
    documentationUrl?: string;
    properties: Array<Record<string, unknown>>;
  }

  export interface INodeProperties {
    displayName: string;
    name: string;
    type: string;
    default: unknown;
    required?: boolean;
    description?: string;
    typeOptions?: Record<string, unknown>;
    placeholder?: string;
    options?: Array<Record<string, unknown>>;
    displayOptions?: Record<string, unknown>;
    [key: string]: unknown;
  }
}
