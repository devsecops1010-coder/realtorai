-- CreateTable
CREATE TABLE "il_districts" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "il_districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "il_sub_districts" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "districtId" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "il_sub_districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "il_settlements" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT,
    "districtId" TEXT NOT NULL,
    "subDistrictId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "population" INTEGER,

    CONSTRAINT "il_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "il_streets" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "il_streets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "il_districts_code_key" ON "il_districts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "il_sub_districts_code_key" ON "il_sub_districts"("code");

-- CreateIndex
CREATE INDEX "il_sub_districts_districtId_idx" ON "il_sub_districts"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "il_settlements_code_key" ON "il_settlements"("code");

-- CreateIndex
CREATE INDEX "il_settlements_districtId_idx" ON "il_settlements"("districtId");

-- CreateIndex
CREATE INDEX "il_settlements_subDistrictId_idx" ON "il_settlements"("subDistrictId");

-- CreateIndex
CREATE INDEX "il_settlements_nameHe_idx" ON "il_settlements"("nameHe");

-- CreateIndex
CREATE INDEX "il_streets_settlementId_nameHe_idx" ON "il_streets"("settlementId", "nameHe");

-- CreateIndex
CREATE INDEX "il_streets_nameHe_idx" ON "il_streets"("nameHe");

-- CreateIndex
CREATE UNIQUE INDEX "il_streets_settlementId_code_key" ON "il_streets"("settlementId", "code");

-- AddForeignKey
ALTER TABLE "il_sub_districts" ADD CONSTRAINT "il_sub_districts_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "il_districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "il_settlements" ADD CONSTRAINT "il_settlements_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "il_districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "il_settlements" ADD CONSTRAINT "il_settlements_subDistrictId_fkey" FOREIGN KEY ("subDistrictId") REFERENCES "il_sub_districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "il_streets" ADD CONSTRAINT "il_streets_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "il_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
