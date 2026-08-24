/**
 * Sales Order Detail
 *
 * One job, from what was sold through to what has been bought, received, and
 * installed. Three tabs because those are three different jobs a person sits
 * down to do: check the scope, split it across manufacturers, chase the
 * acknowledgments.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardText,
  Storefront,
  ListChecks,
  Paperclip,
  Package,
} from '@phosphor-icons/react';
import { PageContent } from '@/components/common/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, FULFILLMENT_TYPE_LABELS, type FulfillmentType } from '@/lib/pricing';
import {
  useSalesOrder,
  useOrderLines,
  useOrderFulfillment,
  useVendorPOs,
  useOrderProgress,
} from '@/hooks/queries/useSalesOrders';
import { FanOutPanel } from '@/components/features/orders/FanOutPanel';
import { AcknowledgmentDialog } from '@/components/features/orders/AcknowledgmentDialog';
import { EntityAttachments } from '@/components/features/attachments/EntityAttachments';
import { ReceiveDialog } from '@/components/features/orders/ReceiveDialog';
import { usePOProgress } from '@/hooks/queries/useReceipts';
import { cn } from '@/lib/utils';

export default function SalesOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = useSalesOrder(orderId);
  const { data: lines = [] } = useOrderLines(orderId);
  const { data: fulfillment = {} } = useOrderFulfillment(orderId);
  const { data: pos = [] } = useVendorPOs(orderId);
  const { data: progress = {} } = useOrderProgress(order?.organization_id);
  // Receiving status per manufacturer order, derived the same way.
  const { data: poProgress = {} } = usePOProgress(orderId);

  const [ackPOId, setAckPOId] = useState<string | null>(null);
  const [receivePOId, setReceivePOId] = useState<string | null>(null);

  const lineLabels = useMemo(
    () => Object.fromEntries(lines.map(l => [l.id, l.description])),
    [lines]
  );

  const totals = useMemo(() => {
    let cost = 0;
    let sell = 0;
    for (const line of lines) {
      cost += Number(line.quantity) * Number(line.unit_cost);
      sell += Number(line.sell_price);
    }
    return { cost, sell, margin: sell - cost };
  }, [lines]);

  const activePO = pos.find(p => p.id === ackPOId);
  const receivingPO = pos.find(p => p.id === receivePOId);

  if (isLoading) {
    return (
      <PageContent>
        <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </PageContent>
    );
  }

  if (!order) {
    return (
      <PageContent showPageHeader title="Order not found">
        <Button variant="outline" onClick={() => navigate('/orders')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to orders
        </Button>
      </PageContent>
    );
  }

  return (
    <PageContent
      showPageHeader
      title={order.order_number ?? 'Draft order'}
      subtitle={[
        order.customer_po_number && `Customer PO ${order.customer_po_number}`,
        order.contract_vehicle,
        progress[order.id]?.derived_status ?? order.status,
      ]
        .filter(Boolean)
        .join(' · ')}
      headerActions={
        <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Orders
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Money at a glance */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Cost', value: formatCurrency(totals.cost) },
            { label: 'Sell', value: formatCurrency(totals.sell) },
            {
              label: 'Gross margin',
              value: formatCurrency(totals.margin),
              hint:
                totals.sell > 0
                  ? `${((totals.margin / totals.sell) * 100).toFixed(1)}%`
                  : undefined,
            },
          ].map(tile => (
            <div
              key={tile.label}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <p className="text-[10px] uppercase tracking-wide text-gray-500">
                {tile.label}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {tile.value}
                {tile.hint && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {tile.hint}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="lines">
          <TabsList>
            <TabsTrigger value="lines">
              <ListChecks className="w-4 h-4 mr-1.5" />
              Lines ({lines.length})
            </TabsTrigger>
            <TabsTrigger value="fanout">
              <Storefront className="w-4 h-4 mr-1.5" />
              Purchasing
            </TabsTrigger>
            <TabsTrigger value="pos">
              <ClipboardText className="w-4 h-4 mr-1.5" />
              Orders placed ({pos.length})
            </TabsTrigger>
            <TabsTrigger value="files">
              <Paperclip className="w-4 h-4 mr-1.5" />
              Files
            </TabsTrigger>
          </TabsList>

          {/* What was sold, and how far each line has got */}
          <TabsContent value="lines" className="mt-4">
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5 w-10">#</th>
                    <th className="px-3 py-2.5">Item</th>
                    <th className="px-3 py-2.5">Route</th>
                    <th className="px-3 py-2.5 text-right">Qty</th>
                    <th className="px-3 py-2.5 text-right">Ordered</th>
                    <th className="px-3 py-2.5 text-right">Received</th>
                    <th className="px-3 py-2.5 text-right">Installed</th>
                    <th className="px-3 py-2.5 text-right">Sell</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(line => {
                    const f = fulfillment[line.id];
                    const route = line.fulfillment_type as FulfillmentType | null;
                    return (
                      <tr
                        key={line.id}
                        className="border-t border-gray-100 dark:border-gray-700/50"
                      >
                        <td className="px-3 py-2.5 text-xs text-gray-400 tabular-nums">
                          {line.line_number}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-gray-900 dark:text-gray-100">
                            {line.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {[line.manufacturer_name, line.model_number, line.area]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {route ? (
                            <span className="text-gray-600 dark:text-gray-300">
                              {FULFILLMENT_TYPE_LABELS[route].label}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              Not routed
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {Number(line.quantity)}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right tabular-nums',
                            f && Number(f.qty_to_order) > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-gray-500'
                          )}
                        >
                          {f ? Number(f.qty_ordered) : 0}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">
                          {f ? Number(f.qty_received) : 0}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">
                          {f ? Number(f.qty_installed) : 0}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-900 dark:text-gray-100">
                          {formatCurrency(Number(line.sell_price))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="fanout" className="mt-4">
            <FanOutPanel order={order} />
          </TabsContent>

          {/* Orders placed with each manufacturer, and what came back */}
          <TabsContent value="pos" className="mt-4">
            {pos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-12 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Nothing placed yet
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Use the Purchasing tab to split this order across its
                  manufacturers.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {pos.map((po, index) => (
                  <div
                    key={po.id}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3',
                      index > 0 && 'border-t border-gray-100 dark:border-gray-700/50'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {po.po_number ?? 'No order number yet'}
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          {po.manufacturer_name}
                        </span>
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                        <span>{poProgress[po.id]?.derived_status ?? po.status}</span>
                        {Number(poProgress[po.id]?.qty_received ?? 0) > 0 && (
                          <span>
                            {Number(poProgress[po.id]?.qty_received)} of{' '}
                            {Number(poProgress[po.id]?.qty_ordered)} received
                          </span>
                        )}
                        {po.placed_at && (
                          <span>
                            Placed {new Date(po.placed_at).toLocaleDateString()}
                          </span>
                        )}
                        {po.requested_ship_date && (
                          <span>Requested {po.requested_ship_date}</span>
                        )}
                        {po.acknowledged_ship_date && (
                          <span>Confirmed {po.acknowledged_ship_date}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant={po.acknowledged_at ? 'ghost' : 'default'}
                        size="sm"
                        onClick={() => setAckPOId(po.id)}
                      >
                        {po.acknowledged_at ? 'Update ack' : 'Record ack'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReceivePOId(po.id)}
                      >
                        <Package className="w-4 h-4 mr-1.5" />
                        Receive
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          {/* The customer's contract, the spec file, drawings — and later, the
              acknowledgment PDFs an extraction was run against. */}
          <TabsContent value="files" className="mt-4">
            <EntityAttachments
              organizationId={order.organization_id}
              entityType="sales_order"
              entityId={order.id}
              title="Order files"
            />
          </TabsContent>
        </Tabs>
      </div>

      <ReceiveDialog
        open={!!receivePOId}
        onOpenChange={open => !open && setReceivePOId(null)}
        organizationId={order.organization_id}
        salesOrderId={order.id}
        vendorPOId={receivePOId}
        poNumber={receivingPO?.po_number}
        manufacturerName={receivingPO?.manufacturer_name}
      />

      <AcknowledgmentDialog
        open={!!ackPOId}
        onOpenChange={open => !open && setAckPOId(null)}
        vendorPOId={ackPOId}
        poNumber={activePO?.po_number}
        manufacturerName={activePO?.manufacturer_name}
        requestedShipDate={activePO?.requested_ship_date}
        lineLabels={lineLabels}
      />
    </PageContent>
  );
}
