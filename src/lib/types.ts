export type Ecosystem = 'npm' | 'PyPI' | 'Go' | 'Maven' | 'Cargo' | (string & {});

export interface VulnerabilityItem {
  id: string;
  summary: string;
  details: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
  affectedVersions: string[];
  fixedVersion?: string;
}

export interface Vulnerability {
  pkg: {
    name: string;
    version: string;
  };
  vulns: VulnerabilityItem[];
  highestSeverity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
}
