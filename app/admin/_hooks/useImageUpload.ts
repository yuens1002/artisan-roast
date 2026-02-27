import { useState, useEffect, useCallback, useRef } from "react";

interface UseImageUploadOptions {
  /** Current saved URL from the database */
  currentUrl: string;
  /** Page slug for organizing uploads into /pages/[pageSlug]/ */
  pageSlug?: string;
  /** Callback when upload completes successfully */
  onUploadComplete?: (newPath: string) => void;
}

interface UseImageUploadReturn {
  /** The file waiting to be uploaded on save */
  pendingFile: File | null;
  /** Object URL for previewing the pending file */
  previewUrl: string | null;
  /** The URL to display (preview if pending, otherwise current) */
  displayUrl: string;
  /** Whether there's a pending change */
  isDirty: boolean;
  /** Handle file selection from input. Second param is optional preview URL from ImageField. */
  handleFileSelect: (file: File, imageFieldPreviewUrl?: string) => void;
  /** Upload the pending file and clean up the old one */
  uploadFile: () => Promise<string | null>;
  /** Reset state (call on cancel) */
  reset: () => void;
  /** Clean up preview URL (call on unmount/dialog close) */
  cleanup: () => void;
}

/**
 * Hook for managing single image upload with deferred upload pattern.
 *
 * Features:
 * - Tracks pending file until save
 * - Manages preview URL lifecycle
 * - Handles old image cleanup on upload
 * - Syncs with current URL when it changes (after save)
 *
 * @example
 * ```tsx
 * const { pendingFile, previewUrl, displayUrl, handleFileSelect, uploadFile, reset } =
 *   useImageUpload({ currentUrl: block.content.imageUrl });
 *
 * // In save handler:
 * const newPath = await uploadFile();
 * if (newPath) {
 *   onUpdate({ ...block, content: { ...block.content, imageUrl: newPath } });
 * }
 * ```
 */
export function useImageUpload({
  currentUrl,
  pageSlug,
  onUploadComplete,
}: UseImageUploadOptions): UseImageUploadReturn {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Track the URL at time of dialog open for cleanup
  const [originalUrl, setOriginalUrl] = useState<string>(currentUrl);

  // Sync originalUrl when currentUrl changes (after successful save)
  useEffect(() => {
    setOriginalUrl(currentUrl);
  }, [currentUrl]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback(
    (file: File, imageFieldPreviewUrl?: string) => {
      // Validate file
      if (file.size > 5 * 1024 * 1024) {
        // Revoke URL created by ImageField if any
        if (imageFieldPreviewUrl) {
          URL.revokeObjectURL(imageFieldPreviewUrl);
        }
        throw new Error("File size must be less than 5MB");
      }
      if (!file.type.startsWith("image/")) {
        // Revoke URL created by ImageField if any
        if (imageFieldPreviewUrl) {
          URL.revokeObjectURL(imageFieldPreviewUrl);
        }
        throw new Error("File must be an image");
      }

      // Clean up old preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Use the preview URL created by ImageField (avoid double creation)
      // Or create our own if ImageField didn't provide one
      const newPreviewUrl = imageFieldPreviewUrl || URL.createObjectURL(file);
      setPendingFile(file);
      setPreviewUrl(newPreviewUrl);
    },
    [previewUrl]
  );

  const uploadFile = useCallback(async (): Promise<string | null> => {
    if (!pendingFile) {
      return null;
    }

    const formData = new FormData();
    formData.append("file", pendingFile);

    // Pass page slug for directory organization
    if (pageSlug) {
      formData.append("pageSlug", pageSlug);
    }

    // Pass original URL for cleanup (local files or blob URLs)
    if (
      originalUrl &&
      (originalUrl.startsWith("/") ||
        originalUrl.includes(".blob.vercel-storage.com"))
    ) {
      formData.append("oldPath", originalUrl);
    }

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    const newPath = data.path;

    // Update original URL to the new path (for subsequent replacements)
    setOriginalUrl(newPath);

    // Clean up
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPendingFile(null);
    setPreviewUrl(null);

    onUploadComplete?.(newPath);
    return newPath;
  }, [pendingFile, originalUrl, previewUrl, pageSlug, onUploadComplete]);

  const reset = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPendingFile(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  const cleanup = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const displayUrl = previewUrl || currentUrl;
  const isDirty = pendingFile !== null;

  return {
    pendingFile,
    previewUrl,
    displayUrl,
    isDirty,
    handleFileSelect,
    uploadFile,
    reset,
    cleanup,
  };
}

// ============================================================================
// Multi-image support
// ============================================================================

interface ImageItem {
  url: string;
  alt: string;
  pendingFile?: File;
  previewUrl?: string;
  originalUrl?: string;
}

interface UseMultiImageUploadOptions {
  /** Current saved images from the database */
  currentImages: Array<{ url: string; alt: string }>;
  /** Minimum number of images required */
  minImages?: number;
  /** Maximum number of images allowed */
  maxImages?: number;
  /** Page slug for organizing uploads into /pages/[pageSlug]/ */
  pageSlug?: string;
}

interface UseMultiImageUploadReturn {
  /** Current image items with pending changes */
  images: ImageItem[];
  /** Whether there are any pending changes */
  isDirty: boolean;
  /** Add a new empty image slot at the end */
  addImage: () => void;
  /** Add a new empty image slot after the given index */
  addImageAfter: (index: number) => void;
  /** Remove image at index */
  removeImage: (index: number) => void;
  /** Move image up in order */
  moveUp: (index: number) => void;
  /** Move image down in order */
  moveDown: (index: number) => void;
  /** Handle file selection for an image */
  handleFileSelect: (index: number, file: File) => void;
  /** Update alt text for an image */
  updateAlt: (index: number, alt: string) => void;
  /** Upload all pending files and return final image array */
  uploadAll: () => Promise<Array<{ url: string; alt: string }>>;
  /** Reset to current saved state */
  reset: () => void;
  /** Clean up all preview URLs */
  cleanup: () => void;
  /** Whether we can add more images */
  canAdd: boolean;
  /** Whether we can remove images (respects minImages) */
  canRemove: boolean;
  /** Currently highlighted index (for new item animation) */
  highlightedIndex: number | null;
  /** Manually set highlighted index (or null to clear) */
  setHighlightedIndex: (index: number | null) => void;
  /** Ref callback for card elements (for scroll into view) */
  setCardRef: (index: number, el: HTMLDivElement | null) => void;
  // ImageListField compatibility
  /** Images in ImageListField format (just url and alt) */
  imageListFieldImages: Array<{ url: string; alt: string }>;
  /** Pending files as Map for ImageListField */
  pendingFilesMap: Map<number, { file: File; previewUrl: string }>;
  /** Wrapper for ImageListField onFileSelect */
  handleImageListFieldFileSelect: (
    index: number,
    file: File,
    previewUrl: string
  ) => void;
  /** Wrapper for ImageListField onChange */
  handleImageListFieldChange: (
    newImages: Array<{ url: string; alt: string }>
  ) => void;
}

/**
 * Hook for managing multiple image uploads with deferred upload pattern.
 *
 * Features:
 * - Add/remove/reorder images
 * - Tracks pending files until save
 * - Manages preview URL lifecycle
 * - Handles old image cleanup on upload
 * - Syncs with current images when they change (after save)
 *
 * @example
 * ```tsx
 * const { images, addImage, removeImage, handleFileSelect, uploadAll, reset } =
 *   useMultiImageUpload({ currentImages: block.content.images, minImages: 1 });
 *
 * // In save handler:
 * const uploadedImages = await uploadAll();
 * onUpdate({ ...block, content: { ...block.content, images: uploadedImages } });
 * ```
 */
export function useMultiImageUpload({
  currentImages,
  minImages = 0,
  maxImages = 20,
  pageSlug,
}: UseMultiImageUploadOptions): UseMultiImageUploadReturn {
  const [images, setImages] = useState<ImageItem[]>(() =>
    currentImages.map((img) => ({
      url: img.url,
      alt: img.alt,
      originalUrl: img.url,
    }))
  );

  // Highlight state for newly added items
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Ref callback for card elements
  const setCardRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(index, el);
    } else {
      cardRefs.current.delete(index);
    }
  }, []);

  // Helper to highlight and scroll to new item
  const highlightNewItem = useCallback((index: number) => {
    setHighlightedIndex(index);
    setTimeout(() => {
      cardRefs.current
        .get(index)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    setTimeout(() => setHighlightedIndex(null), 1500);
  }, []);

  // Track previous currentImages to detect actual changes from parent
  const prevCurrentImagesRef = useRef<string>(
    JSON.stringify(currentImages.map((img) => ({ url: img.url, alt: img.alt })))
  );

  // Sync with currentImages when they change (after successful save)
  // Use JSON comparison to avoid infinite loops from new array references
  useEffect(() => {
    const currentImagesKey = JSON.stringify(
      currentImages.map((img) => ({ url: img.url, alt: img.alt }))
    );

    if (currentImagesKey !== prevCurrentImagesRef.current) {
      prevCurrentImagesRef.current = currentImagesKey;
      // Only sync if we haven't made local changes
      // This handles the case after a successful save
      const timeoutId = setTimeout(() => {
        setImages(
          currentImages.map((img) => ({
            url: img.url,
            alt: img.alt,
            originalUrl: img.url,
          }))
        );
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    // We intentionally only depend on currentImages here
    // The comparison logic handles avoiding unnecessary updates
  }, [currentImages]);

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.previewUrl) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, [images]); // Include images to ensure cleanup of all current preview URLs

  const addImage = useCallback(() => {
    if (images.length >= maxImages) return;
    const newIndex = images.length;
    setImages((prev) => [...prev, { url: "", alt: "" }]);
    highlightNewItem(newIndex);
  }, [images.length, maxImages, highlightNewItem]);

  const addImageAfter = useCallback(
    (index: number) => {
      if (images.length >= maxImages) return;
      const newIndex = index + 1;
      setImages((prev) => {
        const updated = [...prev];
        updated.splice(index + 1, 0, { url: "", alt: "" });
        return updated;
      });
      highlightNewItem(newIndex);
    },
    [images.length, maxImages, highlightNewItem]
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const item = prev[index];
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setImages((prev) => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [
        updated[index],
        updated[index - 1],
      ];
      return updated;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setImages((prev) => {
      if (index >= prev.length - 1) return prev;
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [
        updated[index + 1],
        updated[index],
      ];
      return updated;
    });
  }, []);

  const handleFileSelect = useCallback((index: number, file: File) => {
    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size must be less than 5MB");
    }
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    setImages((prev) => {
      const updated = [...prev];
      const item = updated[index];

      // Clean up old preview URL
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }

      // Create new preview
      const previewUrl = URL.createObjectURL(file);
      updated[index] = {
        ...item,
        pendingFile: file,
        previewUrl,
      };
      return updated;
    });
  }, []);

  const updateAlt = useCallback((index: number, alt: string) => {
    setImages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], alt };
      return updated;
    });
  }, []);

  const uploadAll = useCallback(async (): Promise<
    Array<{ url: string; alt: string }>
  > => {
    const results = await Promise.all(
      images.map(async (img) => {
        if (!img.pendingFile) {
          return { url: img.url, alt: img.alt };
        }

        const formData = new FormData();
        formData.append("file", img.pendingFile);

        // Pass page slug for directory organization
        if (pageSlug) {
          formData.append("pageSlug", pageSlug);
        }

        // Pass original URL for cleanup (local files or blob URLs)
        if (
          img.originalUrl &&
          (img.originalUrl.startsWith("/") ||
            img.originalUrl.includes(".blob.vercel-storage.com"))
        ) {
          formData.append("oldPath", img.originalUrl);
        }

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();

        // Clean up preview URL
        if (img.previewUrl) {
          URL.revokeObjectURL(img.previewUrl);
        }

        return { url: data.path, alt: img.alt };
      })
    );

    return results;
  }, [images, pageSlug]);

  const reset = useCallback(() => {
    // Clean up preview URLs
    images.forEach((img) => {
      if (img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });

    // Reset to current saved state
    setImages(
      currentImages.map((img) => ({
        url: img.url,
        alt: img.alt,
        originalUrl: img.url,
      }))
    );
  }, [currentImages, images]);

  const cleanup = useCallback(() => {
    images.forEach((img) => {
      if (img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
  }, [images]);

  const isDirty = images.some((img) => img.pendingFile !== undefined);
  const canAdd = images.length < maxImages;
  const canRemove = images.length > minImages;

  // ImageListField compatibility helpers
  const imageListFieldImages = images.map((img) => ({
    url: img.previewUrl || img.url,
    alt: img.alt,
  }));

  const pendingFilesMap = new Map<number, { file: File; previewUrl: string }>();
  images.forEach((img, index) => {
    if (img.pendingFile && img.previewUrl) {
      pendingFilesMap.set(index, {
        file: img.pendingFile,
        previewUrl: img.previewUrl,
      });
    }
  });

  const handleImageListFieldFileSelect = useCallback(
    (index: number, file: File, previewUrl: string) => {
      setImages((prev) => {
        const updated = [...prev];
        const item = updated[index];

        // Clean up old preview URL if different
        if (item?.previewUrl && item.previewUrl !== previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }

        updated[index] = {
          ...item,
          pendingFile: file,
          previewUrl,
        };
        return updated;
      });
    },
    []
  );

  const handleImageListFieldChange = useCallback(
    (newImages: Array<{ url: string; alt: string }>) => {
      setImages((prev) => {
        // Match new images with existing ones to preserve pending files
        return newImages.map((newImg, index) => {
          const existing = prev[index];
          if (existing && existing.url === newImg.url) {
            // Same image, just update alt
            return { ...existing, alt: newImg.alt };
          }
          // New or changed image
          return {
            url: newImg.url,
            alt: newImg.alt,
            originalUrl: newImg.url,
          };
        });
      });
    },
    []
  );

  return {
    images,
    isDirty,
    addImage,
    addImageAfter,
    removeImage,
    moveUp,
    moveDown,
    handleFileSelect,
    updateAlt,
    uploadAll,
    reset,
    cleanup,
    canAdd,
    canRemove,
    // Highlight state for newly added items
    highlightedIndex,
    setHighlightedIndex,
    setCardRef,
    // ImageListField compatibility
    imageListFieldImages,
    pendingFilesMap,
    handleImageListFieldFileSelect,
    handleImageListFieldChange,
  };
}
