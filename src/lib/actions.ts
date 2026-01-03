"use server";

import { generateHealthScoreExplanation, GenerateHealthScoreExplanationInput } from "@/ai/flows/generate-health-score-explanation";
import { explainVulnerability, ExplainVulnerabilityInput } from "@/ai/flows/explain-vulnerability-with-ai";

export async function getHealthScoreExplanation(input: GenerateHealthScoreExplanationInput) {
    return await generateHealthScoreExplanation(input);
}

export async function getVulnerabilityExplanation(input: ExplainVulnerabilityInput) {
    return await explainVulnerability(input);
}
