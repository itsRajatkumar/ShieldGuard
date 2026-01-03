"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileJson, Loader2, ClipboardPaste } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';

type Ecosystem = "npm" | "PyPI" | "Go" | "Maven" | "Cargo";
const ecosystems = ["npm", "PyPI", "Go", "Maven", "Cargo"];
const fileToEcosystem: Record<string, Ecosystem> = {
    "package.json": "npm",
    "requirements.txt": "PyPI",
    "pyproject.toml": "PyPI",
    "go.mod": "Go",
    "pom.xml": "Maven",
    "Cargo.lock": "Cargo"
};

export function FileUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pastedContent, setPastedContent] = useState("");
  const [selectedEcosystem, setSelectedEcosystem] = useState<Ecosystem>("npm");

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);


  const startScan = (content: string, ecosystem: Ecosystem) => {
    setIsLoading(true);
     try {
        const encodedContent = btoa(unescape(encodeURIComponent(content)));
        router.push(`/dashboard?data=${encodedContent}&ecosystem=${ecosystem}`);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not process the content.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
  }


  const handleFile = (file: File) => {
    const ecosystem = fileToEcosystem[file.name];
    if (!ecosystem) {
      toast({
        title: 'Unsupported File',
        description: 'Please upload a supported file like package.json, requirements.txt, etc.',
        variant: 'destructive',
      });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      startScan(content, ecosystem);
    };
    reader.onerror = () => {
      toast({
        title: 'File Read Error',
        description: 'Could not read the file.',
        variant: 'destructive',
      });
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
      if (!pastedContent.trim()) {
          toast({ title: "Content is empty", description: "Please paste your dependency file's content.", variant: "destructive"});
          return;
      }
      setFileName(`pasted ${selectedEcosystem} content`);
      startScan(pastedContent, selectedEcosystem);
  }

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

  if (isLoading) {
    return (
        <div className="w-full max-w-lg mx-auto">
            <Card className="p-8 sm:p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    <p className="text-lg font-medium">Scanning {fileName}...</p>
                    <p className="text-muted-foreground">This may take a moment.</p>
                </div>
            </Card>
        </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload"><UploadCloud className="mr-2"/> Upload File</TabsTrigger>
          <TabsTrigger value="paste"><ClipboardPaste className="mr-2"/> Paste Content</TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
           <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className={cn(
                'relative group w-full mt-4 border-2 border-dashed border-border rounded-xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer',
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
                <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-background border flex items-center justify-center">
                        <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-lg font-medium text-foreground">
                        Drag & drop a dependency file
                    </p>
                    <p className="text-sm text-muted-foreground">
                        (e.g. package.json, requirements.txt, go.mod)
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
                        accept=".json,.txt,.mod,.xml,.lock"
                    />
                </div>
            </div>
        </TabsContent>
        <TabsContent value="paste">
             <Card className="mt-4 p-6 text-left">
                <div className="space-y-4">
                     <div className="grid gap-2">
                        <Label htmlFor="ecosystem-select">Ecosystem</Label>
                        <Select value={selectedEcosystem} onValueChange={(v) => setSelectedEcosystem(v as Ecosystem)}>
                            <SelectTrigger id="ecosystem-select">
                                <SelectValue placeholder="Select an ecosystem" />
                            </SelectTrigger>
                            <SelectContent>
                                {ecosystems.map(eco => <SelectItem key={eco} value={eco}>{eco}</SelectItem>)}
                            </SelectContent>
                        </Select>
                     </div>
                     <div className="grid gap-2">
                        <Label htmlFor="paste-area">File Content</Label>
                        <Textarea
                        id="paste-area"
                        placeholder={`Paste the content of your ${selectedEcosystem === 'npm' ? 'package.json' : selectedEcosystem === 'PyPI' ? 'requirements.txt' : selectedEcosystem === 'Go' ? 'go.mod' : 'file'} here`}
                        value={pastedContent}
                        onChange={(e) => setPastedContent(e.target.value)}
                        rows={10}
                        className="font-code"
                        />
                     </div>
                     <Button onClick={handlePasteSubmit} className="w-full">
                        <FileJson className="mr-2"/>
                        Scan Content
                     </Button>
                </div>
             </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
