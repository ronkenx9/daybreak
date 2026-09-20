import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
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
import { MotionPressable } from "./src/components/MotionPressable";

type Tab = "home" | "markets" | "circles" | "conviction" | "you";
type Appearance = "light" | "dark" | "system";
const tabs: { id: Tab; label: string }[] = [
  { id: "home", label: "Today" },
  { id: "markets", label: "Markets" },
  { id: "circles", label: "Circles" },
  { id: "conviction", label: "Ideas" },
  { id: "you", label: "You" },
];
const number = (value: number | null | undefined) =>
  typeof value === "number" ? value.toLocaleString("en-US") : "—";
const money = (value: number | null | undefined) =>
  typeof value === "number"
    ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Price unavailable";
const priceSource = (value: EquityPrice | undefined) =>
  value?.source === "pyth"
    ? "Pyth equity reference"
    : value?.source === "chainlink-ref"
      ? "Chainlink equity reference"
      : "Equity reference unavailable";
function openWeb(path: string) {
  Linking.openURL(appLink(path)).catch(() =>
    Alert.alert("Could not open Daybreak", "Please try again."),
  );
}

function Main() {
  const systemScheme = useColorScheme();
  const [appearance, setAppearance] = useState<Appearance>("light");
  const dark = appearance === "dark" || (appearance === "system" && systemScheme === "dark");
  const c = {
    bg: dark ? "#141923" : "#FFFFFF",
    surface: dark ? "#141923" : "#FFFFFF",
    soft: dark ? "#202839" : "#F5F7FB",
    ink: dark ? "#F1F4FA" : "#202A40",
    muted: dark ? "#AEB8C9" : "#6D7789",
    line: dark ? "#303848" : "#E8ECF3",
    blue: dark ? "#AFC0FF" : p.blue,
  };
  const [tab, setTab] = useState<Tab>("home");
  const [mode, setMode] = useState<"all" | "paper" | "live">("all");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [companyRows, setCompanyRows] = useState<Company[]>([]);
  const [priceRows, setPriceRows] = useState<Record<string, EquityPrice>>({});
  const [circleRows, setCircleRows] = useState<Circle[]>([]);
  const [thesisRows, setThesisRows] = useState<Thesis[]>([]);
  const [statRows, setStatRows] = useState<Stats | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const reveal = useRef(new Animated.Value(1)).current;
  const refresh = () => setRevision((value) => value + 1);
  const nativeDriver = Platform.OS !== "web";

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    reveal.setValue(reduceMotion ? 1 : 0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: reduceMotion ? 0 : 210,
      useNativeDriver: nativeDriver,
    }).start();
  }, [tab, mode, reduceMotion, reveal, nativeDriver]);

  useEffect(() => {
    const controller = new AbortController();
    const active = (key: string, value: boolean) =>
      setLoading((old) => ({ ...old, [key]: value }));
    const failed = (key: string, value?: string) =>
      setErrors((old) => {
        const next = { ...old };
        if (value) next[key] = value;
        else delete next[key];
        return next;
      });
    const run = async (key: string, task: () => Promise<void>) => {
      active(key, true);
      failed(key);
      try {
        await task();
      } catch (error) {
        if (!controller.signal.aborted)
          failed(key, error instanceof Error ? error.message : "Could not load this feed.");
      } finally {
        if (!controller.signal.aborted) active(key, false);
      }
    };
    void run("markets", async () => {
      const items = await companies(controller.signal);
      if (controller.signal.aborted) return;
      setCompanyRows(items);
      try {
        const result = await prices(items.map((item) => item.ticker), controller.signal);
        if (!controller.signal.aborted) setPriceRows(result);
      } catch {
        if (!controller.signal.aborted) setPriceRows({});
      }
    });
    void run("circles", async () => {
      const result = await circles(controller.signal);
      if (!controller.signal.aborted) setCircleRows(result);
    });
    void run("stats", async () => {
      const result = await stats(controller.signal);
      if (!controller.signal.aborted) setStatRows(result);
    });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading((old) => ({ ...old, ideas: true }));
    setErrors((old) => {
      const next = { ...old };
      delete next.ideas;
      return next;
    });
    theses(mode, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setThesisRows(items);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setErrors((old) => ({ ...old, ideas: error instanceof Error ? error.message : "Could not load ideas." }));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading((old) => ({ ...old, ideas: false }));
      });
    return () => controller.abort();
  }, [mode, revision]);

  const text = (value: string, style?: object, lines?: number) => (
    <Text numberOfLines={lines} style={[{ color: c.ink }, style]}>{value}</Text>
  );
  const action = (label: string, onPress: () => void, secondary = false) => (
    <MotionPressable onPress={onPress} reduceMotion={reduceMotion} style={[
      s.action,
      { backgroundColor: secondary ? c.soft : p.blue },
    ]}>
      {text(label, { color: secondary ? c.blue : p.white, fontSize: 15, fontWeight: "700" })}
      {text("↗", { color: secondary ? c.blue : p.white, fontSize: 19 })}
    </MotionPressable>
  );
  const section = (title: string, detail?: string) => (
    <View style={s.section}>
      {text(title, s.sectionTitle)}
      {detail ? text(detail, { color: c.muted, fontSize: 12 }) : null}
    </View>
  );
  const feedback = (key: string) => loading[key]
    ? text("Loading Daybreak…", { color: c.muted, fontSize: 14, marginTop: 18 })
    : errors[key]
      ? <View style={[s.feedback, { backgroundColor: c.soft }]}>
          {text(errors[key], { color: c.muted, fontSize: 13 })}
          <MotionPressable onPress={refresh} reduceMotion={reduceMotion} style={{ paddingVertical: 10 }}>
            {text("Try again ↗", { color: c.blue, fontWeight: "700" })}
          </MotionPressable>
        </View>
      : null;
  const featured = companyRows.find((item) => item.ticker === "NVDA") ?? companyRows[0];
  const matches = companyRows.filter((item) =>
    `${item.name} ${item.ticker} ${item.baseSymbol} ${item.solanaSymbol ?? ""}`
      .toLowerCase().includes(query.trim().toLowerCase()),
  );
  const route = (next: Tab) => setTab(next);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "bottom"]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={c.bg} />
      <View style={[s.topbar, { borderColor: c.line }]}>
        <View style={s.brand}>
          <View style={s.mark}><View style={s.slash} /></View>
          {text("daybreak", { color: c.blue, fontSize: 22, fontWeight: "800", letterSpacing: -1.2 })}
        </View>
        <MotionPressable onPress={() => openWeb("/app")} reduceMotion={reduceMotion} accessibilityLabel="Open Daybreak web app" style={[s.topbarLink, { backgroundColor: c.soft }]}>
          {text("Open app ↗", { color: c.blue, fontSize: 12, fontWeight: "700" })}
        </MotionPressable>
      </View>
      <ScrollView
        key={tab}
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={revision > 0 && Object.values(loading).some(Boolean)} onRefresh={refresh} tintColor={p.blue} />}
      >
        <Animated.View style={{ opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 12, 0] }) }] }}>
          {tab === "home" && <>
            <View style={s.intro}>
              {text("TODAY ON DAYBREAK", { ...s.overline, color: c.blue })}
              {text("What’s moving today?", s.title)}
              {text("One place for stocks, ideas and the people around them.", { ...s.subtitle, color: c.muted })}
            </View>
            {featured && <MotionPressable onPress={() => setCompany(featured)} reduceMotion={reduceMotion} accessibilityLabel={`Open ${featured.name} stock detail`} style={[s.featureCard, { backgroundColor: c.soft }]}>
              <View style={s.featureTop}>
                {text(featured.ticker, { color: c.blue, fontSize: 12, fontWeight: "800", letterSpacing: 0.8 })}
                {text("STOCK IN FOCUS", { ...s.overline, color: c.muted })}
                {text("↗", { color: c.blue, fontSize: 20, marginLeft: "auto" })}
              </View>
              {text(featured.name, { fontSize: 29, fontWeight: "700", letterSpacing: -0.8, marginTop: 22 })}
              {text(featured.ticker, { color: c.muted, fontSize: 14, marginTop: 3 })}
              <View style={[s.featureBottom, { borderColor: c.line }]}>
                <View>
                  {text(money(priceRows[featured.ticker]?.priceUsd), { fontSize: 25, fontWeight: "700", letterSpacing: -0.5 })}
                  {text(priceSource(priceRows[featured.ticker]) + (priceRows[featured.ticker]?.stale ? " · stale" : ""), { color: c.muted, fontSize: 11, marginTop: 4 })}
                </View>
                {text("View stock  →", { color: c.blue, fontSize: 13, fontWeight: "700" })}
              </View>
            </MotionPressable>}
            {feedback("markets")}
            {section("Make your next move")}
            <View style={s.path}>
              {[
                ["01", "Explore a stock", "See the equity reference and token options.", "markets"],
                ["02", "Read an idea", "Understand a thesis before you back it.", "conviction"],
                ["03", "Find its circle", "See what holders are talking about.", "circles"],
              ].map(([index, title, description, destination], i) => (
                <MotionPressable key={index} onPress={() => route(destination as Tab)} reduceMotion={reduceMotion} style={[s.pathRow, i > 0 && { borderTopWidth: 1, borderColor: c.line }]}>
                  {text(index, { color: c.blue, fontSize: 12, fontWeight: "800", width: 30 })}
                  <View style={{ flex: 1 }}>
                    {text(title, { fontSize: 15, fontWeight: "700" })}
                    {text(description, { color: c.muted, fontSize: 12, marginTop: 4, lineHeight: 17 })}
                  </View>
                  {text("›", { color: c.muted, fontSize: 24 })}
                </MotionPressable>
              ))}
            </View>
            {statRows?.configured && <>
              {section("The network", "Live Daybreak activity")}
              <MotionPressable onPress={() => openWeb("/app/stats")} reduceMotion={reduceMotion} style={[s.network, { backgroundColor: c.soft }]}>
                <View>{text(number(statRows.accounts), { fontSize: 24, fontWeight: "800" })}{text("members", { color: c.muted, fontSize: 12 })}</View>
                <View>{text(number(statRows.circles), { fontSize: 24, fontWeight: "800" })}{text("circles", { color: c.muted, fontSize: 12 })}</View>
                {text("↗", { color: c.blue, fontSize: 20 })}
              </MotionPressable>
            </>}
          </>}

          {tab === "markets" && <>
            <View style={s.intro}>
              {text("DISCOVER", { ...s.overline, color: c.blue })}
              {text("Markets", s.title)}
              {text("Start with a company. Choose how to explore it.", { ...s.subtitle, color: c.muted })}
            </View>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search a company or ticker" placeholderTextColor={c.muted} accessibilityLabel="Search a company or ticker" autoCapitalize="none" style={[s.search, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]} />
            {section("Stocks", `${matches.length} companies`)}
            <View style={s.list}>
              {matches.map((item, i) => <MotionPressable key={item.ticker} onPress={() => setCompany(item)} reduceMotion={reduceMotion} accessibilityLabel={`Open ${item.name}`} style={[s.marketRow, i > 0 && { borderTopWidth: 1, borderColor: c.line }]}>
                {text(item.ticker, { color: c.blue, fontSize: 12, fontWeight: "800", width: 49 })}
                <View style={{ flex: 1 }}>
                  {text(item.name, { fontSize: 15, fontWeight: "700" }, 1)}
                  {text(`${item.ticker} · ${item.solanaSymbol ? "Base + Solana" : "Base"}`, { color: c.muted, fontSize: 12, marginTop: 3 })}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {text(money(priceRows[item.ticker]?.priceUsd), { fontSize: 13, fontWeight: "700" })}
                  {text(priceRows[item.ticker]?.stale ? "Stale reference" : "Equity ref.", { color: c.muted, fontSize: 10, marginTop: 3 })}
                </View>
              </MotionPressable>)}
            </View>
            {feedback("markets")}
            {!loading.markets && !errors.markets && matches.length === 0 && text("No matching companies.", { color: c.muted, marginTop: 16 })}
          </>}

          {tab === "circles" && <>
            <View style={s.intro}>
              {text("COMMUNITY", { ...s.overline, color: c.blue })}
              {text("Circles", s.title)}
              {text("The conversation around the stocks you follow.", { ...s.subtitle, color: c.muted })}
            </View>
            {section("Explore circles", `${circleRows.length} public`)}
            {circleRows.map((item) => <MotionPressable key={item.slug} onPress={() => openWeb("/app/groups")} reduceMotion={reduceMotion} accessibilityLabel={`Open ${item.name}`} style={[s.circleCard, { borderColor: c.line }]}>
              <View style={s.circleTop}>
                {text(item.tickers[0]?.slice(0, 5) ?? "D", { color: c.blue, fontSize: 12, fontWeight: "800", width: 53 })}
                <View style={{ flex: 1 }}>{text(item.name, { fontSize: 17, fontWeight: "700" })}{text(item.tickers.join(" · "), { color: c.muted, fontSize: 12, marginTop: 4 })}</View>
                {text("↗", { color: c.blue, fontSize: 20 })}
              </View>
              {!!item.description && text(item.description, { color: c.muted, fontSize: 13, lineHeight: 19, marginTop: 18 }, 3)}
              <View style={[s.circleFoot, { borderColor: c.line }]}>
                {text(`${number(item.memberCount)} members`, { color: c.muted, fontSize: 12 })}
                {item.pinned && text("HAPPENING NOW", { color: p.green, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 })}
              </View>
            </MotionPressable>)}
            {feedback("circles")}
            {!loading.circles && !errors.circles && !circleRows.length && text("No public circles are available right now.", { color: c.muted, marginTop: 14 })}
            <View style={{ marginTop: 14 }}>{action("Open all circles", () => openWeb("/app/groups"), true)}</View>
          </>}

          {tab === "conviction" && <>
            <View style={s.intro}>
              {text("CONVICTION MARKETS", { ...s.overline, color: c.blue })}
              {text("Ideas worth testing.", s.title)}
              {text("Public theses paired with stock tokens. Read first, then decide.", { ...s.subtitle, color: c.muted })}
            </View>
            <View style={[s.segment, { backgroundColor: c.soft }]}>
              {(["all", "paper", "live"] as const).map((value) => <MotionPressable key={value} onPress={() => setMode(value)} reduceMotion={reduceMotion} selected={mode === value} fill style={[s.segmentItem, mode === value && { backgroundColor: c.surface, shadowColor: "#142754", shadowOpacity: 0.06, shadowRadius: 5 }]}>
                {text(value === "all" ? "All" : value === "paper" ? "Paper" : "Live", { color: mode === value ? c.ink : c.muted, fontSize: 13, fontWeight: mode === value ? "700" : "600" })}
              </MotionPressable>)}
            </View>
            {section("Latest ideas", `${thesisRows.length} shown`)}
            {thesisRows.map((item) => <MotionPressable key={item.id} onPress={() => setThesis(item)} reduceMotion={reduceMotion} accessibilityLabel={`Read ${item.title}`} style={[s.ideaCard, { borderColor: c.line }]}>
              <View style={s.ideaTop}>
                {text(item.tokenSymbol || item.companyId.toUpperCase(), { color: c.blue, fontSize: 12, fontWeight: "800" })}
                <View style={[s.modePill, { backgroundColor: item.mode === "paper" ? c.soft : "#E4F7EF" }]}>{text(item.mode === "paper" ? "PAPER" : "LIVE", { color: item.mode === "paper" ? c.blue : p.green, fontSize: 10, fontWeight: "800" })}</View>
              </View>
              {text(item.title, { fontSize: 19, fontWeight: "700", letterSpacing: -0.3, lineHeight: 25 }, 2)}
              {text(item.summary, { color: c.muted, fontSize: 13, lineHeight: 19, marginTop: 8 }, 2)}
              <View style={[s.ideaFoot, { borderColor: c.line }]}>
                {text(`${item.authorKind === "agent" ? "Agent" : "Member"} · ${item.authorName || "Daybreak"}`, { color: c.muted, fontSize: 11 }, 1)}
                {text(item.mode === "paper" ? `${number(item.paperTradeCount)} paper trades  ↗` : "View market  ↗", { color: c.blue, fontSize: 11, fontWeight: "700" })}
              </View>
            </MotionPressable>)}
            {feedback("ideas")}
            {!loading.ideas && !errors.ideas && !thesisRows.length && text("No public ideas in this view yet.", { color: c.muted, marginTop: 14 })}
            <View style={{ marginTop: 14 }}>{action("Explore conviction", () => openWeb("/app/conviction"), true)}</View>
          </>}

          {tab === "you" && <>
            <View style={s.intro}>
              {text("YOUR SPACE", { ...s.overline, color: c.blue })}
              {text("Your Daybreak.", s.title)}
              {text("Your profile, portfolio and saved companies, together.", { ...s.subtitle, color: c.muted })}
            </View>
            <View style={s.profile}>
              <View style={[s.avatar, { backgroundColor: c.soft }]}>{text("D", { color: c.blue, fontSize: 28, fontWeight: "800" })}</View>
              <View style={{ flex: 1 }}>
                {text("Make it yours", { fontSize: 21, fontWeight: "700" })}
                {text("Sign in to view your actual balance, holdings and saved companies.", { color: c.muted, fontSize: 13, lineHeight: 19, marginTop: 5 })}
              </View>
            </View>
            {action("Sign in to Daybreak", () => openWeb("/app/profile"))}
            {section("Your account")}
            <View style={s.list}>
              {[
                ["Holdings", "Verified positions across networks"],
                ["Saved companies", "The stocks you follow"],
                ["Wallet verification", "Access holder-only circles"],
              ].map(([label, detail], index) => <MotionPressable key={label} onPress={() => openWeb("/app/profile")} reduceMotion={reduceMotion} style={[s.accountRow, index > 0 && { borderTopWidth: 1, borderColor: c.line }]}>
                <View style={{ flex: 1 }}>{text(label, { fontWeight: "700", fontSize: 15 })}{text(detail, { color: c.muted, fontSize: 12, marginTop: 4 })}</View>
                {text("›", { color: c.muted, fontSize: 23 })}
              </MotionPressable>)}
            </View>
            {section("Appearance")}
            <View style={[s.segment, { backgroundColor: c.soft }]}>
              {(["light", "dark", "system"] as const).map((value) => <MotionPressable key={value} onPress={() => setAppearance(value)} reduceMotion={reduceMotion} selected={appearance === value} fill style={[s.segmentItem, appearance === value && { backgroundColor: c.surface }]}>
                {text(value.charAt(0).toUpperCase() + value.slice(1), { color: appearance === value ? c.ink : c.muted, fontSize: 13, fontWeight: appearance === value ? "700" : "600" })}
              </MotionPressable>)}
            </View>
            {text("Balances are shown only after sign-in and are never inferred from market activity.", { color: c.muted, fontSize: 11, lineHeight: 17, marginTop: 18 })}
          </>}
        </Animated.View>
      </ScrollView>
      <View style={[s.nav, { backgroundColor: c.surface, borderColor: c.line }]}>
        {tabs.map((item) => <MotionPressable key={item.id} onPress={() => route(item.id)} reduceMotion={reduceMotion} accessibilityRole="tab" selected={tab === item.id} style={s.navItem}>
          {text(item.label, { color: tab === item.id ? c.blue : c.muted, fontSize: 10, fontWeight: tab === item.id ? "800" : "600", marginTop: 3 })}
          <View style={[s.navDot, { backgroundColor: tab === item.id ? c.blue : "transparent" }]} />
        </MotionPressable>)}
      </View>

      <Modal visible={!!company} animationType={reduceMotion ? "fade" : "slide"} presentationStyle="pageSheet" onRequestClose={() => setCompany(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <ScrollView contentContainerStyle={s.sheet}>
            <MotionPressable onPress={() => setCompany(null)} reduceMotion={reduceMotion} style={s.sheetClose}>{text("Done", { color: c.blue, fontSize: 15, fontWeight: "700" })}</MotionPressable>
            {company && <>
              <View style={[s.logoLarge, { backgroundColor: c.soft }]}>{text(company.ticker.slice(0, 2), { color: c.blue, fontSize: 26, fontWeight: "800" })}</View>
              {text(company.name, { fontSize: 32, fontWeight: "800", letterSpacing: -1, marginTop: 20 })}
              {text(`${company.ticker} · Stock detail`, { color: c.muted, fontSize: 14, marginTop: 5 })}
              <View style={[s.priceBox, { backgroundColor: c.surface, borderColor: c.line }]}>
                {text("EQUITY REFERENCE", { ...s.overline, color: c.muted })}
                {text(money(priceRows[company.ticker]?.priceUsd), { fontSize: 32, fontWeight: "700", marginTop: 12 })}
                {text(`${priceSource(priceRows[company.ticker])}${priceRows[company.ticker]?.stale ? " · stale" : ""}. This is not a token quote.`, { color: c.muted, fontSize: 12, lineHeight: 18, marginTop: 10 })}
              </View>
              {section("Available instruments")}
              <View style={s.list}>
                <View style={s.instrumentRow}>{text("Base", { fontWeight: "700" })}{text(`${company.baseSymbol} · B20`, { color: c.muted, fontSize: 13 })}</View>
                {company.solanaSymbol && <View style={[s.instrumentRow, { borderTopWidth: 1, borderColor: c.line }]}>{text("Solana", { fontWeight: "700" })}{text(`${company.solanaSymbol} · xStocks`, { color: c.muted, fontSize: 13 })}</View>}
              </View>
              <View style={{ marginTop: 28 }}>{action("Explore on Daybreak", () => openWeb(stockLink(company.ticker)))}</View>
            </>}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal visible={!!thesis} animationType={reduceMotion ? "fade" : "slide"} presentationStyle="pageSheet" onRequestClose={() => setThesis(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <ScrollView contentContainerStyle={s.sheet}>
            <MotionPressable onPress={() => setThesis(null)} reduceMotion={reduceMotion} style={s.sheetClose}>{text("Done", { color: c.blue, fontSize: 15, fontWeight: "700" })}</MotionPressable>
            {thesis && <>
              {text(`${thesis.mode.toUpperCase()} MARKET · ${thesis.tokenSymbol}`, { ...s.overline, color: c.blue })}
              {text(thesis.title, { fontSize: 30, fontWeight: "700", letterSpacing: -0.8, lineHeight: 36, marginTop: 14 })}
              {text(`By ${thesis.authorName || (thesis.authorKind === "agent" ? "Daybreak agent" : "Daybreak member")}`, { color: c.muted, fontSize: 13, marginTop: 9 })}
              {section("The idea")}
              {text(thesis.body || thesis.summary, { color: c.ink, fontSize: 15, lineHeight: 23 })}
              {!!thesis.invalidation && <>{section("What would change it")}{text(thesis.invalidation, { color: c.muted, fontSize: 14, lineHeight: 21 })}</>}
              {!!thesis.horizon && text(`Time horizon: ${thesis.horizon}`, { color: c.muted, fontSize: 12, marginTop: 20 })}
              <View style={{ marginTop: 28 }}>{action(thesis.mode === "paper" ? "Practice on Daybreak" : "View live market", () => openWeb(thesisLink(thesis.slug, thesis.mode)))}</View>
              {text("Trades are reviewed and confirmed in Daybreak. Paper trades never move real assets.", { color: c.muted, fontSize: 11, lineHeight: 17, marginTop: 13 })}
            </>}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><Main /></SafeAreaProvider>;
}

const s = StyleSheet.create({
  topbar: { height: 62, borderBottomWidth: 1, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  mark: { width: 23, height: 23, borderRadius: 6, backgroundColor: p.blue, overflow: "hidden" },
  slash: { width: 30, height: 5, backgroundColor: p.white, position: "absolute", top: 11, left: -3, transform: [{ rotate: "-45deg" }] },
  topbarLink: { minHeight: 34, borderRadius: 17, paddingHorizontal: 12, justifyContent: "center" },
  content: { paddingHorizontal: 22, paddingBottom: 42 },
  intro: { paddingTop: 30, paddingBottom: 27 },
  overline: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  title: { fontSize: 34, lineHeight: 39, fontWeight: "800", letterSpacing: -1.2, marginTop: 12 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 8 },
  section: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 27, marginBottom: 14, gap: 12 },
  sectionTitle: { fontSize: 19, fontWeight: "700", letterSpacing: -0.4 },
  featureCard: { borderRadius: 20, padding: 20 },
  featureTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoLarge: { width: 66, height: 66, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  featureBottom: { borderTopWidth: 1, marginTop: 28, paddingTop: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  path: { paddingHorizontal: 1 },
  pathRow: { minHeight: 78, paddingVertical: 15, flexDirection: "row", alignItems: "center", gap: 8 },
  network: { minHeight: 88, borderRadius: 20, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  search: { height: 51, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 14 },
  list: { overflow: "hidden" },
  marketRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 0, paddingVertical: 11 },
  circleCard: { borderBottomWidth: 1, paddingVertical: 22, marginBottom: 0 },
  circleTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  circleFoot: { borderTopWidth: 1, paddingTop: 15, marginTop: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  segment: { borderRadius: 15, padding: 4, flexDirection: "row", gap: 4 },
  segmentItem: { flex: 1, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  ideaCard: { borderBottomWidth: 1, paddingVertical: 20, marginBottom: 0 },
  ideaTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modePill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  ideaFoot: { borderTopWidth: 1, marginTop: 17, paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  profile: { paddingVertical: 13, flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 17 },
  avatar: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center" },
  accountRow: { minHeight: 69, paddingHorizontal: 0, paddingVertical: 14, flexDirection: "row", alignItems: "center" },
  action: { minHeight: 54, borderRadius: 17, paddingHorizontal: 19, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  feedback: { borderRadius: 14, padding: 14, marginTop: 16 },
  nav: { borderTopWidth: 1, minHeight: 64, flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 5 },
  navItem: { width: 68, height: 58, alignItems: "center", justifyContent: "center" },
  navDot: { width: 15, height: 2, borderRadius: 1, marginTop: 6 },
  sheet: { paddingHorizontal: 24, paddingBottom: 60 },
  sheetClose: { alignSelf: "flex-end", paddingVertical: 20, minHeight: 54 },
  priceBox: { borderWidth: 1, borderRadius: 22, padding: 20, marginTop: 27 },
  instrumentRow: { minHeight: 59, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
