-- CreateTable
CREATE TABLE "ArticleRevision" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "typstSource" TEXT NOT NULL,
    "excerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleRevision_articleId_createdAt_idx" ON "ArticleRevision"("articleId", "createdAt");

-- AddForeignKey
ALTER TABLE "ArticleRevision" ADD CONSTRAINT "ArticleRevision_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
