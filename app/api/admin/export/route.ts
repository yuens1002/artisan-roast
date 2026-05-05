import { NextResponse } from "next/server";
import archiver from "archiver";
import { Readable } from "node:stream";
import { ReadableStream } from "node:stream/web";

import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { APP_VERSION } from "@/lib/version";

// ---------------------------------------------------------------------------
// Data export — admin-authed ZIP stream
//
// Bundles a subset of the store's data + media into a ZIP file the customer
// can download from the License & Privacy → Data Privacy tab. Endpoint is
// gated on admin auth; non-admin requests get a 403 without a body.
//
// ZIP contents:
//   data/products.json       (Product table dump)
//   data/orders.json         (Order table dump)
//   data/users.json          (User table dump — passwords stripped)
//   data/siteSettings.json   (SiteSettings table dump)
//   media/                   (placeholder directory entry)
//   manifest.json            (export metadata: timestamp, app version, counts)
// ---------------------------------------------------------------------------

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  // Single-tenant assumption: each store has its own DB, so findMany() with no
  // where clause returns only this store's data. Not multi-tenant safe.
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err: Error) => {
    console.error("Export archive error:", err);
    archive.abort();
  });

  const [products, orders, users, siteSettings] = await Promise.all([
    prisma.product.findMany(),
    prisma.order.findMany(),
    prisma.user.findMany({
      // Strip credential fields — never include password hashes in an export
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        image: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.siteSettings.findMany(),
  ]);

  archive.append(JSON.stringify(products, null, 2), {
    name: "data/products.json",
  });
  archive.append(JSON.stringify(orders, null, 2), { name: "data/orders.json" });
  archive.append(JSON.stringify(users, null, 2), { name: "data/users.json" });
  archive.append(JSON.stringify(siteSettings, null, 2), {
    name: "data/siteSettings.json",
  });

  // Empty media/ directory entry — placeholder for future Vercel Blob asset
  // streaming. Today the directory exists in the ZIP via a .keep marker.
  archive.append("", { name: "media/.keep" });

  const manifest = {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    schemaVersion: "1.0",
    counts: {
      products: products.length,
      orders: orders.length,
      users: users.length,
      siteSettings: siteSettings.length,
    },
  };
  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

  archive.finalize();

  // Convert the Node stream into a Web ReadableStream for the Response body.
  const webStream = Readable.toWeb(archive) as ReadableStream<Uint8Array>;

  const filename = `artisan-roast-export-${new Date().toISOString().split("T")[0]}.zip`;

  return new Response(webStream as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
