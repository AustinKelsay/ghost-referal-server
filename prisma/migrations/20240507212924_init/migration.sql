-- CreateTable
CREATE TABLE "Referrer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Referrer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referee" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "referrerId" INTEGER NOT NULL,

    CONSTRAINT "Referee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referrer_email_key" ON "Referrer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Referee_email_key" ON "Referee"("email");

-- AddForeignKey
ALTER TABLE "Referee" ADD CONSTRAINT "Referee_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Referrer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
