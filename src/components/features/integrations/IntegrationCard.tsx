/**
 * Integration Card Component
 *
 * Displays an integration option with connection status
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface IntegrationCardProps {
  name: string;
  description: string;
  logoUrl: string;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting?: boolean;
  comingSoon?: boolean;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  name,
  description,
  logoUrl,
  isConnected,
  onConnect,
  onDisconnect,
  isConnecting = false,
  comingSoon = false,
}) => {

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          {/* Integration Logo */}
          <div className="w-16 h-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="w-14 h-14 object-contain rounded"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="%23e5e7eb" rx="4"/><text x="28" y="28" font-size="16" text-anchor="middle" dy=".3em" fill="%236b7280" font-weight="bold">QB</text></svg>';
              }}
            />
          </div>

          {/* Title and Description */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
              {description}
            </p>
          </div>

          {/* Connection Status or Action */}
          <div className="pt-1">
            {comingSoon ? (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                Coming Soon
              </Badge>
            ) : (
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-medium ${
                  isConnected
                    ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                    : 'bg-gray-50 border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
                }`}>
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      Connecting...
                    </>
                  ) : isConnected ? (
                    'Connected'
                  ) : (
                    'Connect'
                  )}
                </span>
                <button
                  onClick={isConnected ? onDisconnect : onConnect}
                  disabled={isConnecting}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isConnected
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  role="switch"
                  aria-checked={isConnected}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isConnected ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
