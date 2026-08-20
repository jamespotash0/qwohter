/**
 * Fan-Out Panel
 *
 * One customer order becomes a purchase order per manufacturer. This shows the
 * split before it is committed, and reports the three things that are *not*
 * ready to order — each for a different reason, and each fixed somewhere else.
 *
 * That separation matters: telling a dealer their own install crew is "missing a
 * vendor" trains them to ignore the warning that actually costs money.
 */

import { useState } from 'react';
import { Warning, Info, PaperPlaneTilt, Storefront } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, FULFILLMENT_TYPE_LABELS } from '@/lib/pricing';
import {
  useFanOutPlan,
  useFanOutPurchaseOrders,
  type SalesOrder,
} from '@/hooks/queries/useSalesOrders';

interface FanOutPanelProps {
  order: SalesOrder;
}

export function FanOutPanel({ order }: FanOutPanelProps) {
  const { data: plan, isLoading } = useFanOutPlan(order.id);
  const fanOut = useFanOutPurchaseOrders();
  const [requestedShipDate, setRequestedShipDate] = useState('');

  if (isLoading) {
    return (
      <div className="h-40 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 animate-pulse" />
    );
  }

  if (!plan) return null;

  const totalToOrder = plan.groups.reduce((sum, g) => sum + g.totalCost, 0);
  const hasSomethingToOrder = plan.groups.length > 0;

  const handleIssue = () => {
    fanOut.mutate({
      plan,
      base: {
        organization_id: order.organization_id,
        sales_order_id: order.id,
        status: 'Draft',
        requested_ship_date: requestedShipDate || null,
        ship_to_name: order.ship_to_name,
        ship_to_address_line1: order.ship_to_address_line1,
        ship_to_address_line2: order.ship_to_address_line2,
        ship_to_city: order.ship_to_city,
        ship_to_state: order.ship_to_state,
        ship_to_postal_code: order.ship_to_postal_code,
        ship_to_country: order.ship_to_country,
      },
    });
  };

  return (
    <div className="space-y-4">
      {hasSomethingToOrder ? (
        <>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {plan.groups.map((group, index) => (
              <div
                key={group.vendorId}
                className={
                  index > 0 ? 'border-t border-gray-100 dark:border-gray-700/50' : ''
                }
              >
                <div className="flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Storefront className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {group.vendorName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {group.lines.length} line{group.lines.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <span className="tabular-nums font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(group.totalCost)}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {group.lines.map(line => (
                      <tr
                        key={line.orderLineId}
                        className="border-t border-gray-100 dark:border-gray-700/50"
                      >
                        <td className="px-4 py-2 w-10 text-xs text-gray-400 tabular-nums">
                          {line.lineNumber}
                        </td>
                        <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                          {line.description}
                          {line.modelNumber && (
                            <span className="ml-2 text-xs text-gray-500">
                              {line.modelNumber}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-gray-600 dark:text-gray-300">
                          {line.quantity}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-gray-600 dark:text-gray-300">
                          {formatCurrency(line.unitCost)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(line.extendedCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fan-ship" className="text-xs">
                Requested ship date
              </Label>
              <Input
                id="fan-ship"
                type="date"
                value={requestedShipDate}
                onChange={e => setRequestedShipDate(e.target.value)}
                className="h-9 w-44"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {plan.groups.length} purchase order
                {plan.groups.length === 1 ? '' : 's'} ·{' '}
                <span className="tabular-nums font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalToOrder)}
                </span>
              </span>
              <Button onClick={handleIssue} disabled={fanOut.isPending}>
                <PaperPlaneTilt className="w-4 h-4 mr-1.5" />
                {fanOut.isPending ? 'Creating…' : 'Create purchase orders'}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-10 text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Nothing left to order
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Every purchasable line on this order is already on a purchase order.
          </p>
        </div>
      )}

      {/* Blocked: real product, no vendor account. Fixed in Settings. */}
      {plan.unassignedLines.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
          <div className="flex items-start gap-2">
            <Warning className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                {plan.unassignedLines.length} line
                {plan.unassignedLines.length === 1 ? '' : 's'} have no vendor account
              </p>
              <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                {[...new Set(plan.unassignedLines.map(l => l.manufacturerName ?? 'Unnamed'))].join(', ')}
                {' — '}add them under Settings &rsaquo; Vendors, then reload this page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unrouted: the form never said how these are delivered. */}
      {plan.unroutedLines.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
          <div className="flex items-start gap-2">
            <Warning className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                {plan.unroutedLines.length} line
                {plan.unroutedLines.length === 1 ? '' : 's'} are not routed
              </p>
              <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                Nothing says whether these are purchased, self-performed, or a
                pass-through cost, so neither ordering nor scheduling can claim
                them. Set the fulfillment type on the form&rsquo;s pricing sections.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Not a problem: own labor and pass-throughs. Shown for completeness. */}
      {plan.notPurchased.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {plan.notPurchased.length} line
                {plan.notPurchased.length === 1 ? '' : 's'} are never purchased
              </p>
              <ul className="mt-1 space-y-0.5 text-gray-500">
                {plan.notPurchased.slice(0, 6).map(line => (
                  <li key={line.orderLineId}>
                    {line.description}
                    <span className="ml-2 text-xs">
                      {FULFILLMENT_TYPE_LABELS[line.fulfillmentType].label}
                    </span>
                  </li>
                ))}
                {plan.notPurchased.length > 6 && (
                  <li className="text-xs">
                    and {plan.notPurchased.length - 6} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FanOutPanel;
