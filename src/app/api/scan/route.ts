import { NextResponse, type NextRequest } from 'next/server';
import type { Vulnerability } from '@/lib/types';

interface OsvQuery {
  version: string;
  package: {
    name: string;
    ecosystem: 'npm';
  };
}

interface OsvResponse {
  results: {
    vulns?: {
      id: string;
      summary: string;
      details: string;
      modified: string;
      published: string;
      affected: {
        package: {
          name: string;
          ecosystem: string;
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
    }[];
  }[];
}

export const maxDuration = 60;

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

    const res = await fetch('https://api.osv.dev/v1/querybatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('OSV API Error:', errorText);
      return NextResponse.json({ error: `OSV API failed with status ${res.status}: ${errorText}` }, { status: res.status });
    }

    const data: OsvResponse = await res.json();
    
    const vulnerabilities: Vulnerability[] = data.results.flatMap((result, index) => {
        if (!result.vulns) return [];
        const query = queries[index];
        return result.vulns.map(vuln => {
            const affectedPackage = vuln.affected && vuln.affected.length > 0 ? vuln.affected[0] : undefined;
            const fixedEvent = affectedPackage?.ranges.find(r => r.type === 'SEMVER')?.events.find(e => e.fixed);
            return {
                id: vuln.id,
                summary: vuln.summary,
                details: vuln.details,
                severity: vuln.database_specific?.severity || 'UNKNOWN',
                pkg: {
                    name: query.package.name,
                    version: query.version,
                },
                affectedVersions: affectedPackage?.versions || [],
                fixedVersion: fixedEvent?.fixed,
            }
        });
    });

    return NextResponse.json(vulnerabilities);
  } catch (error: any) {
    console.error('Scan API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
