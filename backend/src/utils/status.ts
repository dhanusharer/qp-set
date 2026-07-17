import { AssignmentStatus } from "@prisma/client";

export function toDbStatus(status?: string) {
  if (!status) return undefined;
  if (status === "Revision Required") return AssignmentStatus.RevisionRequired;
  return status as AssignmentStatus;
}

export function fromDbStatus(status: AssignmentStatus) {
  return status === AssignmentStatus.RevisionRequired ? "Revision Required" : status;
}
