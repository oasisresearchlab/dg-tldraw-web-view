import { uniqueId, type TLAssetStore } from "tldraw";

/** Uploads images and video to the sync worker's R2 bucket. */
export function makeAssetStore(syncUrl: string): TLAssetStore {
  const base = syncUrl.replace(/\/+$/, "");
  return {
    async upload(_asset, file) {
      const objectName = `${uniqueId()}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, "-");
      const url = `${base}/api/uploads/${objectName}`;
      const response = await fetch(url, { method: "POST", body: file });
      if (!response.ok) throw new Error(`Failed to upload asset: ${response.statusText}`);
      return { src: url };
    },
    resolve(asset) {
      return asset.props.src;
    },
  };
}
