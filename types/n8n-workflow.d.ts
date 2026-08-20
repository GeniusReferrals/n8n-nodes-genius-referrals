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

  export type JsonObject = IDataObject;

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

  export type ICredentialDataDecryptedObject = IDataObject;

  export interface INodeCredentialsDetails {
    id?: string | null;
    name: string;
  }

  export interface INode {
    id: string;
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: IDataObject;
    credentials?: Record<string, INodeCredentialsDetails>;
    disabled?: boolean;
  }

  export interface NodeApiErrorOptions {
    message?: string;
    description?: string;
    httpCode?: string;
    runIndex?: number;
    itemIndex?: number;
  }

  export class NodeApiError extends Error {
    httpCode: string | null;
    description?: string;
    context: IDataObject;

    constructor(node: INode, errorResponse: JsonObject, options?: NodeApiErrorOptions);
  }

  export enum NodeConnectionTypes {
    Main = 'main',
  }

  export type NodeGroupType = 'input' | 'output' | 'organization' | 'schedule' | 'transform' | 'trigger';

  export interface INodeTypeDescription {
    displayName: string;
    name: string;
    icon?: string | { light: string; dark: string };
    group: NodeGroupType[];
    version: number | number[];
    description: string;
    subtitle?: string;
    defaults: {
      name: string;
      [key: string]: unknown;
    };
    inputs: Array<NodeConnectionTypes | string>;
    outputs: Array<NodeConnectionTypes | string>;
    credentials?: Array<{
      name: string;
      required?: boolean;
      [key: string]: unknown;
    }>;
    properties: INodeProperties[];
    usableAsTool?: true | Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface INodeType {
    description: INodeTypeDescription;
  }

  export interface IRequestHelperFunctions {
    httpRequestWithAuthentication(
      credentialType: string,
      requestOptions: IHttpRequestOptions,
    ): Promise<unknown>;
  }

  export interface INodeExecutionData {
    json: IDataObject;
    pairedItem?: {
      item: number;
    };
  }

  export interface ICredentialAccessorFunctions {
    getCredentials(name: string): Promise<ICredentialDataDecryptedObject>;
    helpers: IRequestHelperFunctions;
  }

  export type ICredentialTestFunctions = ICredentialAccessorFunctions;

  export interface IExecuteFunctions extends ICredentialAccessorFunctions {
    continueOnFail(): boolean;
    getInputData(): INodeExecutionData[];
    getNode(): INode;
    getNodeParameter(name: string, itemIndex: number, fallbackValue?: unknown): unknown;
  }

  export type ILoadOptionsFunctions = ICredentialAccessorFunctions & {
    getCurrentNodeParameter(name: string): unknown;
  };
}
