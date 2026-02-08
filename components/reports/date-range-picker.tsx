'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  DATE_RANGE_PRESETS,
  validateDateRange,
  formatDateRange,
  formatDateShort,
  createCustomDateRange,
  type DateRangePresetType
} from '@/lib/date-range-utils';
import type { CustomDateRange } from '@/lib/types';
import { toast } from 'sonner';

export interface DateRangePickerProps {
  value?: CustomDateRange;
  onChange: (range: CustomDateRange) => void;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  className
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('presets');
  const [selectedPreset, setSelectedPreset] = useState<DateRangePresetType | null>(null);
  const [customStart, setCustomStart] = useState<Date | undefined>(value?.start);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(value?.end);

  const handlePresetSelect = (presetType: DateRangePresetType) => {
    const preset = DATE_RANGE_PRESETS.find(p => p.type === presetType);
    if (!preset) return;

    const { start, end } = preset.getRange();

    const validation = validateDateRange(start, end);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setSelectedPreset(presetType);

    const dateRange: CustomDateRange = {
      start,
      end,
      label: preset.label,
      preset: true
    };

    onChange(dateRange);
    setOpen(false);
  };

  const handleCustomApply = () => {
    if (!customStart || !customEnd) {
      toast.error('Please select both start and end dates');
      return;
    }

    const validation = validateDateRange(customStart, customEnd);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      const dateRange = createCustomDateRange(customStart, customEnd);
      setSelectedPreset(null); // Clear preset selection
      onChange(dateRange);
      setOpen(false);
      toast.success('Custom date range applied');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid date range');
    }
  };

  const handleClear = () => {
    setCustomStart(undefined);
    setCustomEnd(undefined);
    setSelectedPreset(null);
  };

  const displayText = value
    ? value.label || formatDateRange(value.start, value.end)
    : 'Select date range';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[600px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="custom">Custom Range</TabsTrigger>
          </TabsList>

          {/* Presets Tab */}
          <TabsContent value="presets" className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {DATE_RANGE_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.type;

                return (
                  <Button
                    key={preset.type}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'justify-between',
                      isSelected && 'bg-primary text-primary-foreground'
                    )}
                    onClick={() => handlePresetSelect(preset.type)}
                  >
                    <span>{preset.label}</span>
                    {isSelected && <Check className="h-4 w-4 ml-2" />}
                  </Button>
                );
              })}
            </div>

            {value && value.preset && (
              <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                <p className="font-medium">{value.label}</p>
                <p className="text-muted-foreground mt-1">
                  {formatDateShort(value.start)} - {formatDateShort(value.end)}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Custom Range Tab */}
          <TabsContent value="custom" className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Start Date Calendar */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Start Date
                  </label>
                  <Calendar
                    mode="single"
                    selected={customStart}
                    onSelect={setCustomStart}
                    disabled={(date) => date > new Date()}
                    className="rounded-md border"
                  />
                  {customStart && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {formatDateShort(customStart)}
                    </p>
                  )}
                </div>

                {/* End Date Calendar */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    End Date
                  </label>
                  <Calendar
                    mode="single"
                    selected={customEnd}
                    onSelect={setCustomEnd}
                    disabled={(date) => {
                      const today = new Date();
                      if (date > today) return true;
                      if (customStart && date < customStart) return true;
                      return false;
                    }}
                    className="rounded-md border"
                  />
                  {customEnd && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {formatDateShort(customEnd)}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={!customStart && !customEnd}
                >
                  Clear
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCustomApply}
                    disabled={!customStart || !customEnd}
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {customStart && customEnd && (
                <div className="p-3 bg-blue-50 rounded-md text-sm border border-blue-200">
                  <p className="font-medium text-blue-900">
                    Range Preview
                  </p>
                  <p className="text-blue-700 mt-1">
                    {formatDateRange(customStart, customEnd)}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
