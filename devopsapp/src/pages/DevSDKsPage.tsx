import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, Tabs, Tab,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const T = dashboardTokens.colors;
const S = dashboardSemanticColors;

const SDKS = [
  { lang: 'Python', version: '1.4.2', install: 'pip install orcacloud', docs: 'https://docs.orcacloud.com/sdk/python', color: '#153d75', badge: 'Stable' },
  { lang: 'Node.js', version: '1.3.0', install: 'npm install @orcacloud/sdk', docs: 'https://docs.orcacloud.com/sdk/nodejs', color: '#22C55E', badge: 'Stable' },
  { lang: 'Go', version: '1.2.1', install: 'go get github.com/orcacloud/sdk-go', docs: 'https://docs.orcacloud.com/sdk/go', color: '#60A5FA', badge: 'Stable' },
  { lang: 'Java', version: '1.1.0', install: 'implementation "com.orcacloud:sdk:1.1.0"', docs: 'https://docs.orcacloud.com/sdk/java', color: '#F59E0B', badge: 'Stable' },
  { lang: 'Rust', version: '0.9.0', install: 'cargo add orcacloud', docs: 'https://docs.orcacloud.com/sdk/rust', color: '#EF4444', badge: 'Beta' },
  { lang: '.NET / C#', version: '1.0.5', install: 'dotnet add package OrcaCloud.SDK', docs: 'https://docs.orcacloud.com/sdk/dotnet', color: '#8B5CF6', badge: 'Stable' },
];

const CLI_COMMANDS = [
  { cmd: 'orcacloud login', desc: 'Authenticate with OrcaCloud' },
  { cmd: 'orcacloud compute list', desc: 'List all VM instances' },
  { cmd: 'orcacloud compute create --name web-01 --type vcpu4.cpu --region us-east-1', desc: 'Create a new VM instance' },
  { cmd: 'orcacloud storage buckets list', desc: 'List all storage buckets' },
  { cmd: 'orcacloud k8s clusters', desc: 'List Kubernetes clusters' },
  { cmd: 'orcacloud iam users list', desc: 'List all IAM users' },
  { cmd: 'orcacloud billing usage --period 2026-02', desc: 'Get billing usage report' },
  { cmd: 'orcacloud monitor alerts', desc: 'View active alerts' },
];

const CODE_EXAMPLES: Record<string, string> = {
  Python: `from orcacloud import CloudClient

client = CloudClient(api_key="YOUR_API_KEY")

# List compute instances
instances = client.compute.instances.list(region="us-east-1")
for inst in instances:
    print(f"{inst.id}: {inst.name} ({inst.status})")

# Create a storage bucket
bucket = client.storage.buckets.create(
    name="my-data-bucket",
    region="us-east-1",
    encryption="aes256"
)`,
  'Node.js': `import { CloudClient } from '@orcacloud/sdk';

const client = new CloudClient({ apiKey: 'YOUR_API_KEY' });

// List compute instances
const instances = await client.compute.instances.list({ region: 'us-east-1' });
instances.forEach(i => console.log(\`\${i.id}: \${i.name} (\${i.status})\`));

// Upload to storage
await client.storage.buckets('my-bucket').upload({
  key: 'data/report.csv',
  body: fileStream,
});`,
  Go: `package main

import (
    "fmt"
    "github.com/orcacloud/sdk-go/cloud"
)

func main() {
    client := cloud.NewClient(cloud.Config{APIKey: "YOUR_API_KEY"})

    instances, _ := client.Compute.Instances.List(cloud.ListOptions{Region: "us-east-1"})
    for _, i := range instances {
        fmt.Printf("%s: %s (%s)\\n", i.ID, i.Name, i.Status)
    }
}`,
};

export default function DevSDKsPage() {
  const [tab, setTab] = useState(0);
  const [selectedLang, setSelectedLang] = useState('Python');

  const copyToClipboard = (text: string) => navigator.clipboard?.writeText(text);

  return (
    <Box sx={{ p: 3, bgcolor: T.background, minHeight: '100vh', fontFamily: dashboardTokens.typography.fontFamily }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: T.textPrimary, fontWeight: 700 }}>SDKs & Developer Tools</Typography>
        <Typography variant="body2" sx={{ color: T.textSecondary, mt: 0.3 }}>Client libraries, CLI, and code examples for all supported languages</Typography>
      </Box>

      <Paper sx={{ borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: `1px solid ${T.border}` }}>
          <Tab label="SDKs" />
          <Tab label="CLI" />
          <Tab label="Code Examples" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {SDKS.map(sdk => (
                <Grid item xs={12} sm={6} md={4} key={sdk.lang}>
                  <Paper sx={{ p: 2.5, bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="body1" sx={{ color: sdk.color, fontWeight: 700, fontSize: '1.05rem' }}>{sdk.lang}</Typography>
                      <Chip label={sdk.badge} size="small"
                        sx={{ bgcolor: sdk.badge === 'Beta' ? `${S.warning}22` : `${S.success}22`,
                          color: sdk.badge === 'Beta' ? S.warning : S.success, fontSize: '.65rem' }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: T.textSecondary, display: 'block', mb: 1 }}>v{sdk.version}</Typography>
                    <Box sx={{ bgcolor: T.background, border: `1px solid ${T.border}`, borderRadius: 1, p: 1, mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: T.textPrimary, fontFamily: 'monospace', fontSize: '.78rem' }}>{sdk.install}</Typography>
                      <ContentCopyIcon sx={{ fontSize: '.9rem', color: T.textSecondary, cursor: 'pointer' }} onClick={() => copyToClipboard(sdk.install)} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="outlined" startIcon={<DownloadIcon sx={{ fontSize: '.8rem !important' }} />}
                        sx={{ borderColor: T.border, color: T.textPrimary, fontSize: '.72rem', flex: 1 }}>Install</Button>
                      <Button size="small" endIcon={<OpenInNewIcon sx={{ fontSize: '.8rem !important' }} />}
                        sx={{ color: T.brandPrimary, fontSize: '.72rem', flex: 1 }}>Docs</Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            <Paper sx={{ bgcolor: T.background, border: `1px solid ${T.border}`, borderRadius: 2, p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ color: T.textSecondary }}>Install OrcaCloud CLI</Typography>
                <ContentCopyIcon sx={{ fontSize: '.9rem', color: T.textSecondary, cursor: 'pointer' }} />
              </Box>
              <Typography sx={{ fontFamily: 'monospace', color: S.success, fontSize: '.9rem' }}>
                curl -fsSL https://cli.orcacloud.com/install.sh | bash
              </Typography>
            </Paper>
            <Typography variant="subtitle2" sx={{ color: T.textSecondary, mb: 1.5, textTransform: 'uppercase', letterSpacing: '.06em', fontSize: '.72rem' }}>Common Commands</Typography>
            {CLI_COMMANDS.map((c, i) => (
              <Box key={i} sx={{ mb: 1.5 }}>
                <Box sx={{ bgcolor: T.background, border: `1px solid ${T.border}`, borderRadius: 1, p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                  <Typography sx={{ fontFamily: 'monospace', color: T.textPrimary, fontSize: '.82rem' }}>
                    <Box component="span" sx={{ color: S.success }}>$ </Box>{c.cmd}
                  </Typography>
                  <ContentCopyIcon sx={{ fontSize: '.85rem', color: T.textSecondary, cursor: 'pointer', flexShrink: 0 }} onClick={() => copyToClipboard(c.cmd)} />
                </Box>
                <Typography variant="caption" sx={{ color: T.textSecondary, pl: 0.5 }}>{c.desc}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {Object.keys(CODE_EXAMPLES).map(lang => (
                <Chip key={lang} label={lang} clickable onClick={() => setSelectedLang(lang)}
                  sx={{ bgcolor: selectedLang === lang ? T.brandPrimary : T.surfaceSubtle,
                    color: selectedLang === lang ? '#fff' : T.textSecondary }} />
              ))}
            </Box>
            <Paper sx={{ bgcolor: '#0F172A', border: `1px solid ${T.border}`, borderRadius: 2, p: 2, position: 'relative' }}>
              <ContentCopyIcon sx={{ position: 'absolute', top: 12, right: 12, fontSize: '1rem', color: '#64748B', cursor: 'pointer' }}
                onClick={() => copyToClipboard(CODE_EXAMPLES[selectedLang] || '')} />
              <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '.82rem', color: '#E2E8F0', whiteSpace: 'pre-wrap', m: 0 }}>
                {CODE_EXAMPLES[selectedLang]}
              </Typography>
            </Paper>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
