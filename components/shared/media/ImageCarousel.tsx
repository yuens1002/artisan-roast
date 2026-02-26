"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import WheelGesturesPlugin from "embla-carousel-wheel-gestures";
import { CarouselDots } from "./CarouselDots";
import { Thumbnail } from "@/app/(site)/_components/product/Thumbnail";
import { cn } from "@/lib/utils";

interface ImageCarouselProps {
  images: Array<{ url: string; alt?: string }>;
  aspectRatio?: "4/3" | "16/9" | "square";
  /** Override aspect ratio on mobile (<md). Container crops with object-cover. */
  mobileAspectRatio?: "4/3" | "16/9" | "2/1";
  className?: string;
  fallbackIcon?: React.ReactNode;
  defaultAlt?: string;
  showThumbnails?: boolean;
  showDots?: boolean;
}

/**
 * Reusable image carousel component
 * Displays one image at a time with dot navigation
 */
export function ImageCarousel({
  images,
  aspectRatio = "4/3",
  mobileAspectRatio,
  className = "",
  fallbackIcon,
  defaultAlt = "Image",
  showThumbnails = false,
  showDots = true,
}: ImageCarouselProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "center",
      containScroll: false,
      dragFree: false,
      duration: 20,
    },
    [WheelGesturesPlugin({ forceWheelAxis: "x" })]
  );
  const hasImages = images && images.length > 0;

  const desktopAspectMap = {
    "4/3": "aspect-4/3",
    "16/9": "aspect-video",
    square: "aspect-square",
  } as const;

  const mobileAspectMap = {
    "4/3": "max-md:aspect-4/3",
    "16/9": "max-md:aspect-video",
    "2/1": "max-md:aspect-[2/1]",
  } as const;

  const aspectRatioClass = mobileAspectRatio
    ? `${mobileAspectMap[mobileAspectRatio]} md:${desktopAspectMap[aspectRatio]}`
    : desktopAspectMap[aspectRatio];

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentImageIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi]
  );

  if (!hasImages) {
    return (
      <div
        className={cn(
          aspectRatioClass,
          "rounded-lg bg-muted flex items-center justify-center",
          className
        )}
      >
        {fallbackIcon}
      </div>
    );
  }

  const useThumbRail = showThumbnails && images.length > 1;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex w-full flex-col-reverse gap-4 xl:flex-row xl:gap-3 xl:overflow-hidden">
        {/* Thumbnails - first in markup, appears below on md, left on xl */}
        {useThumbRail && (
          <div className="hidden md:flex w-full gap-3 overflow-x-auto xl:w-16 xl:flex-col xl:overflow-y-auto xl:overflow-x-hidden">
            {images.map((img, idx) => (
              <Thumbnail
                key={img.url + idx}
                src={img.url}
                alt={img.alt || defaultAlt}
                selected={currentImageIndex === idx}
                onClick={() => scrollTo(idx)}
              />
            ))}
          </div>
        )}

        {/* Main image - second in markup, appears above on md, right on xl */}
        <div className="flex flex-1 min-w-0 flex-col">
          <div
            className={cn(
              "relative overflow-hidden rounded-lg",
              aspectRatioClass
            )}
            ref={emblaRef}
          >
            <div className="flex h-full w-full">
              {images.map((img, idx) => (
                <div
                  key={img.url + idx}
                  className="relative h-full min-w-0 flex-[0_0_100%] bg-muted"
                >
                  <Image
                    src={img.url}
                    alt={img.alt || defaultAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1280px) 45vw, 560px"
                    priority={idx === 0}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Dots navigation */}
          {showDots && images.length > 1 && (
            <div
              className={cn(
                "mt-4 flex justify-center",
                useThumbRail && "flex md:hidden"
              )}
            >
              <CarouselDots
                total={images.length}
                currentIndex={currentImageIndex}
                onDotClick={scrollTo}
                noBorder
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
