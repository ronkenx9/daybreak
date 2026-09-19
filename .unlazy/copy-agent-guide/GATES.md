# Gates: Copy agent guide from You tab

OWNS: components/daybreak/agents/AgentManager.tsx, app/daybreak.css

Scope: Give app visitors a visible way to copy the complete site-hosted agent llms.txt guide from the You tab, with clear success and failure feedback.

- [x] G1: The agent panel exposes a copy-text button and a direct guide link in signed-in and signed-out states; the button fetches `/agents/llms.txt`, copies its full contents, and reports success or failure.
  EVIDENCE: In the local optimized browser at /app/profile while signed out, the agent panel showed both controls; clicking Copy agent guide changed it to Guide copied and announced the full-text success state. The controls are outside the signedIn branch, so signed-in visitors receive the same actions. Source review confirms the current static guide is fetched on click, validated, passed to navigator.clipboard.writeText, and fetch or clipboard rejection renders the error state. The in-app browser's virtual clipboard cannot independently read page-written clipboard contents.

- [x] G2: Desktop and mobile layouts keep the new controls usable, including dark mode.
  EVIDENCE: Desktop browser screenshot showed the control row fitting beside the heading. At a 390px mobile viewport, DOM geometry measured the panel at 350px and the copy button at 306px within the viewport, with document scrollWidth equal to 390px. CSS review confirms a full-width mobile button and explicit dark-theme colors for the button, guide link, and success/error feedback.

- [x] G3: The change passes the existing TypeScript check.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The production build compiles with the new interaction.
  CHECK: npm run build
  EXPECT: Compiled successfully
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=17992646590e52096726758d5dc47d9ebe277a0e8a47d09114765944f5bfa97e; exit=0; EXPECT=matched; output-sha256=35a6813eec58b6d1073df39f49c63f6f96dbad8b66a15986693804ab5c07083d; output-bytes=10347; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
