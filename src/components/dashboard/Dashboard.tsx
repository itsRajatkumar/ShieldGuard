"use client";
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldX, Loader2, Sparkles, ServerCrash, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Vulnerability, Ecosystem } from '@/lib/types';
import { HealthScoreGauge } from './HealthScoreGauge';
import { VulnerabilitiesList } from './VulnerabilitiesList';
import { VulnerabilityDetailsSheet } from './VulnerabilityDetailsSheet';
import { getHealthScoreExplanation } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MarkdownReport } from './MarkdownReport';
import { ecosystemInfo, type EcosystemInfo } from '@/lib/ecosystems';
import { Badge } from '../ui/badge';
import jsPDF from 'jspdf';

export function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const scanHasRun = useRef(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[] | null>(null);
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [healthScore, setHealthScore] = useState(0);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentEcosystem, setCurrentEcosystem] = useState<EcosystemInfo | null>(null);

  const [healthScoreExplanation, setHealthScoreExplanation] = useState<string | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const data = searchParams.get('data');
    const ecosystem = searchParams.get('ecosystem') as Ecosystem | null;

    if (!data || !ecosystem) {
      setStatus('idle');
      return;
    }
    
    if (ecosystemInfo[ecosystem]) {
        setCurrentEcosystem(ecosystemInfo[ecosystem]);
    }
    
    // This prevents the effect from running twice in development due to strict mode.
    if (scanHasRun.current) {
        return;
    }
    scanHasRun.current = true;

    const scan = async () => {
      setStatus('loading');
      try {
        const content = decodeURIComponent(escape(atob(data)));
        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, ecosystem }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to scan dependencies');
        }

        const results: Vulnerability[] = await response.json();
        setVulnerabilities(results);
        
        const totalVulnerabilities = results.reduce((acc, curr) => acc + curr.vulns.length, 0);
        const criticalCount = results.flatMap(r => r.vulns).filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH').length;

        const score = Math.max(0, 100 - totalVulnerabilities * 5 - criticalCount * 10);
        setHealthScore(score);

        setStatus('success');

        if (results.length > 0) {
          setIsExplanationLoading(true);
          const explanationRes = await getHealthScoreExplanation({
            healthScore: score,
            vulnerabilities: results.flatMap(v => v.vulns.map(vuln => `${v.pkg.name}@${v.pkg.version}: ${vuln.summary}`)),
          });
          if (explanationRes.explanation) {
            setHealthScoreExplanation(explanationRes.explanation);
          }
          setIsExplanationLoading(false);
        }

      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
        setStatus('error');
        toast({
          title: 'Scan Failed',
          description: e.message || 'Could not process the dependency file.',
          variant: 'destructive',
        });
      }
    };

    scan();
  }, [searchParams, toast, router]);

  const handleVulnerabilitySelect = (vuln: Vulnerability) => {
    setSelectedVulnerability(vuln);
    setIsSheetOpen(true);
  };
  
 const handleDownloadPdf = () => {
    if (!vulnerabilities || !currentEcosystem) return;
    setIsDownloading(true);
    try {
      const doc = new jsPDF();
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const textWidth = pageWidth - margin * 2;
      let yPos = margin;

      const addPageIfNeeded = () => {
        if (yPos > 270) {
          doc.addPage();
          yPos = margin;
        }
      }

      // Main Title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text("ShieldGuard Security Report", pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Health Score Section
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("Project Health Score", margin, yPos);
      yPos += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`${healthScore} out of 100`, margin, yPos);
      yPos += 15;
      addPageIfNeeded();
      
      // Scan Details Section
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("Scan Details", margin, yPos);
      yPos += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Language: ${currentEcosystem.language}`, margin, yPos);
      yPos += 7;
      doc.text(`Ecosystem: ${currentEcosystem.name}`, margin, yPos);
      yPos += 15;
      addPageIfNeeded();

      // AI Analysis Section
      if (healthScoreExplanation) {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("AI Analysis", margin, yPos);
        yPos += 10;
        
        const explanationLines = healthScoreExplanation.split('\n');

        explanationLines.forEach(line => {
            addPageIfNeeded();
            if (line.startsWith('### ')) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                const title = line.replace('### ', '');
                const splitTitle = doc.splitTextToSize(title, textWidth);
                doc.text(splitTitle, margin, yPos);
                yPos += (splitTitle.length * 6) + 4;
            } else if (line.trim() === '') {
                yPos += 4;
            }
            else {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                const splitLine = doc.splitTextToSize(line, textWidth);
                doc.text(splitLine, margin, yPos);
                yPos += (splitLine.length * 5) + 2;
            }
        });
        yPos += 10;
        addPageIfNeeded();
      }
      
      // Vulnerabilities Section
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("Vulnerable Packages", margin, yPos);
      yPos += 10;

      vulnerabilities.forEach(vuln => {
        addPageIfNeeded();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${vuln.pkg.name}@${vuln.pkg.version}`, margin, yPos);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Highest Severity: ${vuln.highestSeverity}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 8;

        vuln.vulns.forEach(item => {
            addPageIfNeeded();
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`- ${item.severity}:`, margin + 5, yPos);
            doc.setFont('helvetica', 'normal');
            const summaryText = doc.splitTextToSize(item.summary || item.id, textWidth - 20); // Indented text
            doc.text(summaryText, margin + 25, yPos, {maxWidth: textWidth - 30});
            yPos += summaryText.length * 5 + 2;
        });
        yPos += 8;
      });

      doc.save('shieldguard-report.pdf');
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast({
        title: 'Download Failed',
        description: 'Could not generate the PDF report.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] gap-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-muted-foreground text-lg">Scanning for vulnerabilities...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container mx-auto py-10 text-center">
        <div className="flex flex-col items-center gap-4 bg-card border border-destructive/50 rounded-lg p-8 max-w-md mx-auto">
          <ServerCrash className="h-16 w-16 text-destructive" />
          <h2 className="text-2xl font-bold">Scan Failed</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/')}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (status === 'idle' || vulnerabilities === null) {
      return (
          <div className="container mx-auto py-20 text-center">
              <div className="flex flex-col items-center gap-4 bg-card rounded-lg p-8 max-w-md mx-auto">
                  <ShieldX className="h-16 w-16 text-muted-foreground" />
                  <h2 className="text-2xl font-bold">No file scanned</h2>
                  <p className="text-muted-foreground">Upload a dependency file to see the health report.</p>
                  <Button onClick={() => router.push('/')}>Upload File</Button>
              </div>
          </div>
      );
  }

  if (vulnerabilities.length === 0) {
    return (
      <div className="container mx-auto py-20 text-center">
        <Card className="max-w-md mx-auto border-accent/50">
          <CardHeader>
            <div className="mx-auto bg-accent/10 rounded-full p-4 w-20 h-20 flex items-center justify-center border-4 border-accent">
                <svg width="40" height="40" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.49991 0.877045C3.84222 0.877045 0.877045 3.84222 0.877045 7.49991C0.877045 11.1576 3.84222 14.1228 7.49991 14.1228C11.1576 14.1228 14.1228 11.1576 14.1228 7.49991C14.1228 3.84222 11.1576 0.877045 7.49991 0.877045ZM1.82704 7.49991C1.82704 4.36688 4.36688 1.82704 7.49991 1.82704C10.6329 1.82704 13.1728 4.36688 13.1728 7.49991C13.1728 10.6329 10.6329 13.1728 7.49991 13.1728C4.36688 13.1728 1.82704 10.6329 1.82704 7.49991ZM10.1553 5.27159C10.3349 5.09198 10.6159 5.09198 10.7955 5.27159C10.9751 5.4512 10.9751 5.73217 10.7955 5.91178L7.22402 9.48327C7.04441 9.66288 6.76344 9.66288 6.58383 9.48327L4.20442 7.10386C4.02481 6.92425 4.02481 6.64328 4.20442 6.46367C4.38403 6.28406 4.665 6.28406 4.84461 6.46367L6.90392 8.52298L10.1553 5.27159Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" className="text-accent"></path></svg>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <h2 className="text-2xl font-bold mt-4">All Clear!</h2>
            <CardDescription className="mt-2">No vulnerabilities found in your dependencies. Great job!</CardDescription>
            <Button onClick={() => router.push('/')} className="mt-6">Scan Another File</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline">Security Report</h1>
        <Button onClick={handleDownloadPdf} disabled={isDownloading}>
          {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
          {isDownloading ? 'Downloading...' : 'Download Report'}
        </Button>
      </div>
      <div ref={reportRef} className="p-8 rounded-lg bg-card border">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 space-y-8">
                <HealthScoreGauge score={healthScore} />
                {currentEcosystem && (
                <Card>
                    <CardHeader>
                    <CardTitle>Scan Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Language</span>
                        <div className="flex items-center gap-2 font-medium">
                        <currentEcosystem.languageIcon className="w-5 h-5"/>
                        <span>{currentEcosystem.language}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Ecosystem</span>
                        <div className="flex items-center gap-2 font-medium">
                        <currentEcosystem.ecosystemIcon className="w-5 h-5"/>
                        <Badge variant="secondary">{currentEcosystem.name}</Badge>
                        </div>
                    </div>
                    </CardContent>
                </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="text-primary w-5 h-5"/>
                            AI Analysis
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isExplanationLoading ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin"/>
                                <span>AI is reasoning...</span>
                            </div>
                        ) : (
                            <MarkdownReport content={healthScoreExplanation || "AI analysis of your project's health."} />
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
            <VulnerabilitiesList vulnerabilities={vulnerabilities} onSelect={handleVulnerabilitySelect} />
            </div>
        </div>
      </div>
      {selectedVulnerability && (
        <VulnerabilityDetailsSheet
          vulnerability={selectedVulnerability}
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
        />
      )}
    </div>
  );
}
