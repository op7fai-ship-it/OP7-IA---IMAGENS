import { GenerateResponseError } from '../contracts/generate';

export type ErrorCode =
    | 'ENV_MISSING'
    | 'METHOD_NOT_ALLOWED'
    | 'INVALID_BODY'
    | 'INVALID_PROMPT'
    | 'MODEL_NOT_SUPPORTED'
    | 'IMAGE_TOO_LARGE'
    | 'PROVIDER_ERROR'
    | 'TIMEOUT'
    | 'UNKNOWN_NET_ERROR'
    | 'INTERNAL_SERVER_ERROR'
    | 'AI_GENERATION_FAILED';

export const toErrorResponse = (
    code: ErrorCode,
    message: string,
    details?: string,
    httpStatus?: number
): GenerateResponseError => {
    return {
        ok: false,
        error: {
            code,
            message,
            ...(details ? { details } : {}),
            ...(httpStatus ? { httpStatus } : {})
        }
    };
};
