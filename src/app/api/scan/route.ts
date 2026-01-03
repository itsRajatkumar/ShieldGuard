import { NextResponse, type NextRequest } from 'next/server';
import type { Vulnerability, Ecosystem } from '@/lib/types';
import { parse } from 'dotenv';

interface OsvQuery {
  version: string;
  package: {
    name: string;
    ecosystem: Ecosystem;
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

function parseDependencies(content: string, ecosystem: Ecosystem): { name: string, version: string }[] {
    try {
        switch (ecosystem) {
            case 'npm':
                const packageJson = JSON.parse(content);
                const dependencies = {
                    ...(packageJson.dependencies || {}),
                    ...(packageJson.devDependencies || {}),
                };
                return Object.entries(dependencies).map(([name, version]) => ({ name, version: (version as string).replace(/[~^>=<]/g, '') }));
            case 'PyPI':
                 return content
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'))
                    .map(line => {
                        const match = line.match(/([a-zA-Z0-9._-]+)(?:[~<>=!]=?([\d.]+))?/);
                        return match ? { name: match[1], version: match[2] || '0.0.0' } : null;
                    })
                    .filter((v): v is {name: string, version: string} => v !== null);
            case 'Go':
                const goDeps: { name: string, version: string }[] = [];
                const lines = content.split('\n');
                let inRequire = false;
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed === 'require (') {
                        inRequire = true;
                        continue;
                    }
                    if (inRequire && trimmed === ')') {
                        inRequire = false;
                        continue;
                    }
                    if (inRequire || (!inRequire && trimmed.startsWith('require '))) {
                        const parts = trimmed.replace('require ', '').split(/\s+/);
                        if (parts.length >= 2) {
                            goDeps.push({ name: parts[0], version: parts[1].replace('v', '') });
                        }
                    }
                }
                return goDeps;
            // Basic parsers for Maven and Cargo. These can be improved.
            case 'Maven': // pom.xml
                const deps: { name: string, version: string }[] = [];
                const depRegex = /<dependency>\s*<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>\s*<version>([^<]+)<\/version>/g;
                let match;
                while ((match = depRegex.exec(content)) !== null) {
                    deps.push({ name: `${match[1]}:${match[2]}`, version: match[3] });
                }
                return deps;
            case 'Cargo': // Cargo.lock
                const cargoDeps: { name: string, version: string }[] = [];
                const cargoRegex = /^name = "([^"]+)"\nversion = "([^"]+)"/gm;
                while ((match = cargoRegex.exec(content)) !== null) {
                    cargoDeps.push({ name: match[1], version: match[2] });
                }
                return cargoDeps;

            default:
                return [];
        }
    } catch (e) {
        console.error(`Error parsing ${ecosystem} file:`, e);
        return [];
    }
}


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
    const { content, ecosystem } = await req.json() as { content: string, ecosystem: Ecosystem };

    if (!content || !ecosystem) {
      return NextResponse.json({ error: 'File content or ecosystem is missing' }, { status: 400 });
    }

    const dependencies = parseDependencies(content, ecosystem);

    if (dependencies.length === 0) {
      return NextResponse.json([]);
    }

    const queries: OsvQuery[] = dependencies.map(({ name, version }) => ({
      version: version,
      package: { name, ecosystem },
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
            if (affected.package.ecosystem !== ecosystem) return;

            const pkgName = ecosystem === 'Maven' ? `${affected.package.purl.split('/')[1].replace('%40', '@')}/${affected.package.name}` : affected.package.name;

            const query = queries.find(q => q.package.name === pkgName || (ecosystem === 'Maven' && q.package.name.endsWith(':' + pkgName)));
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

            const fixedEvent = affected.ranges.find(r => r.type === 'SEMVER' || r.type === 'ECOSYSTEM')?.events.find(e => 'fixed' in e);
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
