-- CreateIndex
CREATE UNIQUE INDEX "question_responses_assessmentId_order_key" ON "question_responses"("assessmentId", "order");
