"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileJson, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function FileUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.type !== 'application/json' && file.name !== 'package.json') {
      toast({
        title: 'Invalid File',
        description: 'Please upload a valid package.json file.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        if (!parsed.dependencies && !parsed.devDependencies) {
          throw new Error('No dependencies found.');
        }
        const encodedContent = btoa(unescape(encodeURIComponent(content)));
        router.push(`/dashboard?data=${encodedContent}`);
      } catch (error) {
        toast({
          title: 'Invalid JSON',
          description: 'The file is not a valid JSON or has no dependencies.',
          variant: 'destructive',
        });
        setIsUploading(false);
        setFileName(null);
      }
    };
    reader.onerror = () => {
      toast({
        title: 'File Read Error',
        description: 'Could not read the file.',
        variant: 'destructive',
      });
      setIsUploading(false);
      setFileName(null);
    };
    reader.readAsText(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={cn(
        'relative group w-full max-w-lg mx-auto border-2 border-dashed border-border rounded-xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer',
        isDragging
          ? 'border-primary scale-105 shadow-2xl shadow-primary/20'
          : 'hover:border-primary/50'
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-primary/10 rounded-xl transition-opacity duration-300',
          isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
        )}
      />
      <div className="relative z-10">
        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-lg font-medium">Scanning {fileName}...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-background border flex items-center justify-center">
              <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-lg font-medium text-foreground">
              Drag & drop your{' '}
              <code className="font-code bg-muted text-muted-foreground p-1 rounded-md">
                package.json
              </code>
            </p>
            <p className="text-muted-foreground">or</p>
            <Button variant="link" asChild>
                <span className="font-semibold text-primary hover:text-primary/80">
                click to upload
                </span>
            </Button>
            <input
              ref={fileInputRef}
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              onChange={handleFileChange}
              accept=".json,application/json"
            />
          </div>
        )}
      </div>
    </div>
  );
}
