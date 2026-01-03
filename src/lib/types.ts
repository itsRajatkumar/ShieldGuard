export interface Vulnerability {
  id: string;
  summary: string;
  details: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
  pkg: {
    name: string;
    version: string;
  };
  affectedVersions: string[];
  fixedVersion?: string;
}
