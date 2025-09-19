import React from 'react';
import { FileText, DollarSign, TrendingUp } from 'lucide-react';

export const DataFlowAnimation: React.FC = () => {
  return (
    <div className="relative w-full h-32 overflow-hidden bg-gradient-to-r from-blue-50 to-orange-50 rounded-2xl p-6">
      {/* Data flowing particles */}
      <div className="absolute inset-0">
        {/* Quote generation flow */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
          <div className="flex items-center space-x-4 animate-pulse">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
            </div>
          </div>
        </div>

        {/* Processing center */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-orange-500 rounded-xl flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
            <div className="w-6 h-6 bg-white rounded-lg"></div>
          </div>
        </div>

        {/* Revenue tracking flow */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
          <div className="flex items-center space-x-4 animate-pulse">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '800ms' }}></div>
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '1000ms' }}></div>
            </div>
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Analytics rising */}
        <div className="absolute right-8 bottom-2">
          <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center animate-bounce">
            <TrendingUp className="w-3 h-3 text-green-600" />
          </div>
        </div>
      </div>

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-8 h-full">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="border border-gray-300"
              style={{
                animationDelay: `${i * 100}ms`,
                animation: 'fadeInOut 2s infinite'
              }}
            ></div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};