import { Code, Package, Pyramids, Box, FileLock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type EcosystemInfo = {
  name: string;
  language: string;
  languageIcon: LucideIcon;
  ecosystemIcon: LucideIcon;
  file: string;
};

// A simple mapping from ecosystem to language and icons
// This could be expanded with more metadata
export const ecosystemInfo: Record<string, EcosystemInfo> = {
  npm: {
    name: 'npm',
    language: 'JavaScript',
    languageIcon: Code,
    ecosystemIcon: Package,
    file: 'package.json',
  },
  PyPI: {
    name: 'PyPI',
    language: 'Python',
    languageIcon: Code,
    ecosystemIcon: Pyramids,
    file: 'requirements.txt',
  },
  Go: {
    name: 'Go',
    language: 'Go',
    languageIcon: Code,
    ecosystemIcon: Box,
    file: 'go.mod',
  },
  Maven: {
    name: 'Maven',
    language: 'Java',
    languageIcon: Code,
    ecosystemIcon: FileLock,
    file: 'pom.xml',
  },
  Cargo: {
    name: 'Cargo',
    language: 'Rust',
    languageIcon: Code,
    ecosystemIcon: FileLock,
    file: 'Cargo.lock',
  },
};
