import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Vulnerability } from '@/lib/types';
import { AlertTriangle, ChevronRight } from 'lucide-react';

type VulnerabilitiesListProps = {
  vulnerabilities: Vulnerability[];
  onSelect: (vulnerability: Vulnerability) => void;
};

const severityMap: Record<Vulnerability['severity'], { color: 'destructive' | 'secondary' | 'outline', text: string }> = {
    CRITICAL: { color: 'destructive', text: 'Critical' },
    HIGH: { color: 'destructive', text: 'High' },
    MODERATE: { color: 'secondary', text: 'Moderate' },
    LOW: { color: 'outline', text: 'Low' },
    UNKNOWN: { color: 'outline', text: 'Unknown' },
};

export function VulnerabilitiesList({ vulnerabilities, onSelect }: VulnerabilitiesListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive"/>
            Vulnerable Packages
        </CardTitle>
        <CardDescription>
            Found {vulnerabilities.length} vulnerabilities. Click on a package for an AI-powered explanation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {vulnerabilities.map((vuln) => (
            <button
              key={vuln.id}
              onClick={() => onSelect(vuln)}
              className="w-full text-left p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors flex items-center justify-between group"
              aria-label={`View details for ${vuln.pkg.name}`}
            >
              <div>
                <div className="flex items-center gap-3">
                    <p className="font-semibold text-lg font-headline">{vuln.pkg.name}</p>
                    <Badge variant={severityMap[vuln.severity]?.color || 'outline'}>{severityMap[vuln.severity]?.text || 'Unknown'}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">{vuln.summary}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
