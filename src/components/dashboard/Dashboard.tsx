"use client";
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldX, Loader2, Sparkles, ServerCrash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Vulnerability } from '@/lib/types';
import { HealthScoreGauge } from './HealthScoreGauge';
import { VulnerabilitiesList } from './VulnerabilitiesList';
import { VulnerabilityDetailsSheet } from './VulnerabilityDetailsSheet';
import { getHealthScoreExplanation } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MarkdownReport } from './MarkdownReport';

export function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[] | null>(null);
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [healthScore, setHealthScore] = useState(0);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [healthScoreExplanation, setHealthScoreExplanation] = useState<string | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);

  useEffect(() => {
    const data = searchParams.get('data');
    if (!data) {
      setStatus('idle');
      return;
    }

    const scan = async () => {
      setStatus('loading');
      try {
        const packageJsonContent = decodeURIComponent(escape(atob(data)));
        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageJsonContent }),
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
          description: e.message || 'Could not process the package.json file.',
          variant: 'destructive',
        });
      }
    };

    scan();
  }, [searchParams, toast]);

  const handleVulnerabilitySelect = (vuln: Vulnerability) => {
    setSelectedVulnerability(vuln);
    setIsSheetOpen(true);
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
                  <p className="text-muted-foreground">Upload a <code className="font-code bg-muted p-1 rounded-md">package.json</code> file to see the health report.</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 space-y-8">
            <HealthScoreGauge score={healthScore} />
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
