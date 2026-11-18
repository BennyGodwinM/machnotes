import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { put, del, head } from "@vercel/blob";

// Article images, read back at compile time so Typst can embed them (see
// compile.ts's PRELUDE image() wrapping). Same Blob-vs-local-disk split as
// resource-storage.ts, kept as its own module since Media and Resource are
// unrelated tables with separate id spaces.
const STORAGE_DIR = join(process.cwd(), "storage", "media");
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function saveMediaFile(mediaId: string, buffer: Buffer): Promise<string> {
  if (useBlob) {
    const blob = await put(`media/${mediaId}`, buffer, { access: "public", addRandomSuffix: false });
    return blob.url;
  }
  await mkdir(STORAGE_DIR, { recursive: true });
  await writeFile(join(STORAGE_DIR, mediaId), buffer);
  return `local://media/${mediaId}`;
}

export async function readMediaFile(mediaId: string): Promise<Buffer> {
  if (useBlob) {
    const blob = await head(`media/${mediaId}`);
    const res = await fetch(blob.url);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(join(STORAGE_DIR, mediaId));
}

export async function deleteMediaFile(mediaId: string): Promise<void> {
  if (useBlob) {
    await del(`media/${mediaId}`).catch(() => {});
    return;
  }
  await unlink(join(STORAGE_DIR, mediaId)).catch(() => {});
}
