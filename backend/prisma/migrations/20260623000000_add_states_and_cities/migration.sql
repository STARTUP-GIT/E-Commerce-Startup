-- CreateTable: states
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cities (districts)
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL DEFAULT 'Karnataka',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "states_name_key" ON "states"("name");
CREATE INDEX "states_name_idx" ON "states"("name");
CREATE INDEX "states_isActive_idx" ON "states"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");
CREATE INDEX "cities_name_idx" ON "cities"("name");
CREATE INDEX "cities_isActive_idx" ON "cities"("isActive");
