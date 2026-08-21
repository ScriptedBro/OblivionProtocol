/**
 * STRK20 Hackathon Auto-Registration Script
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("Set GITHUB_TOKEN in your environment before running.");
  process.exit(1);
}
const UPSTREAM_OWNER = "starkience";
const UPSTREAM_REPO = "strk20-hackathon";
const MY_USERNAME = "ScriptedBro";
const REPO_URL = "https://github.com/ScriptedBro/OblivionProtocol";

async function main() {
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Oblivion-Registrar",
  };

  console.log("1. Checking upstream repository registry.json...");
  const contentRes = await fetch(
    `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/contents/registry.json`,
    { headers }
  );

  if (!contentRes.ok) {
    throw new Error(`Failed to fetch upstream registry.json: ${contentRes.statusText}`);
  }

  const contentData: any = await contentRes.json();
  const currentContent = JSON.parse(Buffer.from(contentData.content, "base64").toString("utf-8"));

  // Check if already registered
  const alreadyExists = currentContent.some((entry: any) => entry.repo_url === REPO_URL);
  if (alreadyExists) {
    console.log("OblivionProtocol is already present in registry.json!");
    return;
  }

  console.log("2. Forking upstream repository...");
  const forkRes = await fetch(`https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/forks`, {
    method: "POST",
    headers,
  });

  if (!forkRes.ok && forkRes.status !== 202) {
    console.log(`Fork status: ${forkRes.status} (might already exist)`);
  } else {
    console.log("Fork request created / confirmed.");
  }

  // Wait 4 seconds for GitHub to sync fork
  await new Promise((r) => setTimeout(r, 4000));

  console.log("3. Fetching fork's registry.json SHA...");
  const forkContentRes = await fetch(
    `https://api.github.com/repos/${MY_USERNAME}/${UPSTREAM_REPO}/contents/registry.json`,
    { headers }
  );

  if (!forkContentRes.ok) {
    throw new Error(`Failed to fetch fork registry.json: ${forkContentRes.statusText}`);
  }

  const forkContentData: any = await forkContentRes.json();
  const forkSha = forkContentData.sha;
  const forkList = JSON.parse(Buffer.from(forkContentData.content, "base64").toString("utf-8"));

  // Append new entry
  const newEntry = {
    repo_url: REPO_URL,
    telegram: ["ScriptedBro"],
  };
  forkList.push(newEntry);

  const updatedBase64 = Buffer.from(JSON.stringify(forkList, null, 2) + "\n").toString("base64");

  console.log("4. Updating registry.json on fork...");
  const updateRes = await fetch(
    `https://api.github.com/repos/${MY_USERNAME}/${UPSTREAM_REPO}/contents/registry.json`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: "Register Oblivion Protocol for STRK20 Private Sprint",
        content: updatedBase64,
        sha: forkSha,
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`Failed to update registry.json on fork: ${err}`);
  }
  console.log("Successfully committed updated registry.json to fork.");

  console.log("5. Opening Pull Request against starkience/strk20-hackathon...");
  const prBody = `### Oblivion Protocol — STRK20 Private Sprint Registration

**Project:** Oblivion Protocol
**Repository:** https://github.com/ScriptedBro/OblivionProtocol
**Telegram:** @ScriptedBro
**Category:** DeFi / Confidential AMM & CLMM

#### Overview:
Oblivion Protocol brings institutional-grade confidential liquidity and Zero-MEV execution to Starknet:
1. **Shielded Concentrated Liquidity (CLMM):** Custom Ekubo tick bounds ($[-1200, 850]$) with auto-compounding fee yields via atomic \`privacy_invoke\` returning \`Span<OpenNoteDeposit>\`.
2. **Dark CoW Batch Auctions:** Zero-MEV trade crossing settled at uniform clearing prices verified against Starknet Pragma Oracles.
3. **Confidential Yield Routing:** Dynamic allocation of idle vault reserves into Nostra money markets.
4. **Gasless Session Key Management:** Rate-limited session keys with daily spend volume caps.
5. **ATTEST Solvency & Compliance:** Zero-Knowledge fact-proof generation and verification ($\text{Assets} \\ge \\text{Liabilities}$) on-chain.
`;

  const prRes = await fetch(`https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/pulls`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "Register Oblivion Protocol (@ScriptedBro)",
      head: `${MY_USERNAME}:main`,
      base: "main",
      body: prBody,
    }),
  });

  if (!prRes.ok) {
    const prErr: any = await prRes.json();
    console.log(`PR creation response: ${JSON.stringify(prErr)}`);
  } else {
    const prData: any = await prRes.json();
    console.log(`\n Registration Pull Request Opened Successfully!`);
    console.log(`PR URL: ${prData.html_url}`);
  }
}

main().catch(console.error);
