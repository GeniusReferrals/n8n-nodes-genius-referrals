import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeType, ILoadOptionsFunctions, INodeExecutionData, INodeProperties, IExecuteFunctions } from 'n8n-workflow';
type GeniusReferralsExecuteContext = IExecuteFunctions & {
    continueOnFail(): boolean;
    getInputData(): INodeExecutionData[];
    getNode(): {
        [key: string]: unknown;
    };
    getNodeParameter(name: string, itemIndex: number, fallbackValue?: unknown): unknown;
};
type GeniusReferralsLoadOptionsFunctions = ILoadOptionsFunctions & {
    getCurrentNodeParameter(name: string): unknown;
};
export declare class GeniusReferrals implements INodeType {
    description: {
        version: number;
        icon: {
            light: string;
            dark: string;
        };
        subtitle: string;
        defaults: {
            name: string;
        };
        inputs: NodeConnectionTypes[];
        outputs: NodeConnectionTypes[];
        credentials: {
            name: string;
            required: boolean;
        }[];
        properties: INodeProperties[];
        usableAsTool: boolean;
    };
    methods: {
        loadOptions: {
            getAccounts(this: GeniusReferralsLoadOptionsFunctions): Promise<{
                name: string;
                value: string;
            }[]>;
            getBonusesRedemptionMethods(this: GeniusReferralsLoadOptionsFunctions): Promise<{
                name: string;
                value: string;
            }[]>;
            getCurrencies(this: GeniusReferralsLoadOptionsFunctions): Promise<{
                name: string;
                value: string;
            }[]>;
            getRedemptionRequestActions(this: GeniusReferralsLoadOptionsFunctions): Promise<{
                name: string;
                value: string;
            }[]>;
            getRedemptionRequestStatuses(this: GeniusReferralsLoadOptionsFunctions): Promise<{
                name: string;
                value: string;
            }[]>;
            getReferralOrigins(this: GeniusReferralsLoadOptionsFunctions): Promise<{
                name: string;
                value: string;
            }[]>;
        };
    };
    execute(this: GeniusReferralsExecuteContext): Promise<INodeExecutionData[][]>;
    private getNodeOperationParameters;
    private getOptionalStringParameter;
}
export {};
