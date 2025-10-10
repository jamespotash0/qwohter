/**
 * Form Builder Test Page
 * Testing ground for the new form builder system
 */

import { useState } from 'react';
import { PageContent } from '@/components/common/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CascadingProductSelector } from '@/components/features/products/CascadingProductSelector';
import { ProductSpecificationsForm } from '@/components/features/products/ProductSpecificationsForm';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useProductStore, type ProductSelection } from '@/stores/products/productStore';
import { Package, FileText, Table, Eye, Sparkles } from 'lucide-react';

export default function FormBuilderTest() {
  const [selectedProducts, setSelectedProducts] = useState<ProductSelection[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [showSpecsForm, setShowSpecsForm] = useState(false);

  const {
    selectedType,
    selectedManufacturer,
    selectedCategory,
    selectedSeries,
    selectedModel,
    reset: resetProductStore,
  } = useProductStore();

  const handleProductSelect = (product: ProductSelection) => {
    setSelectedProducts((prev) => [...prev, product]);
    setShowSpecsForm(false);
    setShowSelector(false);
    resetProductStore();
  };

  const handleModelSelected = () => {
    if (selectedModel) {
      setShowSelector(false);
      setShowSpecsForm(true);
    }
  };

  const removeProduct = (index: number) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const totalValue = selectedProducts.reduce((sum, p) => sum + p.pricing.subtotal, 0);

  return (
    <PageContent>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Form Builder System Test
            </h1>
            <p className="text-muted-foreground mt-2">
              Testing cascading product selection and dynamic forms
            </p>
          </div>
          <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Beta Testing
          </Badge>
        </div>

        <Separator />

        {/* Tabs */}
        <Tabs defaultValue="selector" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="selector" className="gap-2">
              <Package className="w-4 h-4" />
              Selector
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <FileText className="w-4 h-4" />
              Products
              {selectedProducts.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedProducts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Product Selector */}
          <TabsContent value="selector" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cascading Product Selector</CardTitle>
                <CardDescription>
                  Select products through the 5-level hierarchy: Type → Manufacturer → Category → Series → Model
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showSelector && !showSpecsForm ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold mb-2">No Product Selected</h3>
                    <p className="text-muted-foreground mb-6">
                      Start by selecting a product from the hierarchy
                    </p>
                    <Button
                      onClick={() => setShowSelector(true)}
                      size="lg"
                      className="bg-gradient-to-r from-primary to-primary/80"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Select Product
                    </Button>
                  </div>
                ) : showSelector ? (
                  <CascadingProductSelector
                    onProductSelect={() => handleModelSelected()}
                    onCancel={() => {
                      setShowSelector(false);
                      resetProductStore();
                    }}
                  />
                ) : showSpecsForm && selectedModel ? (
                  <ProductSpecificationsForm
                    model={selectedModel}
                    productHierarchy={{
                      type: selectedType?.name || '',
                      type_id: selectedType?.id || '',
                      manufacturer: selectedManufacturer?.name || '',
                      manufacturer_id: selectedManufacturer?.id || '',
                      category: selectedCategory?.name || '',
                      category_id: selectedCategory?.id || '',
                      series: selectedSeries?.name || '',
                      series_id: selectedSeries?.id || '',
                    }}
                    onSubmit={handleProductSelect}
                    onCancel={() => {
                      setShowSpecsForm(false);
                      setShowSelector(true);
                    }}
                  />
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Selected Products */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Selected Products</CardTitle>
                    <CardDescription>
                      Products that will be included in the quote
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowSelector(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No products selected yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedProducts.map((product, index) => (
                      <Card key={index} className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                  {product.product_hierarchy.model_number}
                                </Badge>
                                <Badge className="bg-primary/10 text-primary">
                                  {product.product_hierarchy.type}
                                </Badge>
                              </div>
                              <h4 className="font-semibold">
                                {product.product_hierarchy.model}
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Manufacturer:</span>{' '}
                                  <span className="font-medium">
                                    {product.product_hierarchy.manufacturer}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Category:</span>{' '}
                                  <span className="font-medium">
                                    {product.product_hierarchy.category}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Series:</span>{' '}
                                  <span className="font-medium">
                                    {product.product_hierarchy.series}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Quantity:</span>{' '}
                                  <span className="font-medium">
                                    {product.pricing.quantity}
                                  </span>
                                </div>
                              </div>
                              {Object.keys(product.specifications).length > 0 && (
                                <div className="pt-2">
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Specifications:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(product.specifications).map(
                                      ([key, value]) => (
                                        <Badge key={key} variant="secondary" className="text-xs">
                                          {key}: {String(value)}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="text-right space-y-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Unit Price</p>
                                <p className="text-lg font-semibold">
                                  ${product.pricing.unit_price.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Subtotal</p>
                                <p className="text-xl font-bold text-primary">
                                  ${product.pricing.subtotal.toLocaleString()}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeProduct(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Separator />

                    <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <span className="text-lg font-semibold">Total Value</span>
                      <span className="text-2xl font-bold text-primary">
                        ${totalValue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Preview */}
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quote Preview</CardTitle>
                <CardDescription>
                  Preview how this data would appear in a quote
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Eye className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Add products to see preview</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="prose prose-sm max-w-none">
                      <h3>Quote Data Structure</h3>
                      <pre className="bg-muted p-4 rounded-lg overflow-auto">
                        {JSON.stringify(
                          {
                            products: selectedProducts,
                            computed_totals: {
                              subtotal: totalValue,
                              tax: 0,
                              total: totalValue,
                              currency: 'USD',
                            },
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContent>
  );
}
