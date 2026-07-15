export type AsyncError = string | null;

export interface AsyncState {
    loading: boolean;
    error: AsyncError;
}

export interface AsyncMutationState {
    saving: boolean;
}

export interface AsyncResourceState<T> extends AsyncState, AsyncMutationState {
    data: T;
}