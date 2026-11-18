-- DropIndex
DROP INDEX "Article_search_vector_idx";

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "siteTitle" TEXT NOT NULL DEFAULT 'MachNotes',
    "siteDescription" TEXT NOT NULL DEFAULT 'Notes on aerospace engineering.',

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
