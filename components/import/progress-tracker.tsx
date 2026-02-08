'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload } from 'lucide-react';

interface ProgressTrackerProps {
  isImporting: boolean;
  message: string;
  progress?: number;
}

export function ProgressTracker({ isImporting, message, progress }: ProgressTrackerProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (isImporting) {
      // Simulate progress if no real progress is provided
      if (progress === undefined) {
        const interval = setInterval(() => {
          setDisplayProgress(prev => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 10;
          });
        }, 500);

        return () => clearInterval(interval);
      } else {
        setDisplayProgress(progress);
      }
    } else {
      setDisplayProgress(0);
    }
  }, [isImporting, progress]);

  if (!isImporting) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Loading Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <Upload className="h-12 w-12 text-blue-500" />
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin absolute -top-1 -right-1" />
              </div>
            </div>

            {/* Message */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {message}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Please wait while we process your data
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={displayProgress} className="w-full" />
              <p className="text-xs text-gray-500">
                {Math.round(displayProgress)}% complete
              </p>
            </div>

            {/* Status Messages */}
            <div className="text-xs text-gray-500 space-y-1">
              {displayProgress < 30 && (
                <p>Validating data...</p>
              )}
              {displayProgress >= 30 && displayProgress < 60 && (
                <p>Processing categories...</p>
              )}
              {displayProgress >= 60 && displayProgress < 90 && (
                <p>Creating database entries...</p>
              )}
              {displayProgress >= 90 && (
                <p>Finalizing import...</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
