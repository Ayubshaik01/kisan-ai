import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudOff,
  Copy,
  Cpu,
  FileImage,
  History,
  Home,
  Leaf,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sprout,
  Trash2,
  Upload,
  UserRound,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { answerLocally, crops, suggestedQuestions, type CropKey, type CropGuide } from "@/features/crop-care/data";
import { clearScans, compressPhoto, readPreference, readScans, savePreference, saveScan, type LocalScan } from "@/features/crop-care/storage";
import { registerCropCareAppShell } from "@/features/crop-care/pwa";

type Section = "home" | "diagnose" | "assistant" | "history" | "profile" | "guide" | "detail";
type Language = "English" | "తెలుగు" | "हिन्दी";
type Message = { role: "farmer" | "guide"; text: string };
type HistoryFilter = "All" | "Chilli" | "Rice" | "Healthy" | "Needs review";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fieldnote — Crop care, close at hand" },
      { name: "description", content: "A private, offline-ready crop care companion with photo records, local crop guides, and careful next steps for chilli and rice." },
      { property: "og:title", content: "Fieldnote — Crop care, close at hand" },
      { property: "og:description", content: "Crop notes and practical field guidance, kept on your device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CropCareApp,
});

const navItems: { id: Section; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "diagnose", label: "Check", icon: Search },
  { id: "assistant", label: "Ask", icon: MessageCircle },
  { id: "history", label: "History", icon: History },
  { id: "profile", label: "You", icon: UserRound },
];

const languageMap: Record<Language, string> = { English: "English", తెలుగు: "Telugu", हिन्दी: "Hindi" };

function CropCareApp() {
  const [section, setSection] = useState<Section>("home");
  const [crop, setCrop] = useState<CropKey>("chilli");
  const [scans, setScans] = useState<LocalScan[]>([]);
  const [selectedScan, setSelectedScan] = useState<LocalScan | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<{ crop: CropGuide; index: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [scanNote, setScanNote] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("All");
  const [guideFilter, setGuideFilter] = useState<"All" | CropKey | "Pest">("All");
  const [language, setLanguage] = useState<Language>("English");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatText, setChatText] = useState("");
  const [copied, setCopied] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [storageIssue, setStorageIssue] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setScans(readScans());
      const savedLanguage = readPreference("language");
      if (savedLanguage === "English" || savedLanguage === "తెలుగు" || savedLanguage === "हिन्दी") setLanguage(savedLanguage);
      const savedTheme = readPreference("theme");
      if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    } catch {
      setStorageIssue(true);
    }
    void registerCropCareAppShell();
  }, []);

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  useEffect(() => {
    const listen = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", listen);
    return () => window.removeEventListener("beforeinstallprompt", listen);
  }, []);

  const guides = useMemo(
    () => crops.flatMap((cropData) => cropData.conditions.map((condition, index) => ({ crop: cropData, condition, index })))
      .filter(({ crop: guideCrop, condition }) => {
        const matchesCrop = guideFilter === "All" || guideFilter === "Pest" ? guideFilter === "All" || condition.category === "Pest" : guideCrop.key === guideFilter;
        const query = searchText.trim().toLowerCase();
        return matchesCrop && (!query || `${guideCrop.name} ${condition.name} ${condition.signs}`.toLowerCase().includes(query));
      }),
    [guideFilter, searchText],
  );

  const filteredScans = useMemo(() => scans.filter((scan) => {
    const matchesFilter = historyFilter === "All" || historyFilter === "Needs review" || scan.crop === historyFilter.toLowerCase();
    const cropName = crops.find((item) => item.key === scan.crop)?.name ?? "";
    return matchesFilter && `${cropName} ${scan.note}`.toLowerCase().includes(searchText.toLowerCase());
  }), [historyFilter, scans, searchText]);

  const openSection = (next: Section) => {
    setSearchText("");
    setSelectedGuide(null);
    if (next === "diagnose") {
      setPhoto(null);
      setPhotoName("");
      setPhotoError("");
      setScanNote("");
    }
    setSection(next);
  };

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoError("");
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file to keep a crop photo.");
      return;
    }
    try {
      setPhoto(await compressPhoto(file));
      setPhotoName(file.name);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "This photo could not be opened.");
    }
  }

  function keepPhoto() {
    if (!photo) return;
    try {
      const newScan: LocalScan = {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
        crop,
        createdAt: new Date().toISOString(),
        image: photo,
        note: scanNote.trim(),
        severity: "Not assessed",
        status: "not-analyzed",
      };
      const updated = saveScan(newScan);
      setScans(updated);
      setSelectedScan(newScan);
      setPhoto(null);
      setSection("detail");
    } catch {
      setPhotoError("Device storage is full or unavailable. The photo was not saved.");
    }
  }

  function removeSavedPhoto() {
    try {
      clearScans();
      setScans([]);
      setSelectedScan(null);
      setStorageIssue(false);
    } catch {
      setStorageIssue(true);
    }
  }

  function changeLanguage(next: Language) {
    setLanguage(next);
    savePreference("language", next);
  }

  function changeTheme(next: "dark" | "light") {
    setTheme(next);
    savePreference("theme", next);
  }

  function sendMessage(text = chatText) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { role: "farmer", text: trimmed },
      { role: "guide", text: answerLocally(trimmed) },
    ]);
    setChatText("");
  }

  async function copyLastResponse() {
    const last = [...messages].reverse().find((message) => message.role === "guide");
    if (!last) return;
    try {
      await navigator.clipboard.writeText(last.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  const startAssistant = () => openSection("assistant");
  const currentTitle = section === "home" ? "Fieldnote" : section === "diagnose" ? "Crop check" : section === "assistant" ? "Ask Fieldnote" : section === "history" ? "Your field notes" : section === "profile" ? "Your settings" : section === "guide" ? "Crop guide" : "Photo note";

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-lockup" onClick={() => openSection("home")} aria-label="Fieldnote home">
          <span className="brand-mark"><Leaf size={19} strokeWidth={1.8} /></span>
          <span className="brand-name">fieldnote<span>.</span></span>
        </button>
        <div className="topbar-middle"><span className="offline-dot" /> On this device</div>
        <div className="topbar-actions">
          <label className="language-select" aria-label="Choose language">
            <span className="language-short">{language === "English" ? "EN" : language === "తెలుగు" ? "తె" : "हि"}</span>
            <select value={language} onChange={(event) => changeLanguage(event.target.value as Language)} aria-label="Language">
              {Object.keys(languageMap).map((item) => <option key={item} value={item}>{languageMap[item as Language]}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
          <Button variant="ghost" size="icon" className="avatar-button" aria-label="Open profile" onClick={() => openSection("profile")}><UserRound size={18} /></Button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <p className="sidebar-label">WORKSPACE</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <Button key={id} variant="ghost" className={`side-link ${section === id ? "active" : ""}`} onClick={() => openSection(id)}>
              <Icon size={17} strokeWidth={1.8} /><span>{label === "Check" ? "Crop check" : label === "Ask" ? "Ask Fieldnote" : label === "You" ? "Settings" : label}</span>
              {section === id && <span className="side-active-dot" />}
            </Button>
          ))}
          <div className="sidebar-spacer" />
          <div className="sidebar-footnote"><ShieldCheck size={15} /><span>Your photos stay on this device</span></div>
        </aside>

        <main className="main-content" key={section}>
          <div className="mobile-page-heading">
            {section !== "home" && <Button variant="ghost" size="icon" aria-label="Back to home" onClick={() => openSection("home")}><ArrowLeft size={19} /></Button>}
            <h1>{currentTitle}</h1>
          </div>
          {section === "home" && <HomeScreen scans={scans} onNavigate={openSection} onOpenScan={(scan) => { setSelectedScan(scan); setSection("detail"); }} onOpenGuide={(guide, index) => { setSelectedGuide({ crop: guide, index }); setSection("guide"); }} storageIssue={storageIssue} />}
          {section === "diagnose" && <DiagnoseScreen crop={crop} setCrop={setCrop} photo={photo} photoName={photoName} scanNote={scanNote} setScanNote={setScanNote} fileRef={fileRef} cameraRef={cameraRef} onPhoto={handlePhoto} error={photoError} onKeep={keepPhoto} onRetake={() => { setPhoto(null); setPhotoName(""); setPhotoError(""); }} />}
          {section === "assistant" && <AssistantScreen language={language} messages={messages} chatText={chatText} setChatText={setChatText} onSend={sendMessage} onCopy={copyLastResponse} copied={copied} endRef={chatEndRef} />}
          {section === "history" && <HistoryScreen scans={filteredScans} total={scans.length} query={searchText} setQuery={setSearchText} filter={historyFilter} setFilter={setHistoryFilter} onOpen={(scan) => { setSelectedScan(scan); setSection("detail"); }} onBrowseGuides={() => openSection("guide")} />}
          {section === "profile" && <ProfileScreen language={language} onLanguage={changeLanguage} theme={theme} onTheme={changeTheme} scanCount={scans.length} storageIssue={storageIssue} onClear={removeSavedPhoto} installPrompt={installPrompt} onInstall={installApp} />}
          {section === "guide" && <GuideScreen guides={guides} filter={guideFilter} setFilter={setGuideFilter} query={searchText} setQuery={setSearchText} selected={selectedGuide} onSelect={(guide, index) => setSelectedGuide({ crop: guide, index })} onAsk={startAssistant} />}
          {section === "detail" && selectedScan && <ScanDetail scan={selectedScan} onBack={() => openSection("history")} onAsk={startAssistant} />}
          {section === "detail" && !selectedScan && <EmptyPanel icon={<FileImage size={22} />} title="No photo note selected" action="Back to history" onAction={() => openSection("history")} />}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Main navigation">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`mobile-nav-item ${section === id || (id === "history" && section === "detail") || (id === "home" && section === "guide") ? "active" : ""}`} onClick={() => openSection(id)} aria-current={section === id ? "page" : undefined}>
            <span className="mobile-nav-icon"><Icon size={19} strokeWidth={1.9} /></span><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function HomeScreen({ scans, onNavigate, onOpenScan, onOpenGuide, storageIssue }: { scans: LocalScan[]; onNavigate: (section: Section) => void; onOpenScan: (scan: LocalScan) => void; onOpenGuide: (guide: CropGuide, index: number) => void; storageIssue: boolean }) {
  return (
    <div className="page home-page">
      <div className="welcome-row"><div><p className="eyebrow">A LITTLE CARE, EVERY DAY</p><h1>Good morning, Farmer.</h1><p className="welcome-subtitle">A clearer picture of what’s happening in your field.</p></div><div className="date-stamp"><span className="date-mark"><Sprout size={16} /></span><span>YOUR FIELD<br /><strong>IN GOOD HANDS</strong></span></div></div>
      <section className="hero-panel">
        <div className="hero-copy"><span className="hero-label"><span className="hero-label-dot" /> YOUR FIELD COMPANION</span><h2>Better field notes.<br />Healthier harvests.</h2><p>Keep crop photos, learn what to look for, and find a careful next step — even when you’re offline.</p><div className="hero-actions"><Button className="button-primary" onClick={() => onNavigate("diagnose")}><Search size={16} /> Start a crop check <ArrowRight size={15} /></Button><Button variant="ghost" className="button-subtle" onClick={() => onNavigate("assistant")}><MessageCircle size={16} /> Ask a question</Button></div><div className="hero-proof"><ShieldCheck size={15} /><span>Private by default</span><span className="proof-separator" /><WifiOff size={14} /><span>Works without internet</span></div></div>
        <div className="hero-image-wrap"><img src={crops[0]?.image} alt="Healthy chilli plants growing in a field" width={1536} height={1024} /><div className="image-caption"><span className="caption-icon"><Leaf size={13} /></span><span>Small observations make a difference</span></div></div>
      </section>

      <div className="home-section-grid">
        <div className="home-primary-column">
          <section className="section-block crop-section"><div className="section-heading"><div><p className="eyebrow">YOUR CROPS</p><h2>What’s growing?</h2></div><button className="text-action" onClick={() => onNavigate("guide")}>Explore guides <ArrowRight size={14} /></button></div>
            <div className="crop-grid">{crops.map((crop) => <button key={crop.key} className="crop-card" onClick={() => onOpenGuide(crop, 0)}><div className="crop-card-image"><img src={crop.image} alt={`${crop.name} crop`} loading="lazy" width={1536} height={1024} /><span className="crop-card-arrow"><ArrowUpRightIcon /></span></div><div className="crop-card-copy"><span className="crop-kicker">CROP NOTES</span><strong>{crop.name}</strong><span>{crop.key === "chilli" ? "Leaves · fruit · field checks" : "Leaves · stems · field checks"}</span></div></button>)}</div>
          </section>
          <section className="section-block recent-section"><div className="section-heading"><div><p className="eyebrow">YOUR RECENT NOTES</p><h2>From the field</h2></div>{scans.length > 0 && <button className="text-action" onClick={() => onNavigate("history")}>All notes <ArrowRight size={14} /></button>}</div>
            {scans.length ? <div className="recent-list">{scans.slice(0, 3).map((scan) => <ScanRow key={scan.id} scan={scan} onClick={() => onOpenScan(scan)} />)}</div> : <div className="recent-empty"><span className="empty-sprout"><Leaf size={18} /></span><span><strong>Your field notes start here</strong><small>Save a crop photo and a note to keep track of what you see.</small></span><Button variant="ghost" size="icon" aria-label="Start a crop check" onClick={() => onNavigate("diagnose")}><ArrowRight size={17} /></Button></div>}
          </section>
        </div>
        <aside className="home-side-column">
          <div className="offline-card"><div className="offline-card-top"><span className="offline-card-icon"><CloudOff size={16} /></span><span className="offline-pill"><span /> OFFLINE READY</span></div><h3>Field notes stay<br />close to home.</h3><p>Crop guides and saved photos live on this device. No account or connection needed.</p><div className="offline-card-rule" /><div className="privacy-row"><ShieldCheck size={15} /><span>Nothing leaves your device</span><Check size={14} /></div></div>
          <div className="model-note"><div className="model-note-icon"><Cpu size={16} /></div><div><strong>Photo check status</strong><span>No crop-detection model installed</span></div><span className="model-dot" /></div>
          {storageIssue && <div className="notice-inline"><CircleHelp size={15} /><span>Device storage couldn’t be read. Your crop guides still work.</span></div>}
        </aside>
      </div>
      <div className="home-footer-note"><span>FIELDNOTE</span><span>BUILT FOR THE MOMENTS BETWEEN THE ROWS</span><span>LOCAL · PRIVATE · PRACTICAL</span></div>
    </div>
  );
}

function ArrowUpRightIcon() { return <ArrowRight size={14} className="arrow-up-right" />; }

function DiagnoseScreen({ crop, setCrop, photo, photoName, scanNote, setScanNote, fileRef, cameraRef, onPhoto, error, onKeep, onRetake }: { crop: CropKey; setCrop: (crop: CropKey) => void; photo: string | null; photoName: string; scanNote: string; setScanNote: (note: string) => void; fileRef: React.RefObject<HTMLInputElement | null>; cameraRef: React.RefObject<HTMLInputElement | null>; onPhoto: (event: ChangeEvent<HTMLInputElement>) => void; error: string; onKeep: () => void; onRetake: () => void }) {
  const [showPrivacy, setShowPrivacy] = useState(false);
  return (
    <div className="page workflow-page">
      <div className="page-intro"><p className="eyebrow">A PRIVATE PHOTO NOTE</p><h2>Take a closer look.</h2><p>Save a crop photo and a note for your records. This preview does not identify disease or assess severity.</p></div>
      <div className="workflow-grid">
        <section className="capture-panel">
          <div className="capture-toolbar"><span className="capture-step"><span>01</span> CROP PHOTO</span><button className="text-action compact" onClick={() => setShowPrivacy((value) => !value)}><ShieldCheck size={14} /> Private on device</button></div>
          {showPrivacy && <div className="privacy-explainer">Your photo is reduced in size and saved only to this browser’s local storage. It is not uploaded.</div>}
          <div className={`capture-view ${photo ? "has-photo" : ""}`}>
            {photo ? <><img src={photo} alt="Selected crop photo for local note" /><div className="photo-reviewed"><Check size={14} /> Photo ready to save</div><div className="capture-frame"><span /><span /><span /><span /></div></> : <><span className="capture-background-mark"><Leaf size={54} strokeWidth={0.8} /></span><div className="capture-placeholder"><span className="capture-large-icon"><FileImage size={26} strokeWidth={1.4} /></span><strong>Bring a leaf into view</strong><span>Keep the leaf clear, in good natural light.</span><span className="capture-hint"><span /> FRAME THE AFFECTED AREA</span></div><div className="capture-frame"><span /><span /><span /><span /></div><span className="camera-watermark"><WifiOff size={12} /> CAMERA READY</span></>}
          </div>
          <div className="capture-controls"><Button variant="outline" className="camera-secondary" onClick={() => cameraRef.current?.click()}><span className="camera-control-icon"><FileImage size={16} /></span><span>Use camera</span></Button><Button className="button-primary gallery-button" onClick={() => fileRef.current?.click()}><Upload size={15} /> Choose photo</Button></div>
          <input ref={fileRef} className="visually-hidden" type="file" accept="image/*" onChange={onPhoto} aria-label="Choose a crop photo" />
          <input ref={cameraRef} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={onPhoto} aria-label="Take a crop photo" />
          {photoName && <p className="filename-note"><Check size={13} /> {photoName}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
        <section className="photo-form-panel"><div className="form-panel-heading"><span className="form-step-number">02</span><div><p className="eyebrow">ADD A LITTLE CONTEXT</p><h3>What are we looking at?</h3></div></div>
          <div className="field-group"><label>Crop</label><div className="crop-choice" role="group" aria-label="Choose crop">{crops.map((item) => <button key={item.key} className={crop === item.key ? "selected" : ""} onClick={() => setCrop(item.key)}><span className={`crop-choice-icon ${item.key}`}><Leaf size={15} /></span><span>{item.name}</span>{crop === item.key && <Check size={14} />}</button>)}</div></div>
          <div className="field-group"><label htmlFor="crop-note">Your observation <span>OPTIONAL</span></label><textarea id="crop-note" value={scanNote} onChange={(event) => setScanNote(event.target.value)} placeholder="Where did you notice it? What looks different?" maxLength={240} rows={4} /></div>
          <div className="safety-callout"><span className="safety-icon"><CircleHelp size={16} /></span><p><strong>A note, not a diagnosis.</strong> No disease model is installed. Don’t use a saved photo to make treatment decisions.</p></div>
          {photo ? <div className="save-actions"><Button variant="ghost" className="retake-button" onClick={onRetake}><X size={15} /> Discard photo</Button><Button className="button-primary" onClick={onKeep}><Check size={15} /> Save private note</Button></div> : <div className="save-placeholder"><Clock3 size={14} /><span>Your note stays on this device until you remove it.</span></div>}
        </section>
      </div>
      <div className="capture-instructions"><span className="instruction-title">A USEFUL PHOTO</span><span><i>01</i> Show one affected leaf clearly</span><span><i>02</i> Use even, natural light</span><span><i>03</i> Take photos from a few plants</span></div>
    </div>
  );
}

function AssistantScreen({ language, messages, chatText, setChatText, onSend, onCopy, copied, endRef }: { language: Language; messages: Message[]; chatText: string; setChatText: (text: string) => void; onSend: (text?: string) => void; onCopy: () => void; copied: boolean; endRef: React.RefObject<HTMLDivElement | null> }) {
  const displayQuestions = language === "తెలుగు" ? ["మిరప ఆకులు ఎందుకు పసుపు రంగులోకి మారుతున్నాయి?", "వరి తెగులును ఎలా గుర్తించాలి?", "పంటను పురుగుల నుంచి ఎలా కాపాడాలి?"] : language === "हिन्दी" ? ["मिर्च के पत्ते पीले क्यों हो रहे हैं?", "धान में ब्लास्ट कैसे पहचानें?", "फसल को कीटों से कैसे बचाएँ?"] : suggestedQuestions;
  const prompts = language === "తెలుగు" ? ["chilli yellow leaves", "rice blast", "crop pests"] : language === "हिन्दी" ? ["chilli yellow leaves", "rice blast", "crop pests"] : displayQuestions;
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSend(); };
  return (
    <div className="page assistant-page"><div className="assistant-layout"><div className="assistant-heading"><div className="assistant-emblem"><MessageCircle size={20} /><span /></div><div><p className="eyebrow">LOCAL CROP GUIDANCE</p><h2>A thoughtful field guide.</h2><p>Ask about common chilli and rice symptoms. Replies use short guidance stored on this device.</p></div><span className="assistant-offline"><span /> OFFLINE</span></div>
      <div className="conversation"><div className="conversation-date"><span /> STORED ON THIS DEVICE <span /></div>
        {messages.length === 0 ? <div className="assistant-welcome"><div className="welcome-symbol"><Sprout size={23} /></div><p className="eyebrow">WHAT HAVE YOU NOTICED?</p><h3>Start with what you see.</h3><p>Share a crop and a symptom. I can suggest what to check next, but I can’t identify disease in a photo.</p><div className="question-grid">{displayQuestions.map((question, index) => <button key={question} onClick={() => onSend(prompts[index] ?? question)}><span>{index === 0 ? <Leaf size={15} /> : index === 1 ? <Search size={15} /> : <ShieldCheck size={15} />}</span>{question}<ArrowRight size={14} /></button>)}</div></div> : <div className="messages-list">{messages.map((message, index) => <div key={`${index}-${message.role}`} className={`message-row ${message.role}`}><span className="message-avatar">{message.role === "farmer" ? <UserRound size={14} /> : <Leaf size={14} />}</span><div className="message-content"><span className="message-sender">{message.role === "farmer" ? "YOU" : "FIELDNOTE · LOCAL GUIDE"}</span><p>{message.text}</p></div>{message.role === "guide" && index === messages.length - 1 && <Button variant="ghost" size="icon" className="copy-response" onClick={onCopy} aria-label="Copy reply">{copied ? <Check size={15} /> : <Copy size={15} />}</Button>}</div>)}<div ref={endRef} /></div>}
      </div>
      <form className="chat-composer" onSubmit={handleSubmit}><Input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder={language === "తెలుగు" ? "మీ పంట గురించి అడగండి..." : language === "हिन्दी" ? "अपनी फसल के बारे में पूछें..." : "Ask about your crop…"} aria-label="Ask about your crop" maxLength={500} /><Button className="send-button" size="icon" type="submit" aria-label="Send question" disabled={!chatText.trim()}><Send size={17} /></Button></form><p className="assistant-disclaimer"><ShieldCheck size={13} /> Guidance is not a diagnosis. For treatment, confirm with a local agricultural expert.</p>
    </div></div>
  );
}

function HistoryScreen({ scans, total, query, setQuery, filter, setFilter, onOpen, onBrowseGuides }: { scans: LocalScan[]; total: number; query: string; setQuery: (query: string) => void; filter: HistoryFilter; setFilter: (filter: HistoryFilter) => void; onOpen: (scan: LocalScan) => void; onBrowseGuides: () => void }) {
  const filters: HistoryFilter[] = ["All", "Chilli", "Rice", "Healthy", "Needs review"];
  return (
    <div className="page history-page"><div className="page-intro split-intro"><div><p className="eyebrow">PRIVATE ON THIS DEVICE</p><h2>Patterns take time.</h2><p>Keep your crop photos and observations together as the season unfolds.</p></div><div className="history-total"><strong>{total.toString().padStart(2, "0")}</strong><span>FIELD NOTES</span></div></div>
      <div className="history-toolbar"><label className="search-field"><Search size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your notes" aria-label="Search notes" /><span className="search-key">⌘ K</span></label><div className="history-filters" role="group" aria-label="Filter notes">{filters.map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
      {scans.length ? <div className="history-list">{scans.map((scan) => <ScanRow key={scan.id} scan={scan} onClick={() => onOpen(scan)} detailed />)}</div> : <EmptyPanel icon={<History size={22} />} title={total ? "No notes match that search" : "Your season starts with one note"} text={total ? "Try another crop or search phrase." : "Keep a photo and field observation here. It stays on your device."} action={total ? "Clear search" : "Explore crop guides"} onAction={total ? () => { setQuery(""); setFilter("All"); } : onBrowseGuides} />}
      <div className="history-privacy"><ShieldCheck size={15} /><span>Photos and notes are stored in this browser only.</span><span>UP TO 30 NOTES</span></div>
    </div>
  );
}

function ScanRow({ scan, onClick, detailed = false }: { scan: LocalScan; onClick: () => void; detailed?: boolean }) {
  const crop = crops.find((item) => item.key === scan.crop);
  const labelDate = new Date(scan.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: detailed ? "numeric" : undefined });
  return <button className={`scan-row ${detailed ? "detailed" : ""}`} onClick={onClick}><span className="scan-thumbnail"><img src={scan.image} alt="" loading="lazy" />{scan.status === "not-analyzed" && <span><FileImage size={13} /></span>}</span><span className="scan-row-main"><span className="scan-crop-label">{crop?.name.toUpperCase()} · PHOTO NOTE</span><strong>{scan.note || "Crop photo saved"}</strong><small><Clock3 size={12} /> {labelDate}</small></span><span className="scan-status"><span /> NOT ANALYZED</span><ChevronRight size={16} className="scan-row-arrow" /></button>;
}

function ScanDetail({ scan, onBack, onAsk }: { scan: LocalScan; onBack: () => void; onAsk: () => void }) {
  const crop = crops.find((item) => item.key === scan.crop);
  return <div className="page detail-page"><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> FIELD NOTES</button><div className="detail-heading"><div><p className="eyebrow">{crop?.name.toUpperCase()} · PHOTO NOTE</p><h2>{scan.note || "Crop photo saved"}</h2><p>Saved {new Date(scan.createdAt).toLocaleString()}</p></div><span className="unassessed-pill"><span /> NOT ANALYZED</span></div><div className="detail-photo"><img src={scan.image} alt={`${crop?.name ?? "Crop"} photo saved as a private field note`} /><span><FileImage size={14} /> ORIGINAL PHOTO · STORED LOCALLY</span></div><div className="diagnosis-unavailable"><span className="diagnosis-icon"><Cpu size={19} /></span><div><span className="eyebrow">NO MODEL INSTALLED</span><h3>This photo hasn’t been analyzed.</h3><p>This version can save photos and show crop guidance, but it does not contain a disease-detection or severity model.</p></div></div><div className="detail-next-steps"><p className="eyebrow">A CAREFUL NEXT STEP</p><h3>Look at more than one leaf.</h3><p>Check a few nearby plants, note when the change first appeared, and compare what you see with the local crop guide. Get local expert advice before treating.</p><Button variant="outline" className="outline-action" onClick={onAsk}><MessageCircle size={15} /> Ask about what to check <ArrowRight size={14} /></Button></div><div className="detail-safety"><ShieldCheck size={16} /><span>No pesticide names, dosages, or treatments are generated from this photo.</span></div></div>;
}

function GuideScreen({ guides, filter, setFilter, query, setQuery, selected, onSelect, onAsk }: { guides: { crop: CropGuide; condition: CropGuide["conditions"][number]; index: number }[]; filter: "All" | CropKey | "Pest"; setFilter: (filter: "All" | CropKey | "Pest") => void; query: string; setQuery: (query: string) => void; selected: { crop: CropGuide; index: number } | null; onSelect: (crop: CropGuide, index: number) => void; onAsk: () => void }) {
  const selectedCondition = selected?.crop.conditions[selected.index];
  const topics = ["All", "chilli", "rice", "Pest"] as const;
  return <div className="page guide-page">{selected && selectedCondition ? <><button className="back-link" onClick={() => onSelect(selected.crop, selected.index)}><BookOpen size={15} /> CROP GUIDE</button><div className="guide-detail-banner"><img src={selected.crop.image} alt={`${selected.crop.name} crop`} /><div><span className="guide-category">{selected.crop.name.toUpperCase()} · {selectedCondition.category.toUpperCase()}</span><h2>{selectedCondition.name}</h2></div></div><div className="guide-detail-copy"><div><p className="eyebrow">WHAT YOU MAY NOTICE</p><p>{selectedCondition.signs}</p></div><div><p className="eyebrow">A FIRST FIELD CHECK</p><p>{selectedCondition.firstStep}</p></div><div className="guide-caution"><ShieldCheck size={16} /><p>A photo or symptom description cannot confirm a diagnosis. No chemical recommendations are provided here; follow verified local agricultural advice.</p></div><Button variant="outline" className="outline-action" onClick={onAsk}><MessageCircle size={15} /> Ask a follow-up question</Button></div></> : <><div className="page-intro"><p className="eyebrow">SAVED FOR THE FIELD</p><h2>Know what to look for.</h2><p>Plain-language checks for common chilli and rice concerns. This guide is for learning, not diagnosis.</p></div><div className="guide-toolbar"><label className="search-field"><Search size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search crop symptoms" aria-label="Search crop guide" /></label><div className="guide-filters">{topics.map((topic) => <button key={topic} className={filter === topic ? "selected" : ""} onClick={() => setFilter(topic)}>{topic === "All" ? "All" : topic === "Pest" ? "Pests" : topic.slice(0, 1).toUpperCase() + topic.slice(1)}</button>)}</div></div><div className="guide-list">{guides.map(({ crop, condition, index }) => <button className="guide-row" key={`${crop.key}-${condition.name}`} onClick={() => onSelect(crop, index)}><span className={`guide-row-icon ${condition.category.toLowerCase()}`}><Leaf size={17} /></span><span className="guide-row-main"><span>{crop.name.toUpperCase()} · {condition.category.toUpperCase()}</span><strong>{condition.name}</strong><small>{condition.signs}</small></span><ChevronRight size={16} /></button>)}</div>{guides.length === 0 && <EmptyPanel icon={<Search size={22} />} title="No guide found" text="Try another symptom or crop." action="Clear search" onAction={() => { setQuery(""); setFilter("All"); }} />}</>}</div>;
}

function ProfileScreen({ language, onLanguage, theme, onTheme, scanCount, storageIssue, onClear, installPrompt, onInstall }: { language: Language; onLanguage: (language: Language) => void; theme: "dark" | "light"; onTheme: (theme: "dark" | "light") => void; scanCount: number; storageIssue: boolean; onClear: () => void; installPrompt: BeforeInstallPromptEvent | null; onInstall: () => void }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  return <div className="page profile-page"><div className="page-intro"><p className="eyebrow">YOUR DEVICE, YOUR CHOICE</p><h2>A few things about you.</h2><p>Set up Fieldnote the way you like. Your preferences stay in this browser.</p></div><section className="settings-section"><div className="settings-section-title"><span className="settings-icon"><Settings2 size={17} /></span><div><h3>Appearance & language</h3><p>Choose how Fieldnote feels.</p></div></div><div className="setting-row"><div><strong>Language</strong><span>For local guidance and your entries</span></div><select aria-label="Choose app language" value={language} onChange={(event) => onLanguage(event.target.value as Language)}>{Object.keys(languageMap).map((item) => <option key={item} value={item}>{languageMap[item as Language]}</option>)}</select></div><div className="setting-row"><div><strong>Appearance</strong><span>Comfortable in any light</span></div><div className="segmented-choice" role="group" aria-label="Appearance">{(["dark", "light"] as const).map((choice) => <button key={choice} className={theme === choice ? "selected" : ""} onClick={() => onTheme(choice)}>{choice === "dark" ? "Dark" : "Light"}</button>)}</div></div></section>
    <section className="settings-section model-section"><div className="settings-section-title"><span className="settings-icon"><Cpu size={17} /></span><div><h3>On-device tools</h3><p>What is currently available on this device.</p></div></div><div className="model-status-row"><span className="model-status-icon"><Search size={16} /></span><div><strong>Crop photo identification</strong><span>No model installed</span></div><span className="status-text unavailable">UNAVAILABLE</span></div><div className="model-status-row"><span className="model-status-icon"><Leaf size={16} /></span><div><strong>Crop knowledge guide</strong><span>Chilli & rice field checks</span></div><span className="status-text available">ON DEVICE</span></div><div className="model-status-row"><span className="model-status-icon"><MessageCircle size={16} /></span><div><strong>Local guidance replies</strong><span>Common field questions</span></div><span className="status-text available">ON DEVICE</span></div><div className="model-footnote"><CircleHelp size={14} /> No model version or performance figures are shown because no diagnosis model is bundled.</div></section>
    <section className="settings-section"><div className="settings-section-title"><span className="settings-icon"><ShieldCheck size={17} /></span><div><h3>Privacy & storage</h3><p>Your photos stay in this browser.</p></div></div><div className="storage-summary"><div className="storage-illustration"><FileImage size={18} /></div><div><strong>{scanCount} {scanCount === 1 ? "photo note" : "photo notes"}</strong><span>{scanCount ? "Saved locally · up to 30 notes" : "No photos saved yet"}</span></div><span className="storage-status"><span /> LOCAL</span></div>{storageIssue && <p className="form-error storage-error">Local storage is unavailable. Existing notes may not be readable.</p>}{confirmClear ? <div className="confirm-clear"><span>Remove all {scanCount} locally saved photo notes?</span><Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>Keep notes</Button><Button variant="destructive" size="sm" onClick={() => { onClear(); setConfirmClear(false); }}>Remove</Button></div> : <button className="danger-text-action" disabled={scanCount === 0} onClick={() => setConfirmClear(true)}><Trash2 size={14} /> Clear saved photos and notes</button>}</section>
    <section className="settings-section app-info-section"><div className="settings-section-title"><span className="settings-icon"><Leaf size={17} /></span><div><h3>About Fieldnote</h3><p>Small observations. Better conversations.</p></div></div><div className="about-row"><span>Connection</span><strong><WifiOff size={13} /> No connection required</strong></div><div className="about-row"><span>Information</span><strong>General educational guidance</strong></div>{installPrompt && <Button variant="outline" className="install-button" onClick={onInstall}><ArrowDownLeft size={15} /> Add to your home screen</Button>}<button className="about-expand" onClick={() => setHelpOpen((value) => !value)}><span><CircleHelp size={15} /> Important note</span><ChevronDown size={15} className={helpOpen ? "rotate" : ""} /></button>{helpOpen && <p className="important-note">Fieldnote is a local-first prototype. It does not diagnose plant disease, estimate severity, or replace a local agricultural expert. Always use locally verified information for treatments and crop protection.</p>}</section>
    <div className="profile-footer"><span>FIELDNOTE · 01</span><span>MADE FOR EVERYDAY FIELD OBSERVATIONS</span></div>
  </div>;
}

function EmptyPanel({ icon, title, text, action, onAction }: { icon: React.ReactNode; title: string; text?: string; action: string; onAction: () => void }) {
  return <div className="empty-panel"><span className="empty-panel-icon">{icon}</span><h3>{title}</h3>{text && <p>{text}</p>}<Button variant="outline" className="outline-action" onClick={onAction}>{action}<ArrowRight size={14} /></Button></div>;
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };