import { createRestDataHandlers } from "@core/data-provider/rest-handlers";
import type { FeedbackEntity } from "../types/types";

export const {
    search: searchFeedbacks,
    read: readFeedback,
    create: createFeedback,
    update: updateFeedback,
    delete: deleteFeedback,
} = createRestDataHandlers<FeedbackEntity>("feedbacks");
