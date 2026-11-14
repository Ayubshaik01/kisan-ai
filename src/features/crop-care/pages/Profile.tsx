import { Link } from "@tanstack/react-router";
import {
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  CloudRain,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Leaf,
  MapPin,
  Moon,
  Palette,
  Shield,
  Smartphone,
  Snowflake,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { langs, type Lang } from "../i18n";
import { crops, l, type CropKey } from "../knowledge";
import { regions } from "../regions";
import { storageUsage } from "../services/store";
import type { Season, ThemePref } from "../services/types";
import {
  btn,
  btnPrimary,
  btnSecondary,
  card,
  Confirm,
  enter,
  PageHeader,
  Section,
} from "../ui";

export function ProfilePage() {
  const { t, lang, settings, updateSettings, clearData } = useCropCare();

  const [name, setName] = useState(settings.name || "");
  const region = regions.find((r) => r.state === settings.state) ?? regions[0]!;
  const sizes = storageUsage();
  const totalStorageKb = Math.round(
    Object.values(sizes).reduce((a, b) => a + b, 0) / 1024,
  );

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ name: name.trim() });
    toast.success("Profile updated");
  };

  const toggleCrop = (key: CropKey) => {
    const next = settings.crops.includes(key)
      ? settings.crops.filter((c) => c !== key)
      : [...settings.crops, key];
    if (next.length === 0) {
      toast.error("Please keep at least one active crop");
      return;
    }
    updateSettings({ crops: next });
    toast.success("Crop preferences updated");
  };

  return (
    <div className={cn("space-y-8 pb-12 max-w-2xl mx-auto", enter)}>
      <PageHeader
        eyebrow="Preferences"
        title={t("navProfile")}
        sub="Manage your farm location, language, active crops and device storage."
      />

      {/* Farmer Profile Card */}
      <div className={cn(card, "p-6 space-y-4")}>
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            <User className="size-6" />
          </span>
          <div>
            <h3 className="font-bold text-base text-foreground">
              {settings.name?.trim() ? settings.name : "Farmer Profile"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {settings.district}, {settings.state} · {t(settings.season)} season
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveName} className="flex gap-2 pt-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("yourName")}
            className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            type="submit"
            className={cn(btnPrimary, "min-h-10 px-4 text-xs font-bold")}
          >
            {t("save")}
          </button>
        </form>
      </div>

      {/* Farm Location & Season */}
      <div className={cn(card, "p-6 space-y-5")}>
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <MapPin className="size-4 text-primary" /> Farm Location & Season
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              {t("state")}
            </label>
            <select
              value={settings.state}
              onChange={(e) => {
                const s = e.target.value;
                const match = regions.find((r) => r.state === s);
                updateSettings({
                  state: s,
                  district: match?.districts[0] || "",
                });
              }}
              className="w-full rounded-xl border border-line bg-surface p-2.5 text-sm text-foreground outline-none focus:border-primary"
            >
              {regions.map((r) => (
                <option key={r.state} value={r.state}>
                  {r.state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              {t("district")}
            </label>
            <select
              value={settings.district}
              onChange={(e) => updateSettings({ district: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface p-2.5 text-sm text-foreground outline-none focus:border-primary"
            >
              {region.districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Season Selection */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Current farming season
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["kharif", "rabi"] as Season[]).map((s) => {
              const Icon = s === "kharif" ? CloudRain : Snowflake;
              const active = settings.season === s;

              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateSettings({ season: s })}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-primary bg-primary/10 font-bold text-primary"
                      : "border-line bg-surface hover:border-primary/40 text-muted-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-foreground">
                      {t(s)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {s === "kharif" ? "Monsoon" : "Winter"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Crops Selection */}
      <div className={cn(card, "p-6 space-y-4")}>
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <Leaf className="size-4 text-primary" /> Active Crops
        </h3>
        <p className="text-xs text-muted-foreground">
          Choose the crops you cultivate to personalise alerts and checks.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {crops.map((c) => {
            const on = settings.crops.includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => toggleCrop(c.key)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-3.5 transition-all text-left",
                  on
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-line bg-surface opacity-70",
                )}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={c.closeup}
                    alt=""
                    className="size-10 rounded-lg object-cover"
                  />
                  <div>
                    <span className="block font-bold text-sm text-foreground">
                      {l(lang, c.name)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {t(c.key)}
                    </span>
                  </div>
                </div>

                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {on && <Check className="size-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Language Selection */}
      <div className={cn(card, "p-6 space-y-4")}>
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <Globe className="size-4 text-primary" /> Language / भाषा / భాష
        </h3>

        <div className="grid gap-2 sm:grid-cols-3">
          {langs.map((lItem) => {
            const active = settings.lang === lItem.code;
            return (
              <button
                key={lItem.code}
                type="button"
                onClick={() => updateSettings({ lang: lItem.code })}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-3 text-left transition-all",
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary font-bold text-primary"
                    : "border-line bg-surface hover:border-primary/40",
                )}
              >
                <div>
                  <span className="block text-sm font-semibold text-foreground">
                    {lItem.native}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {lItem.english}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  {lItem.short}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Appearance & Theme */}
      <div className={cn(card, "p-6 space-y-4")}>
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <Palette className="size-4 text-primary" /> Appearance
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["dark", "Dark", Moon],
              ["light", "Light", Sun],
              ["system", "System", Smartphone],
            ] as const
          ).map(([themeVal, label, Icon]) => {
            const active = settings.theme === themeVal;
            return (
              <button
                key={themeVal}
                type="button"
                onClick={() =>
                  updateSettings({ theme: themeVal as ThemePref })
                }
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all",
                  active
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-line bg-surface text-muted-foreground hover:border-primary/40",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Links */}
      <div className={cn(card, "divide-y divide-line overflow-hidden")}>
        <Link
          to="/profile/offline"
          className="flex items-center justify-between p-4 hover:bg-surface/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Cpu className="size-4" />
            </span>
            <div>
              <p className="font-bold text-sm text-foreground">
                Offline AI & Model Telemetry
              </p>
              <p className="text-xs text-muted-foreground">
                View status of on-device models and database
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-subtle" />
        </Link>

        <Link
          to="/help"
          className="flex items-center justify-between p-4 hover:bg-surface/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-surface text-muted-foreground">
              <CircleHelp className="size-4" />
            </span>
            <div>
              <p className="font-bold text-sm text-foreground">Help & FAQ</p>
              <p className="text-xs text-muted-foreground">
                Agricultural safety, image tips and how to use
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-subtle" />
        </Link>
      </div>

      {/* Storage & Privacy Controls */}
      <div className={cn(card, "p-6 space-y-4")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="size-4 text-muted-foreground" />
            <h3 className="font-bold text-sm text-foreground">
              Local Storage Usage
            </h3>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            ~{totalStorageKb} KB used
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          All scan photos, farmer notes, chat messages and reminders are kept
          locally in your browser sandbox. No farmer photos are transmitted to
          external cloud servers.
        </p>

        <div className="pt-2 flex flex-wrap gap-2">
          <Confirm
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-coral transition-colors"
              >
                <Trash2 className="size-3.5" /> Clear Scan History
              </button>
            }
            title="Clear all scans?"
            body="Deletes all photos and diagnoses stored on this device."
            confirmLabel="Delete scans"
            onConfirm={() => {
              clearData("history");
              toast.success("Scan history cleared");
            }}
          />

          <Confirm
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-coral transition-colors"
              >
                <Trash2 className="size-3.5" /> Reset All App Data
              </button>
            }
            title="Reset all application data?"
            body="Clears all scans, bookmarks, reminders and chat history from this device."
            confirmLabel="Reset all data"
            onConfirm={() => {
              clearData("all");
              toast.success("All local data reset");
            }}
          />
        </div>
      </div>
    </div>
  );
}
