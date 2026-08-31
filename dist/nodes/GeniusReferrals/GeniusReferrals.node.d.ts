import { NodeApiError } from 'n8n-workflow';
import type { ILoadOptionsFunctions, INode, INodeExecutionData, INodeType, INodeTypeDescription, IExecuteFunctions } from 'n8n-workflow';
type GeniusReferralsExecuteContext = IExecuteFunctions & {
    continueOnFail(): boolean;
    getInputData(): INodeExecutionData[];
    getNode?: () => INode;
    getNodeParameter(name: string, itemIndex: number, fallbackValue?: unknown): unknown;
    nodeApiErrorCtor?: typeof NodeApiError;
};
type GeniusReferralsLoadOptionsFunctions = ILoadOptionsFunctions & {
    getCurrentNodeParameter(name: string): unknown;
};
export declare class GeniusReferrals implements INodeType {
    description: INodeTypeDescription;
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
