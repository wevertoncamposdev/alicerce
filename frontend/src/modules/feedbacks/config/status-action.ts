'use server';

import { apiServer } from "@lib/api-server";
import type { FeedbackEntity, FeedbackStatus } from "@modules/feedbacks/types/types";

export async function updateFeedbackStatus(feedbackId: string, status: FeedbackStatus): Promise<FeedbackEntity> {
    return apiServer.patch<FeedbackEntity>(`feedbacks/${feedbackId}/status`, { status });
}
