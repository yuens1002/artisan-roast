import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

const LOGO_SIZE = 128;
const CACHE_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * GET /api/email-assets/logo.png
 *
 * Serves the store logo as a PNG for email clients (which block SVG).
 * - If the logo is SVG, converts to PNG on the fly with Sharp.
 * - If already raster, proxies it through.
 * - Returns a 1x1 transparent PNG if no logo is configured.
 */
export async function GET() {
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { key: "store_logo_url" },
    });

    const logoUrl = setting?.value || null;

    if (!logoUrl) {
      return new NextResponse(null, { status: 404 });
    }

    let pngBuffer: Buffer;

    if (logoUrl.startsWith("/")) {
      // Local file in public/
      const filePath = path.join(process.cwd(), "public", logoUrl);
      const fileBuffer = await fs.readFile(filePath);

      if (logoUrl.endsWith(".svg")) {
        pngBuffer = await sharp(fileBuffer)
          .resize(LOGO_SIZE, LOGO_SIZE)
          .png()
          .toBuffer();
      } else {
        pngBuffer = await sharp(fileBuffer)
          .resize(LOGO_SIZE, LOGO_SIZE)
          .png()
          .toBuffer();
      }
    } else {
      // External URL
      const res = await fetch(logoUrl);
      if (!res.ok) {
        return new NextResponse(null, { status: 502 });
      }
      const arrayBuf = await res.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuf);

      pngBuffer = await sharp(fileBuffer)
        .resize(LOGO_SIZE, LOGO_SIZE)
        .png()
        .toBuffer();
    }

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, immutable`,
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
