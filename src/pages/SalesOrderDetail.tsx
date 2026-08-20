/**
 * Sales Order Detail
 *
 * One job, from what was sold through to what has been bought, received, and
 * installed. Three tabs because those are three different jobs a person sits
 * down to do: check the scope, raise the purchase orders, chase the vendors.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardText, Storefront, ListChecks, PaperPlaneTilt } from '@phosphor-icons/react';
import { PageContent } from '@/components/common/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, FULFILLMENT_TYPE_LABELS, type FulfillmentType } from '@/lib/pricing';
import {
  useSalesOrder,
  useOrderLines,
  useOrderFulfillment,
  useVendorPOs,
} from '@/hooks/queries/useSalesOrders';
import { useVendors } from '@/hooks/queries/useVendors';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries';
import { FanOutPanel } from '@/components/features/orders/FanOutPanel';
import { AcknowledgmentDialog } from '@/components/features/orders/AcknowledgmentDialog';
import { SendPurchaseOrderDialog } from '@/components/features/orders/SendPurchaseOrderDialog';
import { cn } from '@/lib/utils';

export default function SalesOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = useSalesOrder(orderId);
  const { data: lines = [] } = useOrderLines(orderId);
  const { data: fulfillment = {} } = useOrderFulfillment(orderId);
  const { data: pos = [] } = useVendorPOs(orderId);
  const { data: vendors = [] } = useVendors(order?.organization_id);

  // The dealer's own name goes on the purchase order letterhead.
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id ?? '');
  const organizationName = organization?.name ?? 'Your organization';

  const [ackPOId, setAckPOId] = useState<string | null>(null);
  const [sendPOId, setSendPOId] = useState<string | null>(null);

  const vendorById = useMemo(
    () => Object.fromEntries(vendors.map(v => [v.id, v])),
    [vendors]
  );
  const vendorName = useMemo(
    () => Object.fromEntries(vendors.map(v => [v.id, v.name])),
    [vendors]
  );
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
  const sendingPO = pos.find(p => p.id === sendPOId);

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
        order.status,
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
              Purchase orders ({pos.length})
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

          {/* Issued POs, and where to record what came back */}
          <TabsContent value="pos" className="mt-4">
            {pos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-12 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  No purchase orders yet
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Use the Purchasing tab to split this order across its vendors.
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
                        {po.po_number ?? 'Draft'}
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          {vendorName[po.vendor_id] ?? 'Unknown vendor'}
                        </span>
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                        <span>{po.status}</span>
                        {po.sent_at && (
                          <span>
                            Sent {new Date(po.sent_at).toLocaleDateString()}
                            {po.sent_to_email ? ` to ${po.sent_to_email}` : ''}
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
                        variant={po.sent_at ? 'ghost' : 'default'}
                        size="sm"
                        onClick={() => setSendPOId(po.id)}
                      >
                        <PaperPlaneTilt className="w-4 h-4 mr-1.5" />
                        {po.sent_at ? 'Resend' : 'Send'}
                      </Button>
                      <Button
                        variant={po.acknowledged_at ? 'ghost' : 'outline'}
                        size="sm"
                        onClick={() => setAckPOId(po.id)}
                      >
                        {po.acknowledged_at ? 'Update ack' : 'Record ack'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SendPurchaseOrderDialog
        open={!!sendPOId}
        onOpenChange={open => !open && setSendPOId(null)}
        vendorPOId={sendPOId}
        organizationId={order.organization_id}
        dealerName={organizationName}
        poNumber={sendingPO?.po_number}
        vendorName={sendingPO ? vendorName[sendingPO.vendor_id] : null}
        defaultEmail={
          sendingPO ? vendorById[sendingPO.vendor_id]?.order_email : null
        }
        alreadySent={!!sendingPO?.sent_at}
      />

      <AcknowledgmentDialog
        open={!!ackPOId}
        onOpenChange={open => !open && setAckPOId(null)}
        vendorPOId={ackPOId}
        poNumber={activePO?.po_number}
        vendorName={activePO ? vendorName[activePO.vendor_id] : null}
        requestedShipDate={activePO?.requested_ship_date}
        lineLabels={lineLabels}
      />
    </PageContent>
  );
}
