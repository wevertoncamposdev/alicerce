import { FileText, MessageSquare } from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@core/registry/actions";

import { FormView } from "@components/TypeView/FormView/FormView";
import { RelationTablePanel } from "@core/components/DetailView/RelationView/RelationTablePanel";
import { FeedbacksListView } from "@modules/feedbacks/components/FeedbacksListView";
import { FeedbackStatusControl } from "@modules/feedbacks/components/FeedbackStatusControl";

import {
    searchFeedbacks, readFeedback, createFeedback, updateFeedback, deleteFeedback,
} from "./provider";
import { listFeedbackComments, createFeedbackComment, deleteFeedbackComment } from "./comments-provider";
import type { FeedbackEntity, ContextItem } from "../types/types";

// `status` não entra aqui de propósito: mudar status exige `feedback.manage`
// (ver FeedbackStatusControl), uma permissão separada de `feedback.update` —
// não faz parte do formulário comum de edição.
const formFields = [
    { name: "title" as const, label: "Título", placeholder: "Digite o título", type: "text" as const, required: true },
    { name: "description" as const, label: "Descrição", placeholder: "Descreva o feedback", type: "textarea" as const, required: true },
];

const { parseListState, serializeListState } = createListQueryState();

const createFeedbackAction = createRecordFormAction.bind(
    null,
    "feedbacks",
    formFields,
);

const feedbacksListLayout: ListLayout<FeedbackEntity> = {
    list: ({ data, pagination, searchArgs }) => (
        <FeedbacksListView data={data} pagination={pagination} sort={searchArgs.sort} />
    ),
    form: () => (
        <FormView<FeedbackEntity>
            mode="create"
            fields={formFields}
            createAction={createFeedbackAction}
        />
    ),
};

const feedbacksDetailLayout: DetailLayout<FeedbackEntity> = {
    header: ({ record }) => ({
        title: record.title,
        subtitle: [`Criado em ${new Date(record.createdAt).toLocaleDateString("pt-BR")}`],
        status: <FeedbackStatusControl feedback={record} />,
    }),
    sections: [
        {
            key: "details",
            title: "Detalhes",
            icon: FileText,
            column: 1,
            editable: true,
            fields: ["title", "description"],
        },
    ],
    relations: async ({ record }) => {
        const comments = await listFeedbackComments(record.id);
        return [
            {
                key: "comentarios",
                label: "Comentários",
                icon: MessageSquare,
                count: comments.length,
                content: (
                    <RelationTablePanel
                        favoriteId={record.id}
                        initialNotes={comments}
                        createNoteFn={createFeedbackComment}
                        deleteNoteFn={deleteFeedbackComment}
                        searchPlaceholder="Pesquisar comentários"
                        addLabel="Novo comentário"
                        emptyMessage="Nenhum comentário encontrado."
                    />
                ),
            },
        ];
    },
};

function loadFeedbackContext(record: FeedbackEntity): ContextItem[] {
    return [
        { key: "createdAt", label: "Criado em", value: new Date(record.createdAt).toLocaleString("pt-BR") },
    ];
}

export const feedbacksModule = defineRecordModule<FeedbackEntity>({
    model: "feedbacks",
    label: "Feedbacks",
    views: ["list"],
    defaultView: "list",
    dataHandlers: {
        search: searchFeedbacks,
        read: readFeedback,
        create: createFeedback,
        update: updateFeedback,
        delete: deleteFeedback,
    },
    formFields,
    parseListState,
    serializeListState,
    listLayout: feedbacksListLayout,
    detailLayout: feedbacksDetailLayout,
    detailConfig: { auditEnabled: true, loadContext: loadFeedbackContext },
});

registerModule(feedbacksModule);
