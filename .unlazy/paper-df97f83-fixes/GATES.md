# Paper market audit remediation gates

OWNS: lib/db/schema.ts
OWNS: lib/db/repo.ts
OWNS: lib/db/repo-theses.ts
OWNS: lib/theses/paper.ts
OWNS: lib/theses/paper-pending.ts
OWNS: components/daybreak/theses/PaperTradingMode.tsx
OWNS: app/api/theses/paper/[id]/trade/route.ts
OWNS: drizzle/0021_paper_privacy_precision_identity.sql
OWNS: scripts/test-paper-behavior.cjs
OWNS: scripts/test-paper-database.cjs

- [x] G1: Durable creation recovery and precision validation are covered
  CHECK: node scripts/test-paper-behavior.cjs
  EXPECT: paper behavioral tests passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=7999b68db2cb2bbc534666e8de9dd1b21c574cb02d08721ef2906a2694d40ad1; exit=0; EXPECT=matched; output-sha256=0e3e328cb1c0ca7a3379ed0e84a9e7f54677ffa137a4a63f5ada79bd22245b90; output-bytes=30; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Privacy, stored identities, indexed pagination and positive ledger amounts work in PostgreSQL
  CHECK: node scripts/test-paper-database.cjs
  EXPECT: paper database integration passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=425efcffa91d3c2df82ad84b6b2efb9d45699cd81ab6621f15fd3b8cd4b0a6a8; exit=0; EXPECT=matched; output-sha256=e435b1740c6f33375c3dc1be4503dd819d951954b9a4c0a8df1702732aa17019; output-bytes=186; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: Product regression suite passes
  CHECK: npm test
  EXPECT: 43 acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=bf6f0ffcef8499b87f7e5b0c05369c63a1a14d85ca70e2b0a1c271c90758dc67; exit=0; EXPECT=matched; output-sha256=c588c6a6f9b142cfa12d6b528373ca5dbd5b5b6220e172421df8d938338f4005; output-bytes=2933; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: TypeScript is valid
  CHECK: npm run type-check
  EXPECT: type-check
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=56310e4c7eee2918b6ac48587632f6f1629af403dec25ea6b46034b2abe76ab1; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G5: Production build succeeds
  CHECK: npm run build
  EXPECT: Compiled successfully
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=17992646590e52096726758d5dc47d9ebe277a0e8a47d09114765944f5bfa97e; exit=0; EXPECT=matched; output-sha256=57032722381c6a16cc5b885237ecb9e5eda459bb1d26a8d0f8c33f274fa2f16c; output-bytes=8691; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
