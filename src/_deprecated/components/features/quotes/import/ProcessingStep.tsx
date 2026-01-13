/**
 * Processing Step Component
 * Shows progress while extracting and parsing quote data
 */

import { Loader2, FileSearch, Brain, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProcessingStepProps {
  isExtracting: boolean;
  isParsing: boolean;
  fileName?: string;
}

type ProcessingStage = 'extracting' | 'parsing' | 'complete';

export function ProcessingStep({
  isExtracting,
  isParsing,
  fileName,
}: ProcessingStepProps) {
  const getCurrentStage = (): ProcessingStage => {
    if (isExtracting) return 'extracting';
    if (isParsing) return 'parsing';
    return 'complete';
  };

  const stage = getCurrentStage();

  const getProgress = (): number => {
    switch (stage) {
      case 'extracting':
        return 33;
      case 'parsing':
        return 66;
      case 'complete':
        return 100;
    }
  };

  const stages = [
    {
      key: 'extracting',
      label: 'Extracting Text',
      description: 'Reading document content...',
      icon: FileSearch,
    },
    {
      key: 'parsing',
      label: 'AI Analysis',
      description: 'Identifying quote fields...',
      icon: Brain,
      // disabled: true,
    },
    {
      key: 'complete',
      label: 'Complete',
      description: 'Ready for review',
      icon: CheckCircle2,
    },
  ];

  const getStageStatus = (stageKey: string): 'done' | 'current' | 'pending' => {
    const stageOrder = ['extracting', 'parsing', 'complete'];
    const currentIndex = stageOrder.indexOf(stage);
    const stageIndex = stageOrder.indexOf(stageKey);

    if (stageIndex < currentIndex) return 'done';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="py-8 space-y-8">
      {/* File name */}
      {fileName && (
        <p className="text-center text-sm text-gray-500">
          Processing: <span className="font-medium text-gray-700">{fileName}</span>
        </p>
      )}

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={getProgress()} className="h-2" />
        <p className="text-xs text-center text-gray-400">{getProgress()}% complete</p>
      </div>

      {/* Stages */}
      <div className="space-y-4">
        {stages.map((stageItem) => {
          const status = getStageStatus(stageItem.key);
          const Icon = stageItem.icon;

          return (
            <div
              key={stageItem.key}
              className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                status === 'current'
                  ? 'bg-orange-50 border border-orange-200'
                  : status === 'done'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-gray-50 border border-gray-200 opacity-50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  status === 'current'
                    ? 'bg-orange-100 text-orange-600'
                    : status === 'done'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {status === 'current' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : status === 'done' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1">
                <p
                  className={`font-medium ${
                    status === 'current'
                      ? 'text-orange-700'
                      : status === 'done'
                      ? 'text-green-700'
                      : 'text-gray-500'
                  }`}
                >
                  {stageItem.label}
                </p>
                <p
                  className={`text-sm ${
                    status === 'current'
                      ? 'text-orange-600'
                      : status === 'done'
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}
                >
                  {stageItem.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400">
        This may take a few seconds depending on document size
      </p>
    </div>
  );
}
