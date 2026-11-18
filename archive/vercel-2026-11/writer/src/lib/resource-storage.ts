import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { put, del, head } from "@vercel/blob";

// Vercel's serverless filesystem is ephemeral/read-only outside /tmp, so
// uploads go to Vercel Blob there. Local dev without BLOB_READ_WRITE_TOKEN
// falls back to local disk so it keeps working without a Blob store.
const STORAGE_DIR = join(process.cwd(), "storage", "resources");
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function saveResourceFile(resourceId: string, buffer: Buffer): Promise<void> {
  if (useBlob) {
    await put(resourceId, buffer, { access: "public", addRandomSuffix: false });
    return;
  }
  await mkdir(STORAGE_DIR, { recursive: true });
  await writeFile(join(STORAGE_DIR, resourceId), buffer);
}

export async function readResourceFile(resourceId: string): Promise<Buffer> {
  if (useBlob) {
    const blob = await head(resourceId);
    const res = await fetch(blob.url);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(join(STORAGE_DIR, resourceId));
}

export async function deleteResourceFile(resourceId: string): Promise<void> {
  if (useBlob) {
    await del(resourceId).catch(() => {});
    return;
  }
  await unlink(join(STORAGE_DIR, resourceId)).catch(() => {});
}
