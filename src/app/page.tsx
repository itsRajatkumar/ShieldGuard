import { FileUploader } from '@/components/landing/FileUploader';
import { Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto max-w-3xl text-center py-20 sm:py-32">
      <div className="flex justify-center items-center gap-2 mb-4">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
          ShieldGuard
        </h1>
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <p className="mt-4 text-lg max-w-2xl mx-auto text-muted-foreground">
        Instantly scan your dependency files for vulnerabilities and get AI-powered security reports. Supports npm, PyPI, Go, Maven, and Cargo.
      </p>
      <div className="mt-12">
        <FileUploader />
      </div>
    </div>
  );
}
