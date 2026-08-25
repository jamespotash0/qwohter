/**
 * Companies
 *
 * The customers a dealer bills and ships to.
 *
 * Deliberately customers only. The vendor address book was removed on purpose —
 * orders are placed in each manufacturer's own portal, so there is no letter to
 * address and no account to maintain. Manufacturers are carried as text on the
 * lines that name them.
 *
 * Retiring an account deactivates rather than deletes it, because order history
 * still points at it. Deactivated accounts are hidden until asked for.
 */

import { useMemo, useState } from 'react';
import { Buildings, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { PageContent } from '@/components/common/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DataTable,
  EmptyState,
  StatusChip,
  type DataColumn,
} from '@/components/common/backoffice';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries';
import { useCompanies } from '@/hooks/queries/useCompanies';
import { CompanyDialog } from '@/components/features/companies/CompanyDialog';
import type { Company } from '@/services/companiesService';

export default function CompaniesPage() {
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id ?? '');
  const organizationId = organization?.id;

  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Company | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: companies = [], isLoading } = useCompanies(organizationId, showInactive);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return companies;
    // Name and city, because those are the two things somebody remembers about
    // a customer they are trying to find.
    return companies.filter(
      company =>
        company.name.toLowerCase().includes(term) ||
        (company.billing_city ?? '').toLowerCase().includes(term)
    );
  }, [companies, search]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const columns = useMemo<DataColumn<Company>[]>(
    () => [
      {
        key: 'name',
        header: 'Company',
        primary: true,
        render: company => (
          <>
            <p className="text-gray-900 dark:text-gray-100">{company.name}</p>
            {company.legal_name && company.legal_name !== company.name && (
              <p className="text-xs font-normal text-gray-500">{company.legal_name}</p>
            )}
          </>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: company => (
          <StatusChip
            tone={company.company_type === 'Customer' ? 'info' : 'neutral'}
            size="sm"
          >
            {company.company_type}
          </StatusChip>
        ),
      },
      {
        key: 'where',
        header: 'Bill to',
        render: company => {
          const where = [company.billing_city, company.billing_state]
            .filter(Boolean)
            .join(', ');
          return (
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {where || <span className="text-gray-400">No address</span>}
            </span>
          );
        },
      },
      {
        key: 'phone',
        header: 'Phone',
        render: company => (
          <span className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
            {company.phone ?? '—'}
          </span>
        ),
      },
      {
        key: 'terms',
        header: 'Terms',
        render: company => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {company.payment_terms ?? '—'}
            {company.tax_exempt && (
              <StatusChip tone="neutral" size="sm" className="ml-1.5">
                Tax exempt
              </StatusChip>
            )}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: company =>
          company.is_active ? (
            <span className="text-sm text-gray-400">Active</span>
          ) : (
            <StatusChip tone="neutral" size="sm">
              Inactive
            </StatusChip>
          ),
      },
    ],
    []
  );

  return (
    <PageContent
      showPageHeader
      title="Companies"
      subtitle="The customers you bill and ship to."
      headerActions={
        <Button onClick={openNew} disabled={!organizationId}>
          <Plus className="mr-1.5 h-4 w-4" />
          New company
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or city"
              className="pl-9"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Show inactive
          </label>
        </div>

        <DataTable
          rows={filtered}
          columns={columns}
          getRowId={company => company.id}
          isLoading={isLoading}
          onRowClick={company => {
            setEditing(company);
            setDialogOpen(true);
          }}
          empty={
            <EmptyState
              icon={Buildings}
              title={search ? 'No company matches that' : 'No companies yet'}
              description={
                search
                  ? 'Try the company name, or the city it bills from.'
                  : 'Add the customers you bill. An order asks for one, so this is worth doing before the first job.'
              }
              action={
                !search && <Button onClick={openNew}>Add the first company</Button>
              }
            />
          }
        />
      </div>

      {organizationId && (
        <CompanyDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          organizationId={organizationId}
          company={editing}
        />
      )}
    </PageContent>
  );
}
