export type FeedbackStatus = "RECEIVED" | "IN_REVIEW" | "PLANNED" | "DONE" | "DECLINED";

export type FeedbackEntity = {
    id: string;
    tenantId: string;
    title: string;
    description: string;
    status: FeedbackStatus;
    createdById: string;
    createdAt: string;
    updatedAt: string;
};

export type FeedbackComment = {
    id: string;
    content: string;
    createdAt: string;
    user?: { id: string; email: string } | null;
};

export type ContextItem = { key: string; label: string; value: string };
