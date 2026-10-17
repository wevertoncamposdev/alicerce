'use server';

import { apiServer } from "@lib/api-server";
import type { FeedbackComment } from "@modules/feedbacks/types/types";

export async function listFeedbackComments(feedbackId: string): Promise<FeedbackComment[]> {
    return apiServer.get<FeedbackComment[]>(`feedbacks/${feedbackId}/comments`);
}

export async function createFeedbackComment(feedbackId: string, content: string): Promise<FeedbackComment> {
    return apiServer.post<FeedbackComment>(`feedbacks/${feedbackId}/comments`, { content });
}

export async function deleteFeedbackComment(feedbackId: string, commentId: string): Promise<void> {
    await apiServer.delete(`feedbacks/${feedbackId}/comments/${commentId}`);
}
