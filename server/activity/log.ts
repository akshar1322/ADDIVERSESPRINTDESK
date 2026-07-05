type ActivityActorType = "ADMIN" | "EMPLOYEE" | "SYSTEM";

type ActivityMetadata = Record<string, unknown>;

type ActivityLogData = {
  actorId?: string;
  actorType?: ActivityActorType;
  actorAdminId?: string;
  actorEmployeeId?: string;
  projectId?: string;
  shiftSessionId?: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: ActivityMetadata;
};

type ActivityWriter = {
  activityLog: {
    create(args: { data: ActivityLogData }): Promise<unknown>;
  };
};

export async function logActivity(writer: ActivityWriter, data: ActivityLogData) {
  await writer.activityLog.create({
    data: {
      actorId: data.actorId,
      actorType: data.actorType ?? inferActorType(data),
      actorAdminId: data.actorAdminId,
      actorEmployeeId: data.actorEmployeeId,
      projectId: data.projectId,
      shiftSessionId: data.shiftSessionId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      metadata: data.metadata,
    },
  });
}

function inferActorType(data: ActivityLogData): ActivityActorType {
  if (data.actorEmployeeId) {
    return "EMPLOYEE";
  }

  if (data.actorAdminId || data.actorId) {
    return "ADMIN";
  }

  return "SYSTEM";
}
