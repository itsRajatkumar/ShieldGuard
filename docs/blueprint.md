# **App Name**: ShieldGuard

## Core Features:

- Landing Page with Drag & Drop Uploader: Implement a landing page featuring a drag-and-drop file uploader for package.json files, styled with a glowing dashed-border dropzone on hover.
- Vulnerability Scanning API: Create a POST route (/api/scan) to parse the uploaded package.json, extract dependencies, and query the OSV.dev batch API for vulnerabilities.
- AI-Powered Security Report Generation: Integrate the Google Generative AI SDK to send vulnerability details to Gemini 1.5 Flash, generating explanations with risk assessment, attack vectors, and suggested upgrade versions; use Gemini as a tool to enrich the results of vulnerability findings.
- Dashboard with Health Score: Develop a clean dashboard view presenting a 'Health Score' (0-100%) and a list of vulnerable packages with color-coded badges (Red/Yellow for severity).
- Detailed Security Report Side-Panel: Implement a side-panel that displays an AI-generated security report for each package when clicked, providing detailed vulnerability insights.
- Loading State Indicator: Add a loading state indicator that shows 'AI is reasoning...' during the report generation phase.

## Style Guidelines:

- Primary color: Electric Blue (#7DF9FF) for highlights and interactive elements, providing a Security Neon feel.
- Background color: Deep charcoal (#0A0A0A) to create a dark-mode 'Security Neon' theme.
- Accent color: Luminous green (#39FF14), as an analog of electric blue on the color wheel, to draw focus on critical alerts or key actions.
- Body and headline font: 'Inter', a grotesque-style sans-serif for a modern look; well-suited to body text as well as headlines.
- Utilize Lucide-React icons for a consistent and modern visual language.
- Implement a shared layout with a sticky glassmorphism navbar for a modern look and improved navigation.
- Incorporate subtle animations and transitions for a polished user experience.