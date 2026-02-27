import { type ReactNode, type RefObject } from "react";
import PageContainer from "@/components/shared/PageContainer";

interface ProductDetailLayoutProps {
  breadcrumb: ReactNode;
  gallery: ReactNode;
  header: ReactNode;
  details?: ReactNode;
  purchaseControls: ReactNode;
  purchaseControlsRef?: RefObject<HTMLDivElement | null>;
  brewGuide?: ReactNode;
  story?: ReactNode;
  addOns?: ReactNode;
  reviews?: ReactNode;
  relatedProducts?: ReactNode;
  floatingButton?: ReactNode;
  hasDetails?: boolean;
}

export function ProductDetailLayout({
  breadcrumb,
  gallery,
  header,
  details,
  purchaseControls,
  purchaseControlsRef,
  brewGuide,
  story,
  addOns,
  reviews,
  relatedProducts,
  floatingButton,
  hasDetails = false,
}: ProductDetailLayoutProps) {
  return (
    <PageContainer>
      {breadcrumb}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-x-10 md:gap-y-5 lg:gap-x-14 lg:gap-y-8">
        <div className="w-full min-w-0 md:sticky md:top-6 md:self-start animate-fade-in-up">
          {gallery}
        </div>

        <div className="w-full min-w-0 flex flex-col gap-4">
          {header}

          <div className="flex flex-col-reverse lg:flex-row gap-4 lg:gap-8 lg:mt-4">
            {details && (
              <div className="lg:flex-[2] lg:min-w-0">{details}</div>
            )}

            <div
              ref={purchaseControlsRef}
              className={`${hasDetails ? "lg:flex-[3]" : "lg:w-3/4"} lg:min-w-0`}
            >
              {purchaseControls}
            </div>
          </div>

          {addOns}

          {/* Story stays in right column when there's no brew guide */}
          {story && !brewGuide && story}
        </div>
      </div>

      {/* Side-by-side only when both story and brew guide exist */}
      {story && brewGuide && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-14 mt-8">
          <div>{story}</div>
          <div>{brewGuide}</div>
        </div>
      )}

      {/* Brew guide alone gets full width below */}
      {brewGuide && !story && (
        <div className="mt-8">{brewGuide}</div>
      )}

      {reviews}

      {relatedProducts}

      {floatingButton}
    </PageContainer>
  );
}
