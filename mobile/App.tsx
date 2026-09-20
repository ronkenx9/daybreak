import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  appLink,
  circles,
  companies,
  prices,
  stats,
  stockLink,
  theses,
  thesisLink,
  type Circle,
  type Company,
  type EquityPrice,
  type Stats,
  type Thesis,
} from "./src/api";
import { palette as p } from "./src/theme";

type Tab = "discover" | "circles" | "conviction" | "stats" | "you";
const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: "discover", icon: "◇", label: "Discover" },
  { id: "circles", icon: "◎", label: "Circles" },
  { id: "conviction", icon: "✳", label: "Conviction" },
  { id: "stats", icon: "▤", label: "Stats" },
  { id: "you", icon: "◯", label: "You" },
];
const titles: Record<Tab, [string, string]> = {
  discover: [
    "Your world. Your stocks.",
    "One company. More ways to explore onchain.",
  ],
  circles: [
    "Find your people.",
    "Stock communities, built around what you hold.",
  ],
  conviction: ["Back an idea.", "Public theses from people and agents."],
  stats: ["Daybreak in motion.", "The network, in real numbers."],
  you: ["Your Daybreak.", "Your profile, portfolio and saved companies."],
};
const count = (n: number | null | undefined) =>
  typeof n === "number" ? n.toLocaleString("en-US") : "—";
const money = (n: number | null | undefined) =>
  typeof n === "number"
    ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Unavailable";
function web(path: string) {
  Linking.openURL(appLink(path)).catch(() =>
    Alert.alert("Could not open Daybreak", "Please try again."),
  );
}

function Main() {
  const dark = useColorScheme() === "dark";
  const c = {
    bg: dark ? p.dark : p.canvas,
    card: dark ? p.darkCard : p.white,
    ink: dark ? p.white : p.ink,
    muted: dark ? p.darkMuted : p.muted,
    line: dark ? p.darkLine : p.line,
    accent: dark ? "#AFC0FF" : p.blue,
  };
  const [tab, setTab] = useState<Tab>("discover");
  const [mode, setMode] = useState<"all" | "paper" | "live">("all");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyRows, setCompanies] = useState<Company[]>([]);
  const [priceRows, setPrices] = useState<Record<string, EquityPrice>>({});
  const [circleRows, setCircles] = useState<Circle[]>([]);
  const [thesisRows, setTheses] = useState<Thesis[]>([]);
  const [statRows, setStats] = useState<Stats | null>(null);
  const [company, selectCompany] = useState<Company | null>(null);
  const [thesis, selectThesis] = useState<Thesis | null>(null);
  const reload = () => setRevision((n) => n + 1);

  useEffect(() => {
    if (tab === "you") {
      setBusy(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    setError(null);
    const run = async () => {
      if (tab === "discover") {
        const items = await companies(controller.signal);
        if (!controller.signal.aborted) setCompanies(items);
        try {
          const quotes = await prices(
            items.map((item) => item.ticker),
            controller.signal,
          );
          if (!controller.signal.aborted) setPrices(quotes);
        } catch {
          if (!controller.signal.aborted) setPrices({});
        }
      } else if (tab === "circles") {
        const items = await circles(controller.signal);
        if (!controller.signal.aborted) setCircles(items);
      } else if (tab === "conviction") {
        const items = await theses(mode, controller.signal);
        if (!controller.signal.aborted) setTheses(items);
      } else {
        const item = await stats(controller.signal);
        if (!controller.signal.aborted) setStats(item);
      }
    };
    run()
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Could not load Daybreak.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [tab, mode, revision]);

  const companyMatches = companyRows.filter((item) =>
    `${item.name} ${item.ticker} ${item.baseSymbol} ${item.solanaSymbol ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const T = ({
    children,
    style,
    numberOfLines,
  }: {
    children: React.ReactNode;
    style?: object;
    numberOfLines?: number;
  }) => (
    <Text numberOfLines={numberOfLines} style={[{ color: c.ink }, style]}>
      {children}
    </Text>
  );
  const Action = ({
    label,
    path,
    outline = false,
  }: {
    label: string;
    path: string;
    outline?: boolean;
  }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => web(path)}
      style={[
        s.action,
        {
          backgroundColor: outline ? c.card : p.blue,
          borderColor: outline ? c.line : p.blue,
        },
      ]}
    >
      <T style={{ color: outline ? c.accent : p.white, fontWeight: "800" }}>
        {label}
      </T>
      <T style={{ color: outline ? c.accent : p.white, fontSize: 19 }}>↗</T>
    </Pressable>
  );
  const heading = (title: string, detail?: string) => (
    <View style={s.sectionHead}>
      <T style={s.sectionTitle}>{title}</T>
      <T style={{ color: c.muted, fontSize: 12 }}>{detail}</T>
    </View>
  );
  const card = { backgroundColor: c.card, borderColor: c.line };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "bottom"]}
    >
      <StatusBar
        barStyle={dark ? "light-content" : "dark-content"}
        backgroundColor={c.bg}
      />
      <View style={[s.header, { borderColor: c.line }]}>
        <View style={s.brand}>
          <View style={s.mark}>
            <View style={s.slash} />
          </View>
          <T
            style={{
              color: c.accent,
              fontSize: 25,
              fontWeight: "800",
              letterSpacing: -1.6,
            }}
          >
            daybreak
          </T>
        </View>
        <Pressable
          onPress={() => web("/app")}
          accessibilityRole="button"
          style={s.headerButton}
        >
          <T style={{ color: c.accent, fontSize: 13, fontWeight: "700" }}>
            Open web ↗
          </T>
        </Pressable>
      </View>
      <ScrollView
        key={tab}
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          tab === "you" ? undefined : (
            <RefreshControl
              refreshing={busy && revision > 0}
              onRefresh={reload}
              tintColor={p.blue}
            />
          )
        }
      >
        <View style={s.intro}>
          <T style={[s.eyebrow, { color: c.accent }]}>
            DAYBREAK / {tab.toUpperCase()}
          </T>
          <T style={s.headline}>{titles[tab][0]}</T>
          <T style={[s.subtitle, { color: c.muted }]}>{titles[tab][1]}</T>
        </View>

        {tab !== "you" && (
          <View style={s.hero}>
            <T style={s.heroLabel}>
              {tab === "discover"
                ? "DISCOVER STOCK TOKENS"
                : tab === "circles"
                  ? "STOCK COMMUNITIES"
                  : tab === "conviction"
                    ? "CONVICTION MARKETS"
                    : "THE NETWORK"}
            </T>
            <T style={s.heroTitle}>
              {tab === "discover"
                ? "Start with the company."
                : tab === "circles"
                  ? "Follow the conversation."
                  : tab === "conviction"
                    ? "A thesis you can back."
                    : "People make the market."}
            </T>
            <T style={s.heroBody}>
              {tab === "discover"
                ? "Explore supported Base stocks and Solana xStocks side by side."
                : tab === "circles"
                  ? "Active public circles. Holder-only participation is verified in Daybreak."
                  : tab === "conviction"
                    ? "Ideas pair with a stock token. Paper practice and live markets are separate."
                    : "Live counts from Daybreak, updated as activity changes."}
            </T>
          </View>
        )}

        {tab === "discover" && (
          <>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search companies or tickers"
              placeholderTextColor={c.muted}
              accessibilityLabel="Search companies or tickers"
              autoCapitalize="none"
              style={[
                s.search,
                { backgroundColor: c.card, color: c.ink, borderColor: c.line },
              ]}
            />
            {heading("Stocks", `${companyMatches.length} companies`)}
            {companyMatches.map((item) => (
              <Pressable
                key={item.ticker}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.name}`}
                onPress={() => selectCompany(item)}
                style={[s.stockRow, { borderColor: c.line }]}
              >
                <View
                  style={[
                    s.stockLogo,
                    { backgroundColor: dark ? "#314578" : p.faint },
                  ]}
                >
                  <T style={{ color: c.accent, fontWeight: "900" }}>
                    {item.ticker.slice(0, 2)}
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T style={s.rowTitle}>{item.name}</T>
                  <T style={[s.rowDetail, { color: c.muted }]}>
                    {item.baseSymbol} on Base ·{" "}
                    {item.solanaSymbol ?? "No xStock"}
                  </T>
                </View>
                <View style={{ alignItems: "flex-end", maxWidth: 104 }}>
                  <T
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      textAlign: "right",
                    }}
                  >
                    {money(priceRows[item.ticker]?.priceUsd)}
                  </T>
                  <T
                    style={{
                      color: c.muted,
                      fontSize: 10,
                      textAlign: "right",
                      marginTop: 3,
                    }}
                  >
                    {priceRows[item.ticker]?.source === "pyth"
                      ? "Pyth equity ref."
                      : priceRows[item.ticker]?.source === "chainlink-ref"
                        ? "Chainlink equity ref."
                        : "Equity reference"}
                    {priceRows[item.ticker]?.stale ? " · stale" : ""}
                  </T>
                </View>
              </Pressable>
            ))}
            {!busy && !error && companyMatches.length === 0 && (
              <T style={[s.empty, { color: c.muted }]}>
                No matching companies.
              </T>
            )}
          </>
        )}

        {tab === "circles" && (
          <>
            {heading("Active circles", `${circleRows.length} public`)}
            {circleRows.map((item) => (
              <Pressable
                key={item.slug}
                accessibilityRole="button"
                accessibilityLabel={`Explore ${item.name}`}
                onPress={() => web("/app/groups")}
                style={[s.card, card]}
              >
                <View style={s.cardTop}>
                  <View style={[s.stockLogo, { backgroundColor: p.sky }]}>
                    <T style={{ color: p.blue, fontWeight: "900" }}>
                      {item.tickers[0]?.charAt(0) ?? "D"}
                    </T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={s.cardTitle}>{item.name}</T>
                    <T style={[s.rowDetail, { color: c.muted }]}>
                      {item.tickers.join(" · ")}
                    </T>
                  </View>
                  <T style={{ color: c.accent, fontSize: 20 }}>↗</T>
                </View>
                {!!item.description && (
                  <T style={[s.cardBody, { color: c.muted }]}>
                    {item.description}
                  </T>
                )}
                <View style={s.cardFoot}>
                  <T style={{ color: c.muted, fontSize: 12 }}>
                    {count(item.memberCount)} members
                  </T>
                  {item.pinned && (
                    <T
                      style={{
                        color: p.green,
                        fontSize: 10,
                        fontWeight: "800",
                      }}
                    >
                      HAPPENING NOW
                    </T>
                  )}
                </View>
              </Pressable>
            ))}
            {!busy && !error && !circleRows.length && (
              <T style={[s.empty, { color: c.muted }]}>
                No active public circles yet.
              </T>
            )}
          </>
        )}

        {tab === "conviction" && (
          <>
            <View style={s.filters}>
              {(["all", "paper", "live"] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mode === value }}
                  onPress={() => setMode(value)}
                  style={[
                    s.filter,
                    {
                      backgroundColor: mode === value ? p.blue : c.card,
                      borderColor: mode === value ? p.blue : c.line,
                    },
                  ]}
                >
                  <T
                    style={{
                      color: mode === value ? p.white : c.muted,
                      fontWeight: "700",
                      textTransform: "capitalize",
                    }}
                  >
                    {value}
                  </T>
                </Pressable>
              ))}
            </View>
            {heading("Latest theses", `${thesisRows.length} shown`)}
            {thesisRows.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Read ${item.title}`}
                onPress={() => selectThesis(item)}
                style={[s.card, card]}
              >
                <View style={s.cardTop}>
                  <T style={[s.eyebrow, { color: c.accent, flex: 1 }]}>
                    {item.tokenSymbol || item.companyId.toUpperCase()}
                  </T>
                  <T
                    style={{
                      color: item.mode === "live" ? p.green : c.accent,
                      fontSize: 10,
                      fontWeight: "900",
                    }}
                  >
                    {item.mode.toUpperCase()}
                  </T>
                </View>
                <T style={s.cardTitle}>{item.title}</T>
                <T style={[s.cardBody, { color: c.muted }]} numberOfLines={3}>
                  {item.summary}
                </T>
                <View
                  style={[
                    s.cardFoot,
                    { borderTopWidth: 1, borderColor: c.line, paddingTop: 13 },
                  ]}
                >
                  <T style={{ color: c.muted, fontSize: 12 }}>
                    {item.authorKind === "agent" ? "Agent" : "Person"} ·{" "}
                    {item.authorName || "Daybreak member"}
                  </T>
                  <T style={{ color: c.muted, fontSize: 12 }}>
                    {item.mode === "paper"
                      ? `${count(item.paperTradeCount)} paper trades`
                      : "View market"}
                  </T>
                </View>
              </Pressable>
            ))}
            {!busy && !error && !thesisRows.length && (
              <T style={[s.empty, { color: c.muted }]}>
                No public {mode === "all" ? "" : mode} theses right now.
              </T>
            )}
          </>
        )}

        {tab === "stats" && (
          <>
            {statRows?.configured && (
              <View style={s.grid}>
                {(
                  [
                    ["Members", statRows.accounts],
                    ["Circles", statRows.circles],
                    ["Circle members", statRows.members],
                    ["Shared discoveries", statRows.messages],
                    ["Token launches", statRows.launches],
                    ["Linked wallets", statRows.wallets],
                  ] as const
                ).map(([label, value]) => (
                  <View key={label} style={[s.statCell, card]}>
                    <T style={s.statValue}>{count(value)}</T>
                    <T style={{ color: c.muted, fontSize: 12, marginTop: 7 }}>
                      {label}
                    </T>
                  </View>
                ))}
              </View>
            )}
            {!busy && !error && statRows && !statRows.configured && (
              <T style={[s.empty, { color: c.muted }]}>
                Stats are temporarily unavailable.
              </T>
            )}
            <Action label="Explore full stats" path="/app/stats" outline />
          </>
        )}

        {tab === "you" && (
          <>
            <View style={[s.profile, card]}>
              <View style={[s.avatar, { backgroundColor: p.sky }]}>
                <T style={{ color: p.blue, fontSize: 31, fontWeight: "900" }}>
                  D
                </T>
              </View>
              <View style={{ flex: 1 }}>
                <T style={s.cardTitle}>Make it yours.</T>
                <T style={[s.cardBody, { color: c.muted, marginTop: 5 }]}>
                  Sign in to see your profile, real holdings and saved
                  companies.
                </T>
              </View>
            </View>
            <Action label="Sign in to Daybreak" path="/app/profile" />
            {heading("Your space")}
            {[
              ["Holdings", "Verified positions across supported networks"],
              ["Saved companies", "Your watchlist, ready when you return"],
              ["Wallet verification", "Unlock holder-only circles"],
            ].map(([label, detail]) => (
              <View key={label} style={[s.profileRow, { borderColor: c.line }]}>
                <T style={s.rowTitle}>{label}</T>
                <T style={[s.rowDetail, { color: c.muted }]}>{detail}</T>
              </View>
            ))}
            <T style={[s.note, { color: c.muted }]}>
              Balances are never inferred from public market activity.
            </T>
          </>
        )}

        {busy && (
          <T style={[s.empty, { color: c.muted }]}>
            Loading live Daybreak data…
          </T>
        )}
        {!!error && (
          <View
            style={[s.error, { backgroundColor: dark ? "#4B2638" : "#FFF0F1" }]}
          >
            <T style={{ color: dark ? "#FFD1D5" : p.red, fontSize: 13 }}>
              {error}
            </T>
            <Pressable onPress={reload} accessibilityRole="button">
              <T
                style={{
                  color: dark ? "#FFD1D5" : p.red,
                  fontWeight: "800",
                  marginTop: 10,
                }}
              >
                Try again ↗
              </T>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <View style={[s.tabs, { backgroundColor: c.card, borderColor: c.line }]}>
        {tabs.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setTab(item.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.id }}
            style={s.tab}
          >
            <T
              style={{
                color: tab === item.id ? c.accent : c.muted,
                fontSize: 21,
              }}
            >
              {item.icon}
            </T>
            <T
              style={{
                color: tab === item.id ? c.accent : c.muted,
                fontSize: 10,
                fontWeight: "700",
              }}
            >
              {item.label}
            </T>
          </Pressable>
        ))}
      </View>

      <Modal
        visible={!!company}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => selectCompany(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <ScrollView contentContainerStyle={s.modal}>
            <Pressable
              onPress={() => selectCompany(null)}
              accessibilityRole="button"
              style={s.close}
            >
              <T style={{ color: c.muted }}>Close ✕</T>
            </Pressable>
            {company && (
              <>
                <T style={[s.eyebrow, { color: c.accent }]}>STOCK DISCOVERY</T>
                <T style={s.modalTitle}>{company.name}</T>
                <T style={[s.subtitle, { color: c.muted }]}>
                  {company.ticker} · Supported instruments
                </T>
                <View style={[s.detailBox, card]}>
                  <T style={[s.eyebrow, { color: c.muted }]}>
                    EQUITY REFERENCE PRICE
                  </T>
                  <T style={s.statValue}>
                    {money(priceRows[company.ticker]?.priceUsd)}
                  </T>
                  <T style={[s.rowDetail, { color: c.muted }]}>
                    Source: {priceRows[company.ticker]?.source ?? "unavailable"}
                    {priceRows[company.ticker]?.stale ? " · stale" : ""}. This
                    is not a token quote.
                  </T>
                </View>
                <View style={[s.profileRow, { borderColor: c.line }]}>
                  <T style={s.rowTitle}>Base stock token</T>
                  <T style={[s.rowDetail, { color: c.muted }]}>
                    {company.baseSymbol} · B20
                  </T>
                </View>
                {company.solanaSymbol && (
                  <View style={[s.profileRow, { borderColor: c.line }]}>
                    <T style={s.rowTitle}>Solana stock token</T>
                    <T style={[s.rowDetail, { color: c.muted }]}>
                      {company.solanaSymbol} · xStocks
                    </T>
                  </View>
                )}
                <Action
                  label="Explore on Daybreak"
                  path={stockLink(company.ticker)}
                />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={!!thesis}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => selectThesis(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <ScrollView contentContainerStyle={s.modal}>
            <Pressable
              onPress={() => selectThesis(null)}
              accessibilityRole="button"
              style={s.close}
            >
              <T style={{ color: c.muted }}>Close ✕</T>
            </Pressable>
            {thesis && (
              <>
                <T style={[s.eyebrow, { color: c.accent }]}>
                  {thesis.mode.toUpperCase()} MARKET · {thesis.tokenSymbol}
                </T>
                <T style={s.modalTitle}>{thesis.title}</T>
                <T style={[s.subtitle, { color: c.muted }]}>
                  By{" "}
                  {thesis.authorName ||
                    (thesis.authorKind === "agent"
                      ? "Daybreak agent"
                      : "Daybreak member")}
                </T>
                <T style={s.modalSection}>The idea</T>
                <T style={[s.modalBody, { color: c.muted }]}>
                  {thesis.body || thesis.summary}
                </T>
                {!!thesis.invalidation && (
                  <>
                    <T style={s.modalSection}>What would change it</T>
                    <T style={[s.modalBody, { color: c.muted }]}>
                      {thesis.invalidation}
                    </T>
                  </>
                )}
                {!!thesis.horizon && (
                  <T style={[s.note, { color: c.muted }]}>
                    Time horizon: {thesis.horizon}
                  </T>
                )}
                <Action
                  label={
                    thesis.mode === "paper"
                      ? "Practice on Daybreak"
                      : "View live market"
                  }
                  path={thesisLink(thesis.slug, thesis.mode)}
                />
                <T style={[s.note, { color: c.muted }]}>
                  Any trade is reviewed and confirmed in Daybreak. Paper trades
                  do not move real assets.
                </T>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  header: {
    minHeight: 58,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  headerButton: { minHeight: 44, justifyContent: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  mark: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: p.blue,
    overflow: "hidden",
  },
  slash: {
    width: 36,
    height: 6,
    backgroundColor: p.white,
    position: "absolute",
    top: 13,
    left: 0,
    transform: [{ rotate: "-45deg" }],
  },
  content: { paddingHorizontal: 20, paddingBottom: 26 },
  intro: { paddingTop: 34, paddingBottom: 26 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.3 },
  headline: {
    fontSize: 37,
    lineHeight: 41,
    fontWeight: "800",
    letterSpacing: -1.5,
    marginTop: 12,
  },
  subtitle: { fontSize: 15, lineHeight: 23, marginTop: 10 },
  hero: {
    backgroundColor: p.blue,
    borderRadius: 27,
    padding: 23,
    minHeight: 170,
    justifyContent: "center",
    marginBottom: 22,
  },
  heroLabel: {
    color: "#C5D0FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  heroTitle: {
    color: p.white,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 12,
  },
  heroBody: { color: "#E4E8FF", fontSize: 14, lineHeight: 21, marginTop: 9 },
  search: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  stockRow: {
    minHeight: 81,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stockLogo: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "700" },
  rowDetail: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 21, padding: 18, marginBottom: 12 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  cardTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  cardBody: { fontSize: 14, lineHeight: 21, marginTop: 12 },
  cardFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 17,
    gap: 8,
  },
  filters: { flexDirection: "row", gap: 8 },
  filter: {
    minHeight: 42,
    paddingHorizontal: 17,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCell: {
    width: "48%",
    minHeight: 115,
    borderWidth: 1,
    borderRadius: 19,
    padding: 17,
    justifyContent: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginTop: 10,
  },
  profile: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  profileRow: { paddingVertical: 17, borderBottomWidth: 1 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 20 },
  action: {
    minHeight: 54,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 18,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tabs: {
    borderTopWidth: 1,
    flexDirection: "row",
    minHeight: 62,
    paddingHorizontal: 3,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  empty: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    paddingVertical: 24,
  },
  error: { padding: 17, borderRadius: 15, marginTop: 18 },
  modal: { padding: 24, paddingBottom: 70 },
  close: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center" },
  modalTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 40,
    marginTop: 12,
  },
  detailBox: { borderWidth: 1, borderRadius: 20, padding: 20, marginTop: 24 },
  modalSection: { fontSize: 17, fontWeight: "800", marginTop: 26 },
  modalBody: { fontSize: 15, lineHeight: 23, marginTop: 10 },
});
