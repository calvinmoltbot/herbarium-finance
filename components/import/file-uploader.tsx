'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import Papa, { ParseResult } from 'papaparse';

interface FileUploaderProps {
  onFileUpload: (file: File, data: any[]) => void;
  acceptedTypes: string;
  maxSize: number;
  description: string;
}

export function FileUploader({ onFileUpload, acceptedTypes, maxSize, description }: FileUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const text = await file.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: '', // Let PapaParse auto-detect, but with fallback
        delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP],
        complete: (results: ParseResult<any>) => {
          if (results.errors.length > 0) {
            // If auto-detection fails, try parsing as single column
            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length > 0) {
              const header = lines[0].trim();
              const data = lines.slice(1).map(line => ({
                [header]: line.trim()
              })).filter(row => Object.values(row)[0] !== '');
              
              if (data.length > 0) {
                onFileUpload(file, data);
                setIsProcessing(false);
                return;
              }
            }
            
            setError(`CSV parsing error: ${results.errors[0].message}`);
            setIsProcessing(false);
            return;
          }

          if (!results.data || results.data.length === 0) {
            setError('No data found in the CSV file');
            setIsProcessing(false);
            return;
          }

          onFileUpload(file, results.data);
          setIsProcessing(false);
        },
        error: (error: Error) => {
          // Fallback: try parsing as simple single-column format
          try {
            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length > 0) {
              const header = lines[0].trim();
              const data = lines.slice(1).map(line => ({
                [header]: line.trim()
              })).filter(row => Object.values(row)[0] !== '');
              
              if (data.length > 0) {
                onFileUpload(file, data);
                setIsProcessing(false);
                return;
              }
            }
          } catch (fallbackError) {
            // If fallback also fails, show original error
          }
          
          setError(`Failed to parse CSV: ${error.message}`);
          setIsProcessing(false);
        }
      });
    } catch (err) {
      setError('Failed to read file');
      setIsProcessing(false);
    }
  }, [onFileUpload]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxSize,
    multiple: false,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center space-y-4">
              <div className={`p-3 rounded-full ${
                isDragActive ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Upload className={`h-8 w-8 ${
                  isDragActive ? 'text-blue-600' : 'text-gray-600'
                }`} />
              </div>
              
              <div>
                <h3 className="text-lg font-medium">
                  {isProcessing ? 'Processing file...' : 'Upload CSV File'}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {isProcessing 
                    ? 'Please wait while we process your file'
                    : isDragActive
                      ? 'Drop the file here'
                      : 'Drag and drop your CSV file here, or click to browse'
                  }
                </p>
              </div>
              
              {!isProcessing && (
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Requirements */}
      <div className="text-sm text-muted-foreground space-y-2">
        <p>{description}</p>
        <div className="flex items-center space-x-4">
          <span>Accepted formats: {acceptedTypes}</span>
          <span>Max size: {formatFileSize(maxSize)}</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Upload Error</h4>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Rejection Errors */}
      {fileRejections.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">File Rejected</h4>
                <ul className="text-red-700 mt-1 space-y-1">
                  {fileRejections.map(({ file, errors }) => (
                    <li key={file.name}>
                      {file.name}: {errors.map(e => e.message).join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
