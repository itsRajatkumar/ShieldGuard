import { NextResponse, type NextRequest } from 'next/server';
import type { Vulnerability } from '@/lib/types';

interface OsvQuery {
  version: string;
  package: {
    name: string;
    ecosystem: 'npm';
  };
}

interface OsvBatchVuln {
  id: string;
}

interface OsvBatchResponse {
  results: {
    vulns?: OsvBatchVuln[];
  }[];
}

interface OsvVuln {
    id: string;
    summary: string;
    details: string;
    modified: string;
    published: string;
    affected: {
        package: {
          name: string;
          ecosystem: string;
          purl: string;
        };
        ranges: {
          type: string;
          events: {
            introduced: string;
            fixed?: string;
          }[];
        }[];
        versions: string[];
    }[];
    database_specific?: {
        severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
    }
}

export const maxDuration = 60;

async function fetchVulnerabilityDetails(vulnId: string): Promise<OsvVuln | null> {
    try {
        const res = await fetch(`https://api.osv.dev/v1/vulns/${vulnId}`);
        if (!res.ok) {
            console.error(`Failed to fetch details for ${vulnId}: ${res.status}`);
            return null;
        }
        return res.json();
    } catch (error) {
        console.error(`Error fetching details for ${vulnId}:`, error);
        return null;
    }
}


export async function POST(req: NextRequest) {
  try {
    const { packageJsonContent } = await req.json();

    if (!packageJsonContent) {
      return NextResponse.json({ error: 'package.json content is missing' }, { status: 400 });
    }

    const packageJson = JSON.parse(packageJsonContent);
    const dependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };

    if (Object.keys(dependencies).length === 0) {
      return NextResponse.json([]);
    }

    const queries: OsvQuery[] = Object.entries(dependencies).map(([name, version]) => ({
      version: (version as string).replace(/[~^>=<]/g, ''),
      package: { name, ecosystem: 'npm' },
    }));

    const batchRes = await fetch('https://api.osv.dev/v1/querybatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries }),
    });

    if (!batchRes.ok) {
      const errorText = await batchRes.text();
      console.error('OSV Batch API Error:', errorText);
      return NextResponse.json({ error: `OSV Batch API failed with status ${batchRes.status}: ${errorText}` }, { status: batchRes.status });
    }

    const batchData: OsvBatchResponse = await batchRes.json();
    
    const vulnIds = new Set<string>();
    batchData.results.forEach(result => {
        result.vulns?.forEach(vuln => {
            vulnIds.add(vuln.id);
        });
    });

    const detailedVulnsPromises = Array.from(vulnIds).map(id => fetchVulnerabilityDetails(id));
    const detailedVulnsResults = await Promise.all(detailedVulnsPromises);
    const detailedVulns = detailedVulnsResults.filter((v): v is OsvVuln => v !== null);

    const vulnerabilitiesMap = new Map<string, Vulnerability>();

    detailedVulns.forEach(vuln => {
        vuln.affected.forEach(affected => {
            if (affected.package.ecosystem !== 'npm') return;

            const pkgName = affected.package.name;
            const query = queries.find(q => q.package.name === pkgName);
            if (!query) return;

            let existingEntry = vulnerabilitiesMap.get(pkgName);
            if (!existingEntry) {
                existingEntry = {
                    pkg: {
                        name: pkgName,
                        version: query.version,
                    },
                    vulns: [],
                    highestSeverity: 'UNKNOWN',
                };
                 vulnerabilitiesMap.set(pkgName, existingEntry);
            }
            
            // Check if this vulnerability ID is already added for this package
            if (existingEntry.vulns.some(v => v.id === vuln.id)) {
                return;
            }

            const fixedEvent = affected.ranges.find(r => r.type === 'SEMVER')?.events.find(e => 'fixed' in e);
            const severity = vuln.database_specific?.severity || 'UNKNOWN';

            existingEntry.vulns.push({
                id: vuln.id,
                summary: vuln.summary,
                details: vuln.details,
                severity: severity,
                affectedVersions: affected.versions || [],
                fixedVersion: fixedEvent?.fixed,
            });

            const severityOrder: ('CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN')[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN'];
            const currentSeverities = existingEntry.vulns.map(v => v.severity);
            currentSeverities.push(existingEntry.highestSeverity);

            existingEntry.highestSeverity = currentSeverities.sort((a, b) => severityOrder.indexOf(a) - severityOrder.indexOf(b))[0];
        })
    });
    
    const vulnerabilities: Vulnerability[] = Array.from(vulnerabilitiesMap.values());

    return NextResponse.json(vulnerabilities);
  } catch (error: any) {
    console.error('Scan API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
