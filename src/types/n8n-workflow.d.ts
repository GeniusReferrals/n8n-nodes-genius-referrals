declare module 'n8n-workflow' {
  export type GenericValue =
    | string
    | number
    | boolean
    | IDataObject
    | GenericValue[]
    | null
    | undefined;

  export interface IDataObject {
    [key: string]: GenericValue;
  }

  export type IHttpRequestMethods = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';

  export interface IHttpRequestOptions {
    url: string;
    baseURL?: string;
    headers?: IDataObject;
    method?: IHttpRequestMethods;
    body?: GenericValue | GenericValue[];
    qs?: IDataObject;
    json?: boolean;
    skipSslCertificateValidation?: boolean | string;
    returnFullResponse?: boolean;
    ignoreHttpStatusErrors?: boolean;
  }

  export interface IAuthenticate {
    type: 'generic';
    properties: {
      auth?: {
        username: string;
        password: string;
        sendImmediately?: boolean;
      };
      body?: IDataObject;
      headers?: IDataObject;
      qs?: IDataObject;
      url?: string;
      skipSslCertificateValidation?: boolean | string;
    };
  }

  export interface ICredentialTestRequest {
    request: IHttpRequestOptions;
    rules?: Array<{
      type: 'responseCode';
      properties: {
        value: number;
        message: string;
      };
    }>;
  }

  export interface ICredentialType {
    name: string;
    displayName: string;
    documentationUrl?: string;
    authenticate?: IAuthenticate;
    properties: Array<Record<string, unknown>>;
    test?: ICredentialTestRequest;
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
