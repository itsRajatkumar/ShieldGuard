"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type HealthScoreGaugeProps = {
  score: number;
};

export function HealthScoreGauge({ score }: HealthScoreGaugeProps) {
  const getScoreColor = (s: number) => {
    if (s > 80) return "text-accent"; // Luminous Green
    if (s > 50) return "text-primary"; // Electric Blue
    return "text-destructive"; // Red
  };

  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Health Score</CardTitle>
        <CardDescription>Based on detected vulnerabilities</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center p-6">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full" viewBox="0 0 120 120">
            <circle
              className="text-border"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
              r="52"
              cx="60"
              cy="60"
            />
            <circle
              className={`transition-all duration-1000 ease-out ${getScoreColor(score)}`}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="52"
              cx="60"
              cy="60"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold font-headline ${getScoreColor(score)}`}>
              {score}
            </span>
            <span className="text-sm text-muted-foreground">out of 100</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
