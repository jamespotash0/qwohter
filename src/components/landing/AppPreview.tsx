import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Check, Calendar, User } from 'lucide-react';

export const AppPreview: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: 'Create Proposal',
      icon: FileText,
      color: 'blue',
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <User className="w-4 h-4 text-gray-400" />
            <div className="text-sm text-gray-600">Client: John Smith Construction</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500">Materials</div>
              <div className="text-lg font-semibold">$1,250</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500">Labor</div>
              <div className="text-lg font-semibold">$2,100</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Design & Brand',
      icon: Check,
      color: 'orange',
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-orange-50 to-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <span className="font-semibold">Qwohter</span>
            </div>
            <div className="text-sm text-gray-600">Professional Proposal #1024</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">$3,892</div>
            <div className="text-sm text-gray-500">Total Project Cost</div>
          </div>
        </div>
      )
    },
    {
      title: 'Track Success',
      icon: TrendingUp,
      color: 'green',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">85%</div>
              <div className="text-xs text-gray-500">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">12</div>
              <div className="text-xs text-gray-500">Active Proposals</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Avg. Response: 2.3 days</span>
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="max-w-md mx-auto">
      {/* App Window Frame */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* App Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <div className="text-sm text-gray-600 font-medium">Qwohter Dashboard</div>
          </div>
        </div>

        {/* App Content */}
        <div className="p-6">
          {/* Step Indicators */}
          <div className="flex justify-between mb-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === activeStep;
              const isCompleted = index < activeStep;

              return (
                <div key={index} className="flex flex-col items-center space-y-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isActive
                      ? step.color === 'blue' ? 'bg-blue-600 text-white' :
                        step.color === 'orange' ? 'bg-orange-500 text-white' :
                        'bg-green-600 text-white'
                      : isCompleted
                      ? 'bg-gray-200 text-gray-500'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className={`text-xs font-medium transition-colors duration-500 ${
                    isActive ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="min-h-[160px] transition-all duration-500">
            {steps[activeStep]!.content}
          </div>

          {/* Action Button */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors ${
              steps[activeStep]!.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
              steps[activeStep]!.color === 'orange' ? 'bg-orange-500 hover:bg-orange-600' :
              'bg-green-600 hover:bg-green-700'
            }`}>
              {activeStep === 0 ? 'Generate Proposal' :
               activeStep === 1 ? 'Send Proposal' : 'View Analytics'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};