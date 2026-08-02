declare module 'n8n-core' {
  export interface INodeTypeBaseDescription {
    version: number;
    defaults: {
      name: string;
    };
    inputs: string[];
    outputs: string[];
    credentials?: Array<{
      name: string;
      required?: boolean;
    }>;
    properties: Array<Record<string, unknown>>;
    [key: string]: unknown;
  }

  export interface INodeType {
    description: INodeTypeBaseDescription;
  }
}
