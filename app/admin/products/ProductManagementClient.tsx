"use client";

import {
  ColumnVisibilityToggle,
  DataTable,
  DataTableActionBar,
  type ActionBarConfig,
} from "@/app/admin/_components/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useToast } from "@/hooks/use-toast";
import { ProductType } from "@prisma/client";
import { Filter, Package, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { updateOption, deleteOption } from "./actions/options";
import { deleteProduct } from "./actions/products";
import { updateVariant } from "./actions/variants";
import { EditVariantDialog } from "./_components/EditVariantDialog";
import { type Product, TOGGLABLE_COLUMNS, useProductsTable } from "./hooks/useProductsTable";

interface ProductManagementClientProps {
  title?: string;
  description?: string;
  productType?: ProductType;
}

export default function ProductManagementClient({
  title: _title = "Product Management",
  description: _description = "Manage products and inventory",
  productType = ProductType.COFFEE,
}: ProductManagementClientProps) {
  const basePath =
    productType === ProductType.MERCH ? "/admin/merch" : "/admin/products";
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Dialog state
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const search = new URLSearchParams();
      if (productType) search.set("type", productType);
      const response = await fetch(
        `/api/admin/products?${search.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data.products);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [productType, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleStockUpdate = useCallback(
    async (variantId: string, stock: number) => {
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: p.variants.map((v) =>
            v.id === variantId ? { ...v, stock } : v
          ),
          stock: p.variants.reduce(
            (acc, v) =>
              acc + (v.id === variantId ? stock : v.stock),
            0
          ),
        }))
      );
      const result = await updateVariant(variantId, {
        stockQuantity: stock,
      });
      if (!result.ok) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        fetchProducts();
      }
    },
    [toast, fetchProducts]
  );

  const handlePriceUpdate = useCallback(
    async (
      optionId: string,
      cents: number,
      field: "priceInCents" | "salePriceInCents" = "priceInCents"
    ) => {
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: p.variants.map((v) => ({
            ...v,
            options: v.options.map((o) =>
              o.id === optionId ? { ...o, [field]: cents } : o
            ),
          })),
        }))
      );
      const result = await updateOption(optionId, { [field]: cents });
      if (!result.ok) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        fetchProducts();
      }
    },
    [toast, fetchProducts]
  );

  const handleOptionUpdate = useCallback(
    async (
      optionId: string,
      data: {
        priceInCents?: number;
        salePriceInCents?: number | null;
        billingIntervalCount?: number;
        billingInterval?: string;
      }
    ) => {
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: p.variants.map((v) => ({
            ...v,
            options: v.options.map((o) =>
              o.id === optionId ? { ...o, ...data } : o
            ),
          })),
        }))
      );
      const result = await updateOption(optionId, data);
      if (!result.ok) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        fetchProducts();
      }
    },
    [toast, fetchProducts]
  );

  const handleOptionDelete = useCallback(
    async (optionId: string, variantId: string) => {
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: p.variants.map((v) =>
            v.id === variantId
              ? { ...v, options: v.options.filter((o) => o.id !== optionId) }
              : v
          ),
        }))
      );
      const result = await deleteOption(optionId);
      if (!result.ok) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        fetchProducts();
      }
    },
    [toast, fetchProducts]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const result = await deleteProduct(deleteTarget.id);
    if (result.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast({ title: "Product deleted" });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
    setDeleteTarget(null);
  }, [deleteTarget, toast]);

  const handleEditProduct = useCallback((product: Product) => {
    router.push(`${basePath}/${product.id}`);
  }, [router, basePath]);

  const handleEditVariants = useCallback((product: Product) => {
    setEditProduct(product);
  }, []);

  const handleDeleteProduct = useCallback((product: Product) => {
    setDeleteTarget(product);
  }, []);

  const {
    table,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    filterConfigs,
    columnVisibility,
    handleVisibilityChange,
  } = useProductsTable({
    products,
    onStockUpdate: handleStockUpdate,
    onPriceUpdate: handlePriceUpdate,
    onEditProduct: handleEditProduct,
    onEditVariants: handleEditVariants,
    onDeleteProduct: handleDeleteProduct,
  });

  const actionBarConfig = useMemo<ActionBarConfig>(
    () => ({
      left: [
        {
          type: "button",
          label: "Add Product",
          icon: Plus,
          href: `${basePath}/new`,
          iconOnly: "below-lg",
        },
        {
          type: "search",
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Search products...",
          collapse: { icon: Search },
        },
        {
          type: "filter",
          configs: filterConfigs,
          activeFilter,
          onFilterChange: setActiveFilter,
          collapse: { icon: Filter },
        },
      ],
      right: [
        {
          type: "custom",
          content: (
            <ColumnVisibilityToggle
              columns={TOGGLABLE_COLUMNS}
              columnVisibility={columnVisibility}
              onVisibilityChange={handleVisibilityChange}
            />
          ),
        },
        {
          type: "recordCount",
          count: table.getFilteredRowModel().rows.length,
          label: "products",
        },
        {
          type: "pageSizeSelector",
          table,
        },
        {
          type: "pagination",
          table,
        },
      ],
    }),
    [searchQuery, basePath, filterConfigs, activeFilter, setSearchQuery, setActiveFilter, table, columnVisibility, handleVisibilityChange]
  );

  if (loading) {
    return <div>Loading products...</div>;
  }

  if (products.length === 0) {
    return (
      <div>
        <DataTableActionBar config={actionBarConfig}  />
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package />
            </EmptyMedia>
            <EmptyTitle>No products yet</EmptyTitle>
            <EmptyDescription>
              Get started by adding your first product.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href={`${basePath}/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <DataTableActionBar config={actionBarConfig}  />
      <DataTable
        table={table}
        onRowDoubleClick={(product) => router.push(`${basePath}/${product.id}`)}
        emptyMessage="No products match your search."
      />

      {/* Edit Variant Dialog */}
      {editProduct && (
        <EditVariantDialog
          open={!!editProduct}
          onOpenChange={(open) => {
            if (!open) setEditProduct(null);
          }}
          productName={editProduct.name}
          variants={editProduct.variants}
          onStockUpdate={handleStockUpdate}
          onOptionUpdate={handleOptionUpdate}
          onOptionDelete={handleOptionDelete}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
