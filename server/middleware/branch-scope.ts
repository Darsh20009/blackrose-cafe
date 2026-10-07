export interface BranchScopedEmployee {
  role?: unknown;
  branchId?: unknown;
}

export type BranchScopeResult =
  | { branchId: string | null }
  | { status: 400 | 403; error: string };

const PLATFORM_ROLES = new Set(["owner", "admin"]);

export function resolveBranchScope(
  employee: BranchScopedEmployee,
  requestedBranchId: unknown,
): BranchScopeResult {
  const requested =
    typeof requestedBranchId === "string" ? requestedBranchId.trim() : requestedBranchId;

  if (
    requested !== undefined &&
    requested !== null &&
    requested !== "" &&
    requested !== "all" &&
    (typeof requested !== "string" || requested.length > 128)
  ) {
    return { status: 400, error: "Invalid branch ID" };
  }

  if (typeof requestedBranchId === "string" && requestedBranchId.trim() === "") {
    return { status: 400, error: "Invalid branch ID" };
  }

  if (PLATFORM_ROLES.has(String(employee.role || ""))) {
    return {
      branchId: typeof requested === "string" && requested !== "all" ? requested : null,
    };
  }

  const assignedBranchId =
    typeof employee.branchId === "string" ? employee.branchId.trim() : "";

  if (!assignedBranchId) {
    return { status: 403, error: "No branch is assigned to this account" };
  }

  if (
    typeof requested === "string" &&
    requested !== "all" &&
    requested !== assignedBranchId
  ) {
    return { status: 403, error: "You can only access your assigned branch" };
  }

  return { branchId: assignedBranchId };
}
