/**
 * Dependency Matrix
 * Visual representation of field dependencies in a matrix/graph view
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Warning,
  Info,
  Eye,
  EyeSlash,
  LockKey,
  LockKeyOpen,
  Calculator,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { EnhancedFormField } from '../types/enhanced';

interface DependencyMatrixProps {
  fields: EnhancedFormField[];
  onSelectField?: (fieldId: string) => void;
  className?: string;
}

interface DependencyConnection {
  fromFieldId: string;
  toFieldId: string;
  condition: string;
  value: any;
  action: string;
  isCircular: boolean;
}

export function DependencyMatrix({
  fields,
  onSelectField,
  className,
}: DependencyMatrixProps) {
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  // Extract all dependency connections
  const connections = useMemo<DependencyConnection[]>(() => {
    const conns: DependencyConnection[] = [];
    const visited = new Set<string>();

    // Check for circular dependencies
    const isCircular = (fromId: string, toId: string): boolean => {
      visited.clear();
      const check = (currentId: string): boolean => {
        if (visited.has(currentId)) return true;
        if (currentId === fromId) return true;

        visited.add(currentId);
        const currentField = fields.find(f => f.id === currentId);
        if (!currentField?.dependencies) return false;

        for (const dep of currentField.dependencies) {
          if (check(dep.fieldId)) return true;
        }

        return false;
      };

      return check(toId);
    };

    fields.forEach(field => {
      field.dependencies?.forEach(dep => {
        conns.push({
          fromFieldId: dep.fieldId,
          toFieldId: field.id,
          condition: dep.condition,
          value: dep.value,
          action: dep.action,
          isCircular: isCircular(dep.fieldId, field.id),
        });
      });
    });

    return conns;
  }, [fields]);

  // Get stats
  const stats = useMemo(() => {
    const fieldsWithDeps = new Set(connections.map(c => c.toFieldId));
    const circularCount = connections.filter(c => c.isCircular).length;

    return {
      totalFields: fields.length,
      fieldsWithDependencies: fieldsWithDeps.size,
      totalConnections: connections.length,
      circularDependencies: circularCount,
    };
  }, [fields, connections]);

  // Get connections for a specific field
  const getFieldConnections = (fieldId: string) => {
    return {
      incoming: connections.filter(c => c.toFieldId === fieldId),
      outgoing: connections.filter(c => c.fromFieldId === fieldId),
    };
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'show':
        return Eye;
      case 'hide':
        return EyeSlash;
      case 'enable':
        return LockKeyOpen;
      case 'disable':
        return LockKey;
      case 'calculate':
        return Calculator;
      default:
        return Info;
    }
  };

  // Get action color
  const getActionColor = (action: string) => {
    switch (action) {
      case 'show':
      case 'enable':
        return 'text-green-600 dark:text-green-500';
      case 'hide':
      case 'disable':
        return 'text-red-600 dark:text-red-500';
      case 'calculate':
        return 'text-purple-600 dark:text-purple-500';
      case 'require':
        return 'text-orange-600 dark:text-orange-500';
      default:
        return 'text-blue-600 dark:text-blue-500';
    }
  };

  const handleFieldClick = (fieldId: string) => {
    setSelectedField(fieldId === selectedField ? null : fieldId);
    onSelectField?.(fieldId);
  };

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-gray-900', className)}>
      {/* Header with Stats */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Dependency Matrix
        </h2>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded px-2 py-1.5">
            <div className="font-medium text-blue-900 dark:text-blue-100">Total Fields</div>
            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{stats.totalFields}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded px-2 py-1.5">
            <div className="font-medium text-purple-900 dark:text-purple-100">With Dependencies</div>
            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{stats.fieldsWithDependencies}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded px-2 py-1.5">
            <div className="font-medium text-green-900 dark:text-green-100">Connections</div>
            <div className="text-lg font-bold text-green-700 dark:text-green-300">{stats.totalConnections}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded px-2 py-1.5">
            <div className="font-medium text-red-900 dark:text-red-100">Circular</div>
            <div className="text-lg font-bold text-red-700 dark:text-red-300">{stats.circularDependencies}</div>
          </div>
        </div>
      </div>

      {/* Fields List with Connections */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {fields.map(field => {
            const { incoming, outgoing } = getFieldConnections(field.id);
            const hasCircular = [...incoming, ...outgoing].some(c => c.isCircular);
            const isHovered = hoveredField === field.id;
            const isSelected = selectedField === field.id;

            return (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'border rounded-lg p-3 transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-md'
                    : isHovered
                    ? 'border-gray-400 dark:border-gray-600 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700',
                  hasCircular && 'ring-2 ring-red-500/50'
                )}
                onMouseEnter={() => setHoveredField(field.id)}
                onMouseLeave={() => setHoveredField(null)}
              >
                {/* Field Header */}
                <div
                  className="flex items-center justify-between mb-2 cursor-pointer"
                  onClick={() => handleFieldClick(field.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {field.label}
                    </div>
                    <div className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
                      {field.id}
                    </div>
                    {field.field_type === 'input' && field.input_type && (
                      <div className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {field.input_type === 'number' && field.number_format
                          ? field.number_format
                          : field.input_type}
                      </div>
                    )}
                    {field.field_type === 'calculated' && (
                      <div className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                        calculated {field.number_format ? `(${field.number_format})` : ''}
                      </div>
                    )}
                  </div>

                  {hasCircular && (
                    <div className="text-red-600 dark:text-red-400" title="Circular dependency">
                      <Warning className="w-4 h-4" weight="fill" />
                    </div>
                  )}
                </div>

                {/* Incoming Dependencies */}
                {incoming.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Controlled By
                    </div>
                    <div className="space-y-1">
                      {incoming.map((conn, i) => {
                        const fromField = fields.find(f => f.id === conn.fromFieldId);
                        const ActionIcon = getActionIcon(conn.action);
                        const actionColor = getActionColor(conn.action);

                        return (
                          <div
                            key={i}
                            className={cn(
                              'flex items-center gap-2 text-xs p-1.5 rounded',
                              conn.isCircular
                                ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
                                : 'bg-gray-50 dark:bg-gray-800/50'
                            )}
                          >
                            <div className="flex-1 font-mono text-gray-700 dark:text-gray-300">
                              {fromField?.label || conn.fromFieldId}
                            </div>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <div className="text-[10px] text-gray-500">
                              {conn.condition.replace(/_/g, ' ')}
                            </div>
                            {!['is_empty', 'is_not_empty', 'is_checked', 'is_unchecked'].includes(conn.condition) && (
                              <div className="text-[10px] px-1 py-0.5 bg-white dark:bg-gray-900 rounded font-medium text-gray-700 dark:text-gray-300">
                                "{conn.value}"
                              </div>
                            )}
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <div className={cn('flex items-center gap-1', actionColor)}>
                              <ActionIcon className="w-3 h-3" weight="fill" />
                              <span className="text-[10px] font-medium">{conn.action}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Outgoing Dependencies */}
                {outgoing.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Controls
                    </div>
                    <div className="space-y-1">
                      {outgoing.map((conn, i) => {
                        const toField = fields.find(f => f.id === conn.toFieldId);
                        const ActionIcon = getActionIcon(conn.action);
                        const actionColor = getActionColor(conn.action);

                        return (
                          <div
                            key={i}
                            className={cn(
                              'flex items-center gap-2 text-xs p-1.5 rounded',
                              conn.isCircular
                                ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
                                : 'bg-gray-50 dark:bg-gray-800/50'
                            )}
                          >
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <div className="text-[10px] text-gray-500">
                              {conn.condition.replace(/_/g, ' ')}
                            </div>
                            {!['is_empty', 'is_not_empty', 'is_checked', 'is_unchecked'].includes(conn.condition) && (
                              <div className="text-[10px] px-1 py-0.5 bg-white dark:bg-gray-900 rounded font-medium text-gray-700 dark:text-gray-300">
                                "{conn.value}"
                              </div>
                            )}
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <div className={cn('flex items-center gap-1', actionColor)}>
                              <ActionIcon className="w-3 h-3" weight="fill" />
                              <span className="text-[10px] font-medium">{conn.action}</span>
                            </div>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <div className="flex-1 font-mono text-gray-700 dark:text-gray-300">
                              {toField?.label || conn.toFieldId}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No Dependencies */}
                {incoming.length === 0 && outgoing.length === 0 && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-1">
                    No dependencies
                  </div>
                )}
              </motion.div>
            );
          })}

          {fields.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No fields in the form yet
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700"></div>
            <span>No dependencies</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900 border border-blue-300"></div>
            <span>Has dependencies</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <Warning className="w-3 h-3" weight="fill" />
            <span>Circular dependency</span>
          </div>
        </div>
      </div>
    </div>
  );
}
