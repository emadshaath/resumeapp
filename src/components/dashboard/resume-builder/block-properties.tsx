"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Trash2, ArrowLeftRight, User, MailX, PhoneOff, MapPinOff, LinkIcon } from "lucide-react";
import type { ResumeBlock, BlockStyle, BlockZone, Profile } from "@/types/database";

interface BlockPropertiesProps {
  block: ResumeBlock;
  /** Page template determines whether the sidebar zone is even available. */
  pageTemplateHasSidebar: boolean;
  /** Patch block fields locally + persist via PATCH /api/resume/blocks/[id]. */
  onPatch: (patch: Partial<ResumeBlock>) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
  /** Current profile, read by the Header block's properties panel to reflect
   *  the global show/hide flags and basic contact details. */
  profile: Profile;
  /** Patch profile fields + persist to supabase. Mirrors the profile-page
   *  save but surfaces the same toggles next to the live canvas. */
  onProfilePatch: (patch: Partial<Profile>) => Promise<void>;
}

/**
 * Right-rail editor for a single selected block. Surfaces the block's
 * applicable BlockStyle keys (title override, show dates, accent, zone) plus
 * a delete button. Keeps a local draft so the form stays responsive while a
 * PATCH is in flight; on every commit the parent re-fetches the canonical
 * block list so the canvas reflects the change.
 */
/**
 * Note: callers must pass `key={block.id}` so React remounts this component
 * (and thus resets local draft) when the user selects a different block.
 */
export function BlockProperties({
  block,
  pageTemplateHasSidebar,
  onPatch,
  onDelete,
  onClose,
  profile,
  onProfilePatch,
}: BlockPropertiesProps) {
  const [draft, setDraft] = useState<BlockStyle>(block.style || {});

  const supportsTitle = block.type !== "header" && block.type !== "divider" && block.type !== "spacer";
  const supportsShowDates = block.type === "experience" || block.type === "education" || block.type === "certifications";
  const supportsZone = block.type !== "header"; // header always lives in header zone
  const supportsHeight = block.type === "spacer";
  const supportsInlineText = block.type === "custom";

  async function commitDraft(next: BlockStyle) {
    setDraft(next);
    await onPatch({ style: next });
  }

  async function changeZone(zone: BlockZone) {
    await onPatch({ zone });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Back to style">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Block</div>
          <div className="text-sm font-semibold capitalize">{block.type}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 p-4">
        {block.type === "header" && (
          <HeaderFieldsPanel profile={profile} onPatch={onProfilePatch} />
        )}

        {supportsTitle && (
          <Field label="Section title" hint="Override the default heading shown above this block">
            <Input
              value={draft.title_override ?? ""}
              placeholder="Use the source section's title"
              onChange={(e) => setDraft({ ...draft, title_override: e.target.value })}
              onBlur={() => commitDraft(draft)}
            />
          </Field>
        )}

        {supportsShowDates && (
          <Field label="Show dates" hint="Hide dates if your timeline shouldn't show on this block">
            <ToggleRow
              checked={draft.show_dates !== false}
              onCheckedChange={(v) => commitDraft({ ...draft, show_dates: v })}
              labelOn="Dates visible"
              labelOff="Dates hidden"
            />
          </Field>
        )}

        {supportsHeight && (
          <Field label="Height (px)">
            <Input
              type="number"
              min={4}
              max={120}
              value={typeof draft.height === "number" ? draft.height : 12}
              onChange={(e) => setDraft({ ...draft, height: parseInt(e.target.value, 10) || 12 })}
              onBlur={() => commitDraft(draft)}
            />
          </Field>
        )}

        {supportsInlineText && (
          <Field label="Inline text" hint="Optional — for blocks that aren't backed by a section">
            <Input
              value={draft.text ?? ""}
              placeholder="Anything"
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              onBlur={() => commitDraft(draft)}
            />
          </Field>
        )}

        {supportsZone && (
          <Field
            label="Zone"
            hint={pageTemplateHasSidebar ? "Move between main and sidebar columns" : "Sidebar zone is only used by the Sidebar Left page template"}
          >
            <div className="grid grid-cols-2 gap-2">
              {(["main", "sidebar"] as const).map((z) => {
                const active = block.zone === z;
                const disabled = z === "sidebar" && !pageTemplateHasSidebar;
                return (
                  <button
                    key={z}
                    type="button"
                    disabled={disabled}
                    onClick={() => changeZone(z)}
                    className={`flex items-center justify-center gap-1.5 rounded-md border-2 px-3 py-2 text-xs font-medium transition-all ${
                      active
                        ? "border-brand bg-brand/5 text-brand"
                        : disabled
                        ? "border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-600"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                    }`}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    <span className="capitalize">{z}</span>
                  </button>
                );
              })}
            </div>
          </Field>
        )}
      </div>

      {block.type !== "header" && (
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Remove block
          </Button>
          <p className="mt-2 text-[10px] text-zinc-500">
            Removing the block doesn&apos;t delete the underlying section content.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {hint && <p className="text-[10px] text-zinc-500">{hint}</p>}
      {children}
    </div>
  );
}

function ToggleRow({
  checked,
  onCheckedChange,
  labelOn,
  labelOff,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-xs">{checked ? labelOn : labelOff}</span>
    </div>
  );
}

/**
 * Header block's dedicated properties surface. Mirrors the show/hide
 * switches on the Profile page but surfaces them right next to the live
 * canvas so users can toggle contact visibility without context-switching.
 *
 * Editing the values themselves (name, headline, email, phone, location,
 * website) happens inline on the canvas — those editables are the primary
 * surface, so the panel doesn't duplicate them.
 */
function HeaderFieldsPanel({
  profile,
  onPatch,
}: {
  profile: Profile;
  onPatch: (patch: Partial<Profile>) => Promise<void>;
}) {
  const items: Array<{
    key: "show_email" | "show_phone" | "show_location" | "show_website";
    label: string;
    icon: React.ElementType;
    value: string | null;
    missingHint: string;
  }> = [
    { key: "show_email",    label: "Email",    icon: MailX,      value: profile.email,           missingHint: "No email set" },
    { key: "show_phone",    label: "Phone",    icon: PhoneOff,   value: profile.phone_personal,  missingHint: "No phone set" },
    { key: "show_location", label: "Location", icon: MapPinOff,  value: profile.location,        missingHint: "No location set" },
    { key: "show_website",  label: "Website",  icon: LinkIcon,   value: profile.website_url,     missingHint: "No website set" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-zinc-500" />
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide">Profile header</h4>
          <p className="text-[10px] text-zinc-500">
            Edit the text directly on the canvas. Toggle each field below to show or hide it on the resume.
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map(({ key, label, icon: Icon, value, missingHint }) => {
          const visible = profile[key] !== false;
          const hasValue = typeof value === "string" && value.trim().length > 0;
          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <Icon className="h-3.5 w-3.5 text-zinc-500" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{label}</div>
                <div className="truncate text-[10px] text-zinc-500">
                  {hasValue ? value : missingHint}
                </div>
              </div>
              <Switch
                checked={visible}
                onCheckedChange={(v) => onPatch({ [key]: v })}
                aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()} on resume`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
