-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('RECEIVED', 'IN_REVIEW', 'PLANNED', 'DONE', 'DECLINED');

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_comments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "feedbackId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedbacks_tenantId_idx" ON "feedbacks"("tenantId");

-- CreateIndex
CREATE INDEX "feedbacks_createdById_idx" ON "feedbacks"("createdById");

-- CreateIndex
CREATE INDEX "feedback_comments_feedbackId_idx" ON "feedback_comments"("feedbackId");

-- CreateIndex
CREATE INDEX "feedback_comments_tenantId_idx" ON "feedback_comments"("tenantId");

-- CreateIndex
CREATE INDEX "feedback_comments_userId_idx" ON "feedback_comments"("userId");

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
