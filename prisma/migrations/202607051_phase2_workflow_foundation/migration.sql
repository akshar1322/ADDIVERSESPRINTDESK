-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'READY_TO_DELIVER', 'DISPATCHED', 'ARCHIVED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FilePreviewType" AS ENUM ('MODEL_3D', 'IMAGE', 'PDF', 'DOWNLOAD_ONLY');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('DAY', 'NIGHT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProductionRunStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('COMPLETION', 'PACKAGING', 'DISPATCH');

-- CreateEnum
CREATE TYPE "ActivityActorType" AS ENUM ('ADMIN', 'EMPLOYEE', 'SYSTEM');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "contactPerson" TEXT;

-- AlterTable
ALTER TABLE "Printer" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "machineNumber" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "adminInstructions" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryNotes" TEXT,
ADD COLUMN     "dispatchedAt" TIMESTAMP(3),
ADD COLUMN     "expectedCompletionAt" TIMESTAMP(3),
ADD COLUMN     "jobNumber" TEXT,
ADD COLUMN     "materialTypeId" TEXT,
ADD COLUMN     "readyToDeliverAt" TIMESTAMP(3),
ADD COLUMN     "requiredQuantity" INTEGER,
ADD COLUMN     "workflowStatus" "JobStatus" NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "ProjectFile" ADD COLUMN     "fileExtension" TEXT,
ADD COLUMN     "previewType" "FilePreviewType";

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "actorAdminId" TEXT,
ADD COLUMN     "actorEmployeeId" TEXT,
ADD COLUMN     "actorType" "ActivityActorType",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "shiftSessionId" TEXT;

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultShiftType" "ShiftType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSession" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "shiftSessionId" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ShiftType" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSession" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftDefinitionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "printerId" TEXT,
    "startedByEmployeeId" TEXT NOT NULL,
    "currentEmployeeId" TEXT,
    "shiftSessionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" "ProductionRunStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "ProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobProgressUpdate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "productionRunId" TEXT,
    "employeeId" TEXT NOT NULL,
    "shiftSessionId" TEXT NOT NULL,
    "printedQuantity" INTEGER NOT NULL,
    "remainingQuantity" INTEGER NOT NULL,
    "materialUsedGrams" DECIMAL(65,30),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobProgressUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPhoto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "PhotoType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "uploadedByEmployeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "dispatchedByEmployeeId" TEXT,
    "shiftSessionId" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handover" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromEmployeeId" TEXT,
    "toEmployeeId" TEXT NOT NULL,
    "fromShiftSessionId" TEXT,
    "toShiftSessionId" TEXT NOT NULL,
    "note" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- CreateIndex
CREATE INDEX "Employee_defaultShiftType_idx" ON "Employee"("defaultShiftType");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSession_sessionToken_key" ON "EmployeeSession"("sessionToken");

-- CreateIndex
CREATE INDEX "EmployeeSession_employeeId_expiresAt_idx" ON "EmployeeSession"("employeeId", "expiresAt");

-- CreateIndex
CREATE INDEX "EmployeeSession_sessionToken_idx" ON "EmployeeSession"("sessionToken");

-- CreateIndex
CREATE INDEX "EmployeeSession_shiftSessionId_idx" ON "EmployeeSession"("shiftSessionId");

-- CreateIndex
CREATE INDEX "ShiftDefinition_type_isActive_idx" ON "ShiftDefinition"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftDefinition_name_type_key" ON "ShiftDefinition"("name", "type");

-- CreateIndex
CREATE INDEX "ShiftSession_employeeId_startedAt_idx" ON "ShiftSession"("employeeId", "startedAt");

-- CreateIndex
CREATE INDEX "ShiftSession_shiftDefinitionId_startedAt_idx" ON "ShiftSession"("shiftDefinitionId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialType_code_key" ON "MaterialType"("code");

-- CreateIndex
CREATE INDEX "MaterialType_isActive_idx" ON "MaterialType"("isActive");

-- CreateIndex
CREATE INDEX "ProductionRun_projectId_idx" ON "ProductionRun"("projectId");

-- CreateIndex
CREATE INDEX "ProductionRun_status_idx" ON "ProductionRun"("status");

-- CreateIndex
CREATE INDEX "ProductionRun_shiftSessionId_idx" ON "ProductionRun"("shiftSessionId");

-- CreateIndex
CREATE INDEX "JobProgressUpdate_projectId_createdAt_idx" ON "JobProgressUpdate"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "JobProgressUpdate_productionRunId_idx" ON "JobProgressUpdate"("productionRunId");

-- CreateIndex
CREATE INDEX "JobProgressUpdate_employeeId_createdAt_idx" ON "JobProgressUpdate"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "JobProgressUpdate_shiftSessionId_createdAt_idx" ON "JobProgressUpdate"("shiftSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "JobPhoto_projectId_type_idx" ON "JobPhoto"("projectId", "type");

-- CreateIndex
CREATE INDEX "JobPhoto_uploadedByEmployeeId_createdAt_idx" ON "JobPhoto"("uploadedByEmployeeId", "createdAt");

-- CreateIndex
CREATE INDEX "Delivery_projectId_idx" ON "Delivery"("projectId");

-- CreateIndex
CREATE INDEX "Delivery_dispatchedAt_idx" ON "Delivery"("dispatchedAt");

-- CreateIndex
CREATE INDEX "Delivery_dispatchedByEmployeeId_dispatchedAt_idx" ON "Delivery"("dispatchedByEmployeeId", "dispatchedAt");

-- CreateIndex
CREATE INDEX "Handover_projectId_createdAt_idx" ON "Handover"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Handover_toEmployeeId_acceptedAt_idx" ON "Handover"("toEmployeeId", "acceptedAt");

-- CreateIndex
CREATE INDEX "Printer_isActive_idx" ON "Printer"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Project_jobNumber_key" ON "Project"("jobNumber");

-- CreateIndex
CREATE INDEX "Project_workflowStatus_idx" ON "Project"("workflowStatus");

-- CreateIndex
CREATE INDEX "Project_expectedCompletionAt_idx" ON "Project"("expectedCompletionAt");

-- CreateIndex
CREATE INDEX "Project_dispatchedAt_idx" ON "Project"("dispatchedAt");

-- CreateIndex
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");

-- CreateIndex
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");

-- CreateIndex
CREATE INDEX "ActivityLog_actorAdminId_createdAt_idx" ON "ActivityLog"("actorAdminId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_actorEmployeeId_createdAt_idx" ON "ActivityLog"("actorEmployeeId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_projectId_createdAt_idx" ON "ActivityLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_shiftSessionId_createdAt_idx" ON "ActivityLog"("shiftSessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_materialTypeId_fkey" FOREIGN KEY ("materialTypeId") REFERENCES "MaterialType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSession" ADD CONSTRAINT "EmployeeSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSession" ADD CONSTRAINT "EmployeeSession_shiftSessionId_fkey" FOREIGN KEY ("shiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSession" ADD CONSTRAINT "ShiftSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSession" ADD CONSTRAINT "ShiftSession_shiftDefinitionId_fkey" FOREIGN KEY ("shiftDefinitionId") REFERENCES "ShiftDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_startedByEmployeeId_fkey" FOREIGN KEY ("startedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_currentEmployeeId_fkey" FOREIGN KEY ("currentEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_shiftSessionId_fkey" FOREIGN KEY ("shiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProgressUpdate" ADD CONSTRAINT "JobProgressUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProgressUpdate" ADD CONSTRAINT "JobProgressUpdate_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProgressUpdate" ADD CONSTRAINT "JobProgressUpdate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProgressUpdate" ADD CONSTRAINT "JobProgressUpdate_shiftSessionId_fkey" FOREIGN KEY ("shiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_uploadedByEmployeeId_fkey" FOREIGN KEY ("uploadedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_dispatchedByEmployeeId_fkey" FOREIGN KEY ("dispatchedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_shiftSessionId_fkey" FOREIGN KEY ("shiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_fromEmployeeId_fkey" FOREIGN KEY ("fromEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_fromShiftSessionId_fkey" FOREIGN KEY ("fromShiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_toShiftSessionId_fkey" FOREIGN KEY ("toShiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_shiftSessionId_fkey" FOREIGN KEY ("shiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
