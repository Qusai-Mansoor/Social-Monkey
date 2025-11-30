Design diagrams (Mermaid) for Social-Monkey

Files in this folder:

- class_diagram.mmd : Class diagram of core models
- activity_oauth.mmd : Activity diagram for OAuth flow
- activity_ingestion.mmd : Activity diagram for ingestion flow
- sequence_twitter_oauth.mmd : Sequence diagram for Twitter OAuth
- sequence_ingestion.mmd : System sequence for ingestion
- state_oauth_ingestion.mmd : State transition diagram for OAuth + ingestion
- dataflow_level0.mmd : Data Flow Diagram Level 0 (context)
- dataflow_level1.mmd : Data Flow Diagram Level 1 (processes)
- dataflow_level2.mmd : Data Flow Diagram Level 2 (detailed)

How to preview

- VSCode: install "Markdown Preview Mermaid Support" or use built-in Mermaid preview in some extensions.
- mermaid-cli: npx @mermaid-js/mermaid-cli - to render diagrams to PNG/SVG

Example command (PowerShell):

```powershell
# Install mermaid-cli once
npm install -g @mermaid-js/mermaid-cli
# Render a diagram
mmdc -i backend/docs/diagrams/class_diagram.mmd -o class_diagram.png
```
