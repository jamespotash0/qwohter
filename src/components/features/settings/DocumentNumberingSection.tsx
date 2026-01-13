import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, Lock, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import {
  getAllNumberingConfigs,
  setNumberingConfig,
  removeNumberingConfig,
  formatProposalNumber,
  getDocumentTypeUsageCounts,
  getHighestProposalNumber,
  type NumberingConfig,
  type OrganizationNumberingConfig,
} from '@/services/numberingConfigService';

interface DocumentNumberingSectionProps {
  organizationId: string;
  hasEditPermission: boolean;
}

export const DocumentNumberingSection: React.FC<DocumentNumberingSectionProps> = ({
  organizationId,
  hasEditPermission,
}) => {
  const [configs, setConfigs] = useState<OrganizationNumberingConfig | null>(null);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replacingType, setReplacingType] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Edit form state
  const [editDocType, setEditDocType] = useState('');
  const [editPrefix, setEditPrefix] = useState('');
  const [editSeparator1, setEditSeparator1] = useState('');
  const [editBaseNumber, setEditBaseNumber] = useState('');
  const [editSeparator2, setEditSeparator2] = useState('');
  const [editStartNumber, setEditStartNumber] = useState('1');
  const [editPadding, setEditPadding] = useState('0');

  // Collision detection state
  const [highestExisting, setHighestExisting] = useState<number | null>(null);

  // Check for collision when editing a document type with existing proposals
  useEffect(() => {
    const checkCollision = async () => {
      // Only check when replacing an existing type that's in use
      if (!replacingType || !configs?.[replacingType]) {
        setHighestExisting(null);
        return;
      }

      const inUse = (usageCounts[replacingType] || 0) > 0;

      if (!inUse) {
        setHighestExisting(null);
        return;
      }

      // Build a config object based on current edit values to parse existing numbers
      const currentConfig: NumberingConfig = {
        prefix: editPrefix,
        separator1: editSeparator1,
        baseNumber: editBaseNumber,
        separator2: editSeparator2,
        lastNumber: 0,
        padding: parseInt(editPadding, 10) || 0,
      };

      const highest = await getHighestProposalNumber(
        organizationId,
        replacingType,
        currentConfig
      );

      setHighestExisting(highest);
    };

    checkCollision();
  }, [replacingType, configs, usageCounts, organizationId, editPrefix, editSeparator1, editBaseNumber, editSeparator2, editPadding]);

  // Determine if there's a collision warning to show
  const collisionWarning = useMemo(() => {
    if (highestExisting === null || !replacingType) return null;

    const enteredNumber = parseInt(editStartNumber, 10);
    if (isNaN(enteredNumber)) return null;

    if (enteredNumber <= highestExisting) {
      return {
        highestExisting,
        willSkipTo: highestExisting + 1,
      };
    }

    return null;
  }, [highestExisting, editStartNumber, replacingType]);

  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;
      setLoading(true);
      try {
        const [configData, counts] = await Promise.all([
          getAllNumberingConfigs(organizationId),
          getDocumentTypeUsageCounts(organizationId),
        ]);
        setConfigs(configData || {});
        setUsageCounts(counts);
      } catch (error) {
        console.error('Failed to load numbering configs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [organizationId]);

  const configuredTypes = Object.keys(configs || {});

  // Check if a document type is in use (has proposals)
  const isInUse = (docType: string): boolean => {
    return (usageCounts[docType] || 0) > 0;
  };

  const startReplace = (docType: string) => {
    const config = configs?.[docType];
    if (config) {
      setEditDocType(docType);
      setEditPrefix(config.prefix || '');
      setEditSeparator1(config.separator1 || '');
      setEditBaseNumber(config.baseNumber || '');
      setEditSeparator2(config.separator2 || '');
      setEditStartNumber(String(config.lastNumber + 1));
      setEditPadding(String(config.padding || 0));
      setReplacingType(docType);
      setAddingNew(false);
    }
  };

  const startAdd = () => {
    setEditDocType('');
    setEditPrefix('');
    setEditSeparator1('');
    setEditBaseNumber('');
    setEditSeparator2('');
    setEditStartNumber('1');
    setEditPadding('0');
    setAddingNew(true);
    setReplacingType(null);
  };

  const cancelEdit = () => {
    setReplacingType(null);
    setAddingNew(false);
    setEditDocType('');
  };

  const handleSave = async (originalDocType: string) => {
    const newDocType = editDocType.trim();

    if (!newDocType) {
      toast({ title: "Error", description: "Document type name is required", variant: "destructive" });
      return;
    }

    const num = parseInt(editStartNumber, 10);
    if (isNaN(num) || num < 1) {
      toast({ title: "Error", description: "Invalid starting number", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const config: NumberingConfig = {
        prefix: editPrefix.trim(),
        separator1: editSeparator1,
        baseNumber: editBaseNumber.trim(),
        separator2: editSeparator2,
        lastNumber: num - 1, // Store as last used (start - 1)
        padding: parseInt(editPadding, 10) || 0,
      };

      // Check if document type name was changed (rename scenario)
      const isRename = originalDocType && originalDocType !== newDocType;

      if (isRename) {
        // Delete old config first, then create new one
        await removeNumberingConfig(organizationId, originalDocType);
      }

      const success = await setNumberingConfig(organizationId, newDocType, config);
      if (success) {
        setConfigs(prev => {
          const updated = { ...prev };
          if (isRename) {
            delete updated[originalDocType];
          }
          updated[newDocType] = config;
          return updated;
        });
        const action = addingNew ? 'created' : (isRename ? 'renamed' : 'updated');
        toast({ title: "Saved", description: `${newDocType} sequence ${action}.` });
        cancelEdit();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (docType: string) => {
    setSaving(true);
    try {
      const success = await removeNumberingConfig(organizationId, docType);
      if (success) {
        setConfigs(prev => {
          if (!prev) return prev;
          const { [docType]: _, ...rest } = prev;
          return rest;
        });
        toast({ title: "Deleted", description: `${docType} sequence removed.` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formatPreview = (): string => {
    const num = parseInt(editStartNumber, 10) || 1;
    const config: NumberingConfig = {
      prefix: editPrefix,
      separator1: editSeparator1,
      baseNumber: editBaseNumber,
      separator2: editSeparator2,
      lastNumber: 0,
      padding: parseInt(editPadding, 10) || 0,
    };
    return formatProposalNumber(config, num);
  };

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  // Render the edit/replace form inputs
  const renderEditForm = (docType: string, isNew: boolean, typeInUse: boolean = false) => (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Document Type Name - always shown, disabled if in use */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Document Type</label>
          <Input
            value={editDocType}
            onChange={(e) => setEditDocType(e.target.value)}
            placeholder="e.g., Proposal"
            disabled={typeInUse}
            className={`w-48 h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 ${typeInUse ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        {/* Prefix */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Prefix</label>
          <Input
            value={editPrefix}
            onChange={(e) => setEditPrefix(e.target.value)}
            placeholder="P"
            className="w-24 h-9 font-mono bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
          />
        </div>

        {/* Separator 1 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Sep</label>
          <Select value={editSeparator1 || "none"} onValueChange={(v) => setEditSeparator1(v === "none" ? "" : v)}>
            <SelectTrigger className="w-24 h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="-">-</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Starting Sequence Number - This is the main incrementing number (e.g., 14 in ES-14) */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Series</label>
          <Input
            type="number"
            value={editStartNumber}
            onChange={(e) => setEditStartNumber(e.target.value)}
            placeholder="1"
            className="w-28 h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
            min={1}
          />
        </div>

        {/* Suffix - Optional trailing code (e.g., 014 in ES-1-014) */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Suffix</label>
          <Input
            value={editBaseNumber}
            onChange={(e) => setEditBaseNumber(e.target.value)}
            placeholder=""
            className="w-28 h-9 font-mono bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Separator 2 - Only needed if using sub-series */}
        <div className="flex flex-col gap-1">
          <label className={`text-xs ${editBaseNumber ? 'text-gray-400' : 'text-gray-300'}`}>Sep</label>
          <Select
            value={editSeparator2 || "none"}
            onValueChange={(v) => setEditSeparator2(v === "none" ? "" : v)}
            disabled={!editBaseNumber}
          >
            <SelectTrigger className={`w-24 h-9 ${editBaseNumber ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'}`}>
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="-">-</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Padding - Only applies to sub-series */}
        <div className="flex flex-col gap-1">
          <label className={`text-xs ${editBaseNumber ? 'text-gray-500' : 'text-gray-300'}`}>Pad</label>
          <Select
            value={editPadding}
            onValueChange={setEditPadding}
            disabled={!editBaseNumber}
          >
            <SelectTrigger className={`w-20 h-9 ${editBaseNumber ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="0">None</SelectItem>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Collision Warning */}
      {collisionWarning && !isNew && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-medium">Collision detected:</span> Existing proposals go up to{' '}
            <span className="font-mono font-semibold">{collisionWarning.highestExisting}</span>.
            The next number will be{' '}
            <span className="font-mono font-semibold">{collisionWarning.willSkipTo}</span>{' '}
            to prevent duplicates.
          </div>
        </div>
      )}

      {/* Preview and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Preview:</span>
          <span className="font-mono text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300">
            {formatPreview()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleSave(docType)}
            disabled={saving}
            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={cancelEdit}
            className="h-9 px-4"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Document Numbering</h2>
      <div className="h-px bg-gray-200 dark:bg-gray-700 mb-4"></div>

      <div className="space-y-1">
        {/* Configured document types */}
        {configuredTypes.map((docType) => {
          const config = configs![docType];
          const isReplacing = replacingType === docType;
          const nextNumber = config.lastNumber + 1;
          const displayNumber = formatProposalNumber(config, nextNumber);
          const inUse = isInUse(docType);
          const proposalCount = usageCounts[docType] || 0;

          return (
            <div key={docType} className="flex items-start justify-between py-6 px-6 rounded-lg">
              {isReplacing ? (
                <div className="w-full">
                  {renderEditForm(docType, false, inUse)}
                </div>
              ) : (
                <>
                  <div className="flex-1 pr-8">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {docType}
                      </h3>
                      {inUse && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Lock className="w-3.5 h-3.5 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Used by {proposalCount} proposal(s)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Starting Sequence Number
                    </p>
                  </div>
                  <div className="flex items-center gap-3 min-w-[280px] justify-end">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {displayNumber}
                    </span>
                    {hasEditPermission && (
                      inUse ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startReplace(docType)}
                          className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Replace
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startReplace(docType)}
                            className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(docType)}
                            disabled={saving}
                            className="h-9 px-4 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Add new sequence row */}
        {addingNew && (
          <div className="py-6 px-6 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              New Document Sequence
            </h3>
            {renderEditForm('', true)}
          </div>
        )}

        {/* Add new type button */}
        {!addingNew && hasEditPermission && (
          <div className="flex items-start justify-between py-6 px-6 rounded-lg">
            <div className="flex-1 pr-8">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
                Add Document Sequence
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {configuredTypes.length === 0
                  ? 'Add a document sequence to enable automatic numbering'
                  : 'Configure numbering for another document type'}
              </p>
            </div>
            <div className="flex items-center gap-3 min-w-[280px] justify-end">
              <span className="text-sm text-gray-400 dark:text-gray-500 flex-1 text-right pr-3">
                Not configured
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={startAdd}
                className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentNumberingSection;
