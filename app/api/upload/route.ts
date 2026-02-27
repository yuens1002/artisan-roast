import { NextRequest, NextResponse } from "next/server";
import { uploadToBlob, deleteFromBlob, isBlobUrl } from "@/lib/blob";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const oldPath = formData.get("oldPath") as string | null;
    const pageSlug = formData.get("pageSlug") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    const folder = pageSlug ? "pages" : "products";
    const subfolder = pageSlug || undefined;

    const { url } = await uploadToBlob({
      file,
      filename: file.name,
      folder,
      subfolder,
    });

    // Clean up old blob if replacing
    if (oldPath && isBlobUrl(oldPath)) {
      await deleteFromBlob(oldPath);
    }

    return NextResponse.json({
      success: true,
      path: url,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get("path");

    if (!imagePath) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (!isBlobUrl(imagePath)) {
      return NextResponse.json(
        { error: "Can only delete blob-stored images" },
        { status: 400 }
      );
    }

    await deleteFromBlob(imagePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
