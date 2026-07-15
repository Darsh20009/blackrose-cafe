import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  ObjectFileStub,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// Stub in-memory store for object storage
const objectStore = new Map<string, { data: Buffer; contentType: string; metadata: Record<string, any> }>();

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr.split(",").map((p) => p.trim()).filter((p) => p.length > 0)
      )
    );
    return paths;
  }

  getPrivateObjectDir(): string {
    return process.env.PRIVATE_OBJECT_DIR || "/objects";
  }

  async searchPublicObject(filePath: string): Promise<ObjectFileStub | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      if (objectStore.has(fullPath)) {
        return { name: fullPath, _metadata: objectStore.get(fullPath)?.metadata };
      }
    }
    return null;
  }

  async downloadObject(file: ObjectFileStub, res: Response, cacheTtlSec: number = 3600) {
    const stored = objectStore.get(file.name);
    if (!stored) {
      if (!res.headersSent) res.status(404).json({ error: "Object not found" });
      return;
    }
    try {
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      res.set({
        "Content-Type": stored.contentType || "application/octet-stream",
        "Content-Length": String(stored.data.length),
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });
      res.end(stored.data);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) res.status(500).json({ error: "Error downloading file" });
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const privateObjectDir = this.getPrivateObjectDir();
    return `/objects/upload/${objectId}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<ObjectFileStub> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const stored = objectStore.get(objectPath);
    if (!stored) throw new ObjectNotFoundError();
    return { name: objectPath, _metadata: stored.metadata };
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      try {
        const url = new URL(rawPath);
        return url.pathname;
      } catch {
        return rawPath;
      }
    }
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) return normalizedPath;
    try {
      const objectFile = await this.getObjectEntityFile(normalizedPath);
      await setObjectAclPolicy(objectFile, aclPolicy);
    } catch {
      // best-effort
    }
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: ObjectFileStub;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}
